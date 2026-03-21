const MAX_DIMENSION = 2048;
const QUALITY = 0.8;

/**
 * Compresses an image file using canvas.
 * - Resizes to max 2048px on longest side
 * - Re-encodes as JPEG at 80% quality
 * - HEIC/WebP → JPEG conversion handled by browser canvas
 * - Returns original file if it's already small enough (<500KB)
 */
export async function compressImage(file: File): Promise<File> {
  // Skip compression for small files
  if (file.size < 500 * 1024) return file;

  // Skip non-image types that canvas can't handle
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate new dimensions
  let newWidth = width;
  let newHeight = height;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    newWidth = Math.round(width * ratio);
    newHeight = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });

  // Only use compressed version if it's actually smaller
  if (blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}
