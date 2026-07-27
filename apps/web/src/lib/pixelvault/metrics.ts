import type { DetectionResult, ImageComparisonMetrics, ImageFrame } from "./types";

function histogramChannel(data: Uint8ClampedArray, channelIndex: number) {
  const histogram = new Array<number>(256).fill(0);
  for (let index = channelIndex; index < data.length; index += 4) {
    histogram[data[index]] += 1;
  }
  return histogram;
}

function normalizeHistogram(histogram: number[]) {
  const total = histogram.reduce((sum, value) => sum + value, 0) || 1;
  return histogram.map((value) => value / total);
}

function lsbDistribution(data: Uint8ClampedArray, channelIndex: number) {
  let zero = 0;
  let one = 0;
  for (let index = channelIndex; index < data.length; index += 4) {
    if ((data[index] & 1) === 0) {
      zero += 1;
    } else {
      one += 1;
    }
  }
  return [zero, one];
}

export function compareFrames(original: ImageFrame, encoded: ImageFrame, payloadUsedBytes = 0, payloadCapacityBytes = 0): ImageComparisonMetrics {
  const originalData = original.data.data;
  const encodedData = encoded.data.data;
  let mseSum = 0;
  let changed = 0;

  const pixelCount = originalData.length / 4;
  for (let index = 0; index < originalData.length; index += 1) {
    const delta = originalData[index] - encodedData[index];
    mseSum += delta * delta;
    if (originalData[index] !== encodedData[index] && index % 4 !== 3) {
      changed += 1;
    }
  }

  const mse = mseSum / originalData.length;
  const psnr = mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse);
  const changedPixelPercent = (changed / (pixelCount * 3)) * 100;

  let meanAbsDiff = 0;
  for (let index = 0; index < originalData.length - 4; index += 4) {
    meanAbsDiff += Math.abs(encodedData[index] - originalData[index + 4]);
    meanAbsDiff += Math.abs(encodedData[index + 1] - originalData[index + 5]);
    meanAbsDiff += Math.abs(encodedData[index + 2] - originalData[index + 6]);
  }
  meanAbsDiff /= Math.max(1, (pixelCount - 1) * 3);

  const histogramDelta = [0, 1, 2].map((channel) => {
    const originalHistogram = normalizeHistogram(histogramChannel(originalData, channel));
    const encodedHistogram = normalizeHistogram(histogramChannel(encodedData, channel));
    return originalHistogram.reduce((sum, value, index) => sum + Math.abs(value - encodedHistogram[index]), 0);
  });

  const lsbDelta = [0, 1, 2].flatMap((channel) => {
    const [originalZero, originalOne] = lsbDistribution(originalData, channel);
    const [encodedZero, encodedOne] = lsbDistribution(encodedData, channel);
    return [Math.abs(originalZero - encodedZero), Math.abs(originalOne - encodedOne)];
  });

  return {
    mse,
    psnr,
    changedPixelPercent,
    ssim: Math.max(0, 1 - mse / (255 * 255)),
    payloadCapacityBytes,
    payloadUsedBytes,
    usagePercent: payloadCapacityBytes === 0 ? 0 : (payloadUsedBytes / payloadCapacityBytes) * 100,
    histogramDelta,
    lsbDelta,
  };
}

export function detectStegoSignals(frame: ImageFrame): DetectionResult {
  const data = frame.data.data;
  const histogramDeltas = [0, 1, 2].map((channel) => {
    const histogram = histogramChannel(data, channel);
    const normalized = normalizeHistogram(histogram);
    const centerMass = normalized.slice(96, 160).reduce((sum, value) => sum + value, 0);
    return centerMass;
  });

  const lsbBalance = [0, 1, 2].map((channel) => {
    const [zero, one] = lsbDistribution(data, channel);
    const total = Math.max(1, zero + one);
    return Math.abs(zero - one) / total;
  });

  let neighborVariance = 0;
  for (let index = 0; index < data.length - 4; index += 4) {
    neighborVariance += Math.abs(data[index] - data[index + 4]);
    neighborVariance += Math.abs(data[index + 1] - data[index + 5]);
    neighborVariance += Math.abs(data[index + 2] - data[index + 6]);
  }
  neighborVariance /= Math.max(1, (data.length / 4 - 1) * 3);

  const entropy = [0, 1, 2].reduce((sum, channel) => {
    const histogram = normalizeHistogram(histogramChannel(data, channel));
    return (
      sum +
      histogram.reduce((channelSum, value) => {
        if (value === 0) {
          return channelSum;
        }
        return channelSum - value * Math.log2(value);
      }, 0)
    );
  }, 0);

  const rawScore =
    histogramDeltas.reduce((sum, value) => sum + value, 0) * 0.5 +
    lsbBalance.reduce((sum, value) => sum + value, 0) * 1.6 +
    Math.min(1.8, neighborVariance / 20) +
    Math.min(1.4, entropy / 8);
  const probability = Math.min(0.98, Math.max(0.02, 1 / (1 + Math.exp(2.1 - rawScore))));
  const confidence = Math.max(0.52, Math.min(0.97, 0.58 + Math.abs(probability - 0.5) * 0.85));
  const category = probability < 0.33 ? "Low likelihood" : probability < 0.67 ? "Moderate likelihood" : "High likelihood";

  return {
    probability,
    confidence,
    category,
    signals: [
      { label: "LSB balance drift", value: `${(lsbBalance.reduce((sum, value) => sum + value, 0) / 3).toFixed(3)}` },
      { label: "Neighbor variance", value: neighborVariance.toFixed(2) },
      { label: "Entropy", value: entropy.toFixed(2) },
      { label: "Channel mass shift", value: histogramDeltas.map((value) => value.toFixed(3)).join(" / ") },
    ],
    limitations: [
      "This is an estimate, not proof of steganography.",
      "Compression, resizing, and edits can change the score.",
      "Clean images with unusual texture can still score high.",
    ],
    statistics: [
      { label: "Width", value: String(frame.width) },
      { label: "Height", value: String(frame.height) },
      { label: "Pixels", value: String(frame.width * frame.height) },
      { label: "Channels analyzed", value: "RGB" },
    ],
  };
}
