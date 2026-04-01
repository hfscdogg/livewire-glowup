import { cn } from '@/lib/utils';
import { Sun, Zap, Sparkles } from 'lucide-react';

export type LightingStyle = 'warm' | 'dramatic' | 'elegant';

interface StylePickerProps {
  selected: LightingStyle;
  onChange: (style: LightingStyle) => void;
}

const styles: { id: LightingStyle; label: string; desc: string; icon: typeof Sun }[] = [
  { id: 'warm', label: 'Warm & Welcoming', desc: 'Soft amber tones, inviting glow', icon: Sun },
  { id: 'dramatic', label: 'Modern & Dramatic', desc: 'High contrast, bold shadows', icon: Zap },
  { id: 'elegant', label: 'Subtle & Elegant', desc: 'Gentle moonlight, refined accents', icon: Sparkles },
];

export function StylePicker({ selected, onChange }: StylePickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-black/40">
        Lighting Style
      </label>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {styles.map(({ id, label, desc, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "p-3 sm:p-4 rounded-xl border-2 text-left transition-all",
              selected === id
                ? "border-livewire-orange bg-livewire-orange/5"
                : "border-black/5 hover:border-livewire-orange/30 bg-white"
            )}
          >
            <Icon className={cn(
              "w-5 h-5 mb-2",
              selected === id ? "text-livewire-orange" : "text-black/30"
            )} />
            <p className="text-xs sm:text-sm font-semibold leading-tight">{label}</p>
            <p className="text-[10px] sm:text-xs text-black/40 mt-0.5 hidden sm:block">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
