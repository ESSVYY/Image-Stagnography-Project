import type { ImageFrame } from "./types";

const MAX_DIMENSION = 4096;

export async function fileToImageFrame(file: File): Promise<ImageFrame> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload a valid image file.");
  }

  const bitmap = await createImageBitmap(file);
  if (bitmap.width > MAX_DIMENSION || bitmap.height > MAX_DIMENSION) {
    throw new Error(`Images must be ${MAX_DIMENSION}px or smaller on each side.`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not acquire a canvas context.");
  }

  context.drawImage(bitmap, 0, 0);
  return {
    width: bitmap.width,
    height: bitmap.height,
    data: context.getImageData(0, 0, bitmap.width, bitmap.height),
  };
}

export function imageDataToPngBlob(imageData: ImageData) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not render the encoded image.");
  }

  context.putImageData(imageData, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to convert canvas to PNG."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

export function makeObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

export function revokeObjectUrl(url: string) {
  URL.revokeObjectURL(url);
}
