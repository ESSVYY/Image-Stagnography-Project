export type PayloadKind = "text" | "file";

export type EncodingMode = "standard" | "balanced" | "experimental";

export interface PlainPayload {
  kind: PayloadKind;
  data: Uint8Array;
  name?: string;
  mimeType?: string;
}

export interface PayloadMetadata {
  kind: PayloadKind;
  name?: string;
  mimeType?: string;
  compressed: boolean;
  encodingMode: EncodingMode;
  originalSize: number;
}

export interface PayloadEnvelope {
  version: number;
  metadata: PayloadMetadata;
  salt: Uint8Array;
  iv: Uint8Array;
  iterations: number;
  ciphertext: Uint8Array;
  checksum: number;
}

export interface CapacityInfo {
  width: number;
  height: number;
  usableChannels: number;
  usableBits: number;
  usableBytes: number;
  headerBytes: number;
  totalBytes: number;
  usageBytes: number;
  usagePercent: number;
}

export interface ImageFrame {
  width: number;
  height: number;
  data: ImageData;
}

export interface EncodeResult {
  image: ImageFrame;
  encodedBlob: Blob;
  encodedObjectUrl: string;
  capacity: CapacityInfo;
  difference: ImageComparisonMetrics;
}

export interface DecodedPayload {
  kind: PayloadKind;
  text?: string;
  file?: File;
  metadata: PayloadMetadata;
}

export interface ImageComparisonMetrics {
  mse: number;
  psnr: number;
  changedPixelPercent: number;
  ssim: number;
  payloadCapacityBytes: number;
  payloadUsedBytes: number;
  usagePercent: number;
  histogramDelta: number[];
  lsbDelta: number[];
}

export interface DetectionResult {
  probability: number;
  confidence: number;
  category: "Low likelihood" | "Moderate likelihood" | "High likelihood";
  signals: Array<{ label: string; value: string }>;
  limitations: string[];
  statistics: Array<{ label: string; value: string }>;
}