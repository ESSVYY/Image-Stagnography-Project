import { getRandomBytes } from "./crypto";
import type { EncodingMode, PayloadEnvelope, PayloadMetadata, PlainPayload } from "./types";

const SIGNATURE = new TextEncoder().encode("PXLV");
const VERSION = 1;
const FLAG_COMPRESSED = 1 << 0;
const FLAG_FILE = 1 << 1;
const FLAG_TEXT = 1 << 2;
const FLAG_MODE_BALANCED = 1 << 3;
const FLAG_MODE_EXPERIMENTAL = 1 << 4;

function crc32(bytes: Uint8Array) {
  const table = crc32Table();
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let cachedTable: number[] | undefined;
function crc32Table() {
  if (cachedTable) {
    return cachedTable;
  }

  const table = new Array<number>(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  cachedTable = table;
  return table;
}

function writeHeader(buffer: ArrayBuffer, metadataLength: number, ciphertextLength: number, checksum: number, iterations: number, saltLength: number, ivLength: number, payloadType: number, flags: number) {
  const view = new DataView(buffer);
  let offset = 0;
  for (const byte of SIGNATURE) {
    view.setUint8(offset, byte);
    offset += 1;
  }
  view.setUint8(offset, VERSION);
  offset += 1;
  view.setUint8(offset, payloadType);
  offset += 1;
  view.setUint8(offset, flags);
  offset += 1;
  view.setUint8(offset, 0);
  offset += 1;
  view.setUint32(offset, iterations, false);
  offset += 4;
  view.setUint16(offset, saltLength, false);
  offset += 2;
  view.setUint16(offset, ivLength, false);
  offset += 2;
  view.setUint32(offset, metadataLength, false);
  offset += 4;
  view.setUint32(offset, ciphertextLength, false);
  offset += 4;
  view.setUint32(offset, checksum, false);
}

export function buildMetadata(payload: PlainPayload, compressed: boolean, encodingMode: EncodingMode): PayloadMetadata {
  return {
    kind: payload.kind,
    name: payload.name,
    mimeType: payload.mimeType,
    compressed,
    encodingMode,
    originalSize: payload.data.byteLength,
  };
}

export function serializeEnvelope(envelope: PayloadEnvelope) {
  const metadataBytes = new TextEncoder().encode(JSON.stringify(envelope.metadata));
  const totalLength = 28 + envelope.salt.byteLength + envelope.iv.byteLength + metadataBytes.byteLength + envelope.ciphertext.byteLength;
  const buffer = new ArrayBuffer(totalLength);
  const headerBytes = new Uint8Array(buffer, 0, 28);
  const metadataAndCiphertext = new Uint8Array(metadataBytes.byteLength + envelope.ciphertext.byteLength);
  metadataAndCiphertext.set(metadataBytes, 0);
  metadataAndCiphertext.set(envelope.ciphertext, metadataBytes.byteLength);
  const checksum = envelope.checksum || crc32(metadataAndCiphertext);

  writeHeader(
    headerBytes.buffer,
    metadataBytes.byteLength,
    envelope.ciphertext.byteLength,
    checksum,
    envelope.iterations,
    envelope.salt.byteLength,
    envelope.iv.byteLength,
    envelope.metadata.kind === "file" ? 2 : 1,
    (envelope.metadata.compressed ? FLAG_COMPRESSED : 0) |
      (envelope.metadata.kind === "file" ? FLAG_FILE : FLAG_TEXT) |
      (envelope.metadata.encodingMode === "balanced" ? FLAG_MODE_BALANCED : 0) |
      (envelope.metadata.encodingMode === "experimental" ? FLAG_MODE_EXPERIMENTAL : 0),
  );

  const cursor = 28;
  const view = new Uint8Array(buffer);
  view.set(envelope.salt, cursor);
  view.set(envelope.iv, cursor + envelope.salt.byteLength);
  view.set(metadataBytes, cursor + envelope.salt.byteLength + envelope.iv.byteLength);
  view.set(envelope.ciphertext, cursor + envelope.salt.byteLength + envelope.iv.byteLength + metadataBytes.byteLength);
  return new Uint8Array(buffer);
}

function readUint32(view: DataView, offset: number) {
  return view.getUint32(offset, false);
}

function readUint16(view: DataView, offset: number) {
  return view.getUint16(offset, false);
}

export function parseEnvelope(bytes: Uint8Array): PayloadEnvelope {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = new TextDecoder().decode(bytes.slice(0, 4));
  if (signature !== "PXLV") {
    throw new Error("Invalid PixelVault payload signature.");
  }

  const version = view.getUint8(4);
  if (version !== VERSION) {
    throw new Error(`Unsupported PixelVault version: ${version}`);
  }

  const payloadType = view.getUint8(5);
  const flags = view.getUint8(6);
  const iterations = readUint32(view, 8);
  const saltLength = readUint16(view, 12);
  const ivLength = readUint16(view, 14);
  const metadataLength = readUint32(view, 16);
  const ciphertextLength = readUint32(view, 20);
  const checksum = readUint32(view, 24);
  const cursor = 28;
  const salt = bytes.slice(cursor, cursor + saltLength);
  const iv = bytes.slice(cursor + saltLength, cursor + saltLength + ivLength);
  const metadataStart = cursor + saltLength + ivLength;
  const metadataBytes = bytes.slice(metadataStart, metadataStart + metadataLength);
  const ciphertext = bytes.slice(metadataStart + metadataLength, metadataStart + metadataLength + ciphertextLength);
  const metadata = JSON.parse(new TextDecoder().decode(metadataBytes)) as PayloadMetadata;

  if (payloadType === 2) {
    metadata.kind = "file";
  } else {
    metadata.kind = "text";
  }

  if (flags & FLAG_COMPRESSED) {
    metadata.compressed = true;
  }

  const recomputed = crc32(new Uint8Array([...metadataBytes, ...ciphertext]));
  if (checksum !== 0 && checksum !== recomputed) {
    throw new Error("Payload checksum mismatch.");
  }

  return {
    version,
    metadata,
    salt,
    iv,
    iterations,
    ciphertext,
    checksum,
  };
}

export function payloadBitLength(envelope: PayloadEnvelope) {
  return (4 + serializeEnvelope(envelope).byteLength) * 8;
}

export function addLengthPrefix(payloadBytes: Uint8Array) {
  const prefix = new Uint8Array(4);
  new DataView(prefix.buffer).setUint32(0, payloadBytes.byteLength, false);
  const output = new Uint8Array(4 + payloadBytes.byteLength);
  output.set(prefix, 0);
  output.set(payloadBytes, 4);
  return output;
}

export function removeLengthPrefix(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(0, false);
  return bytes.slice(4, 4 + length);
}

export function makeEnvelopeSalt() {
  return getRandomBytes(16);
}
