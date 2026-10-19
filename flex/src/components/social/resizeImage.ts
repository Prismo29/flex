// Client-side image downscaling so uploads stay small (and EXIF/location data is stripped).

export type ResizedImage = { blob: Blob; width: number; height: number; url: string };

export async function resizeImage(file: File, maxSide: number, square = false): Promise<ResizedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Pick an image file.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Couldn't read that image.");
  });

  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = sh = side;
  }
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const width = Math.round(sw * scale);
  const height = Math.round(sh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn't process that image.");
  return { blob, width, height, url: URL.createObjectURL(blob) };
}
