import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  image: string | null;
  onImageChange: (dataUrl: string) => void;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

async function decodeImage(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file, { imageOrientation: 'from-image' });
}

async function encodeJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number
): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await offscreen.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas encoding failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}

export function PhotoUpload({ image, onImageChange }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setIsProcessing(true);
    try {
      const bitmap = await decodeImage(file);
      const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
      const targetWidth = Math.round(bitmap.width * scale);
      const targetHeight = Math.round(bitmap.height * scale);
      const blob = await encodeJpeg(bitmap, targetWidth, targetHeight);
      bitmap.close?.();
      const dataUrl = await blobToDataUrl(blob);
      onImageChange(dataUrl);
    } catch (err) {
      console.error('Photo processing failed:', err);
      setError("We couldn't read that photo. Try taking it again, or pick a JPEG or PNG from your library.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "relative aspect-[4/3] sm:aspect-video rounded-2xl border-2 border-dashed transition-all overflow-hidden group",
          isProcessing ? "cursor-wait" : "cursor-pointer",
          image ? "border-livewire-orange/50" : "border-black/10 hover:border-livewire-orange/30"
        )}
      >
        {image ? (
          <>
            <img src={image} alt="Your home" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white font-medium flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4" /> Change Photo
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-livewire-orange/10 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-livewire-orange" />
            </div>
            <p className="font-semibold mb-1">Upload a Photo of Your Home</p>
            <p className="text-xs text-black/40">Tap to take a photo or upload one (JPEG, PNG, HEIC)</p>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-livewire-orange animate-spin" />
            <p className="text-xs font-semibold text-black/60">Processing photo…</p>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
          className="hidden"
          accept="image/*"
        />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
