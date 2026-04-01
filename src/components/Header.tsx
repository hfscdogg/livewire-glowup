import { cn } from '@/lib/utils';

export function Logo({ className, white = false }: { className?: string; white?: boolean }) {
  return (
    <div className={cn("flex items-center h-10", className)}>
      <img
        src="/logo.png"
        alt="Livewire"
        className={cn("h-full w-auto object-contain", white && "brightness-0 invert")}
      />
    </div>
  );
}

export function Header() {
  return (
    <nav className="border-b border-black/5 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <Logo />
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-livewire-orange">
          Glow Up
        </span>
      </div>
    </nav>
  );
}
