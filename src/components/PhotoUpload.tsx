import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  image: string | null;
  onImageChange: (dataUrl: string) => void;
}

export function PhotoUpload({ image, onImageChange }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => onImageChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        "relative aspect-[4/3] sm:aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group",
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
          <p className="text-xs text-black/40">Drag & drop or tap to browse (JPEG, PNG)</p>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
