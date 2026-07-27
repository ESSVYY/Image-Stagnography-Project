import { decryptBytes, encryptBytes } from "./crypto";
import { buildMetadata, parseEnvelope, serializeEnvelope } from "./payload";
import { fileToImageFrame, imageDataToPngBlob, makeObjectUrl } from "./image";
import type {
  CapacityInfo,
  DecodedPayload,
  EncodingMode,
  ImageComparisonMetrics,
  ImageFrame,
  PlainPayload,
} from "./types";
import { compareFrames } from "./metrics";

const CHANNEL_ORDER = [0, 1, 2];

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function calculateCapacity(frame: ImageFrame, mode: EncodingMode) {
  const usableChannels = mode === "experimental" ? 3 : mode === "balanced" ? 3 : 3;
  const usableBits = frame.width * frame.height * usableChannels;
  const usableBytes = Math.floor(usableBits / 8);
  const headerBytes = 28;
  return {
    width: frame.width,
    height: frame.height,
    usableChannels,
    usableBits,
    usableBytes,
    headerBytes,
    totalBytes: Math.max(0, usableBytes - headerBytes),
    usageBytes: 0,
    usagePercent: 0,
  } satisfies CapacityInfo;
}

function createBitIndexes(frame: ImageFrame, mode: EncodingMode, passwordSeed = 0) {
  const pixelCount = frame.width * frame.height;
  const indexes: number[] = [];

  if (mode === "experimental") {
    const shuffledPixels = Array.from({ length: pixelCount }, (_, index) => index);
    let seed = passwordSeed || 1;
    for (let index = shuffledPixels.length - 1; index > 0; index -= 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const swapIndex = seed % (index + 1);
      [shuffledPixels[index], shuffledPixels[swapIndex]] = [shuffledPixels[swapIndex], shuffledPixels[index]];
    }
    for (const pixel of shuffledPixels) {
      for (const channel of CHANNEL_ORDER) {
        indexes.push(pixel * 4 + channel);
      }
    }
    return indexes;
  }

  if (mode === "balanced") {
    const channelScores = CHANNEL_ORDER.map((channel) => {
      let sum = 0;
      let sumSquares = 0;
      for (let index = channel; index < frame.data.data.length; index += 4) {
        const value = frame.data.data[index];
        sum += value;
        sumSquares += value * value;
      }
      const count = pixelCount || 1;
      const mean = sum / count;
      return { channel, score: sumSquares / count - mean * mean };
    });
    channelScores.sort((left, right) => right.score - left.score);
    const orderedChannels = channelScores.map((entry) => entry.channel);
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      for (const channel of orderedChannels) {
        indexes.push(pixel * 4 + channel);
      }
    }
    return indexes;
  }

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    for (const channel of CHANNEL_ORDER) {
      indexes.push(pixel * 4 + channel);
    }
  }
  return indexes;
}

function bytesToBits(bytes: Uint8Array) {
  const bits = new Uint8Array(bytes.byteLength * 8);
  let bitOffset = 0;
  for (const byte of bytes) {
    for (let bit = 7; bit >= 0; bit -= 1) {
      bits[bitOffset] = (byte >> bit) & 1;
      bitOffset += 1;
    }
  }
  return bits;
}

function bitsToBytes(bits: ArrayLike<number>, length: number) {
  const bytes = new Uint8Array(length);
  for (let byteIndex = 0; byteIndex < length; byteIndex += 1) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit += 1) {
      byte = (byte << 1) | (bits[byteIndex * 8 + bit] & 1);
    }
    bytes[byteIndex] = byte;
  }
  return bytes;
}

function selectBits(frame: ImageFrame, mode: EncodingMode, passwordSeed = 0) {
  const indexes = createBitIndexes(frame, mode, passwordSeed);
  return indexes.map((index) => ({ index, byteOffset: index, bitMask: 1 }));
}

function setBit(value: number, bit: number) {
  return (value & 0xfe) | (bit & 1);
}

function getBit(value: number) {
  return value & 1;
}

function utf8Encode(text: string) {
  return new TextEncoder().encode(text);
}

function utf8Decode(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

async function maybeCompress(bytes: Uint8Array) {
  if (typeof CompressionStream === "undefined") {
    return { bytes, compressed: false };
  }

  try {
    const compressedStream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new CompressionStream("gzip"));
    const compressed = new Uint8Array(await new Response(compressedStream).arrayBuffer());
    if (compressed.byteLength + 8 < bytes.byteLength) {
      return { bytes: compressed, compressed: true };
    }
  } catch {
    // Compression is optional; fall back to the original bytes.
  }

  return { bytes, compressed: false };
}

async function maybeDecompress(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    return bytes;
  }

  try {
    const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return bytes;
  }
}

