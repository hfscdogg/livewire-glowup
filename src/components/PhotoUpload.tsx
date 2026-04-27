import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image';

interface PhotoUploadProps {
  image: string | null;
  onImageChange: (dataUrl: string) => void;
}

const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export function PhotoUpload({ image, onImageChange }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const name = file.name.toLowerCase();
    const isHeic = name.endsWith('.heic') || name.endsWith('.heif');
    const looksLikeImage = file.type.startsWith('image/') || isHeic;
    if (!looksLikeImage) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('That photo is larger than 25 MB. Try another one.');
      return;
    }
    setPreparing(true);
    try {
      const dataUrl = await compressImage(file);
      onImageChange(dataUrl);
    } catch (err) {
      console.error('Image preparation failed:', err);
      setError('We couldn\'t read that photo. Try a different one.');
    } finally {
      setPreparing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const openPicker = () => {
    if (preparing) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        aria-label={image ? 'Change photo' : 'Upload a photo of your home'}
        aria-busy={preparing}
        className={cn(
          'relative aspect-[4/3] sm:aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group touch-manipulation select-none',
          image ? 'border-livewire-orange/50' : 'border-black/10 hover:border-livewire-orange/30',
          preparing && 'pointer-events-none'
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
            <p className="text-xs text-black/40">Tap to choose from camera or gallery</p>
          </div>
        )}

        {preparing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <span className="flex items-center gap-2 text-sm font-medium text-livewire-grey">
              <Loader2 className="w-4 h-4 animate-spin text-livewire-orange" />
              Preparing photo...
            </span>
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
          accept="image/*,.heic,.heif"
        />
      </div>
      {error && (
        <p className="text-red-500 text-xs text-center px-2">{error}</p>
      )}
    </div>
  );
}
