export type PayloadKind = "text" | "file";
export type EncodingMode = "standard" | "balanced" | "experimental";

export interface SharedDetectionResult {
  probability: number;
  confidence: number;
  category: "Low likelihood" | "Moderate likelihood" | "High likelihood";
}