export async function encodeIntoFrame(frame: ImageFrame, payload: PlainPayload, password: string, mode: EncodingMode) {
  const capacity = calculateCapacity(frame, mode);
  const prepared = await maybeCompress(payload.data);
  const metadata = buildMetadata(payload, prepared.compressed, mode);
  const encrypted = await encryptBytes(password, prepared.bytes);
  const envelopeBytes = serializeEnvelope({
    version: 1,
    metadata,
    salt: encrypted.salt,
    iv: encrypted.iv,
    iterations: encrypted.iterations,
    ciphertext: encrypted.ciphertext,
    checksum: 0,
  });
  const payloadBytes = new Uint8Array(4 + envelopeBytes.byteLength);
  new DataView(payloadBytes.buffer).setUint32(0, envelopeBytes.byteLength, false);
  payloadBytes.set(envelopeBytes, 4);

  const requiredBits = payloadBytes.byteLength * 8;
  if (requiredBits > capacity.usableBits) {
    throw new Error(
      `Payload is too large for this image. Available: ${capacity.totalBytes} bytes, required: ${payloadBytes.byteLength} bytes.`,
    );
  }

  const bitIndexes = selectBits(frame, mode, encrypted.salt[0] << 24);
  const bits = bytesToBits(payloadBytes);
  const encodedData = new Uint8ClampedArray(frame.data.data);
  for (let bitIndex = 0; bitIndex < bits.length; bitIndex += 1) {
    const targetIndex = bitIndexes[bitIndex].index;
    encodedData[targetIndex] = setBit(encodedData[targetIndex], bits[bitIndex]);
  }

  const encodedFrame: ImageFrame = {
    width: frame.width,
    height: frame.height,
    data: new ImageData(encodedData, frame.width, frame.height),
  };
  const encodedBlob = await imageDataToPngBlob(encodedFrame.data);
  const encodedObjectUrl = makeObjectUrl(encodedBlob);
  const decodedPreview = await extractFromFrame(encodedFrame, password, mode);
  const difference = compareFrames(frame, encodedFrame, envelopeBytes.byteLength, capacity.totalBytes);

  if (decodedPreview.kind !== payload.kind) {
    throw new Error("Encoded payload verification failed.");
  }

  return {
    encodedFrame,
    encodedBlob,
    encodedObjectUrl,
    capacity: {
      ...capacity,
      usageBytes: payloadBytes.byteLength,
      usagePercent: (payloadBytes.byteLength / capacity.totalBytes) * 100,
    },
    difference,
  };
}

export async function extractFromFrame(
  frame: ImageFrame,
  password: string,
  mode?: EncodingMode,
): Promise<DecodedPayload> {
  const modes: EncodingMode[] = mode ? [mode] : ["standard", "balanced", "experimental"];

  for (const candidateMode of modes) {
    try {
      const bitIndexes = selectBits(frame, candidateMode);
      const firstBytes = new Uint8Array(4);
      for (let bit = 0; bit < 32; bit += 1) {
        const targetIndex = bitIndexes[bit].index;
        const byteIndex = bit >> 3;
        firstBytes[byteIndex] = (firstBytes[byteIndex] << 1) | getBit(frame.data.data[targetIndex]);
      }
      const payloadLength = new DataView(firstBytes.buffer).getUint32(0, false);
      if (payloadLength <= 0 || payloadLength > frame.data.data.length / 8) {
        continue;
      }

      const payloadBits = new Uint8Array(payloadLength * 8);
      for (let bit = 0; bit < payloadBits.length; bit += 1) {
        const targetIndex = bitIndexes[bit + 32].index;
        payloadBits[bit] = getBit(frame.data.data[targetIndex]);
      }
      const payloadBytes = bitsToBytes(payloadBits, payloadLength);
      const envelope = parseEnvelope(payloadBytes);
      const plaintext = await decryptBytes(password, envelope.salt, envelope.iv, envelope.ciphertext, envelope.iterations);
      const bytes = envelope.metadata.compressed ? await maybeDecompress(plaintext) : plaintext;

      if (envelope.metadata.kind === "file") {
        const file = new File([toArrayBuffer(bytes)], envelope.metadata.name || "pixelvault-payload.bin", {
          type: envelope.metadata.mimeType || "application/octet-stream",
        });
        return {
          kind: "file",
          file,
          metadata: envelope.metadata,
        };
      }

      return {
        kind: "text",
        text: utf8Decode(bytes),
        metadata: envelope.metadata,
      };
    } catch {
      // Try the next mode or surface a generic error after all candidates fail.
    }
  }

  throw new Error("Unable to extract a valid PixelVault payload from this image.");
}

export async function frameFromFile(file: File) {
  return fileToImageFrame(file);
}

export { imageDataToPngBlob, makeObjectUrl };
