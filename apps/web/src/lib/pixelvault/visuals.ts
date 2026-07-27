import type { ImageFrame } from "./types";

export async function createDifferenceHeatmap(original: ImageFrame, encoded: ImageFrame) {
  const width = original.width;
  const height = original.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not build the difference map.");
  }

  const image = context.createImageData(width, height);
  const source = original.data.data;
  const target = encoded.data.data;
  for (let index = 0; index < source.length; index += 4) {
    const deltaR = Math.abs(source[index] - target[index]);
    const deltaG = Math.abs(source[index + 1] - target[index + 1]);
    const deltaB = Math.abs(source[index + 2] - target[index + 2]);
    const magnitude = Math.min(255, deltaR + deltaG + deltaB);
    image.data[index] = magnitude;
    image.data[index + 1] = Math.max(12, 255 - magnitude * 1.8);
    image.data[index + 2] = Math.max(10, 90 - magnitude * 0.3);
    image.data[index + 3] = 255;
  }

  context.putImageData(image, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Failed to render the difference map."));
        return;
      }
      resolve(result);
    }, "image/png");
  });

  return {
    blob,
    objectUrl: URL.createObjectURL(blob),
  };
}
