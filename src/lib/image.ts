const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif');
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const jpegName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], jpegName || 'photo.jpg', { type: 'image/jpeg' });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // fall through to <img> fallback
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    queueMicrotask(() => URL.revokeObjectURL(url));
  }
}

export async function compressImage(file: File): Promise<string> {
  const working = isHeic(file) ? await convertHeicToJpeg(file) : file;
  const source = await loadBitmap(working);
  const srcWidth = source.width;
  const srcHeight = source.height;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcWidth, srcHeight));
  const width = Math.round(srcWidth * scale);
  const height = Math.round(srcHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

  if ('close' in source && typeof source.close === 'function') {
    source.close();
  }

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
