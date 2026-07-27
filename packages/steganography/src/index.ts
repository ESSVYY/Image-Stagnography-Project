import type { EncodingMode, PayloadKind } from "@pixelvault/shared-types";

export interface CapacitySummary {
  width: number;
  height: number;
  usableBits: number;
  usableBytes: number;
}

export function calculateCapacity(width: number, height: number, channels = 3): CapacitySummary {
  const usableBits = width * height * channels;
  return {
    width,
    height,
    usableBits,
    usableBytes: Math.floor(usableBits / 8),
  };
}

export function estimateUsage(payloadBytes: number, capacityBytes: number) {
  return capacityBytes === 0 ? 0 : (payloadBytes / capacityBytes) * 100;
}

export type { EncodingMode, PayloadKind };
