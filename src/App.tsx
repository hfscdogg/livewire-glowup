import { useState } from 'react';
import { Sparkles, Loader2, Moon, Download, Share2, Mail, ArrowLeft, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Header, Logo } from './components/Header';
import { PhotoUpload } from './components/PhotoUpload';
import { StylePicker, type LightingStyle } from './components/StylePicker';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { LeadCaptureModal } from './components/LeadCaptureModal';

export default function App() {
  // Input state
  const [image, setImage] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [style, setStyle] = useState<LightingStyle>('warm');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Lead + reveal state
  const [leadId, setLeadId] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);

  const canGenerate = !!image;

  const reset = () => {
    setLeadId(null);
    setDescription(null);
    setAfterImageUrl(null);
    setError(null);
    setProgress('');
  };

  const handleGenerate = async () => {
    if (!image) return;

    setIsGenerating(true);
    setError(null);
    setLeadId(null);
    setDescription(null);
    setAfterImageUrl(null);

    try {
      setProgress('Analyzing your home\'s architecture...');

      const imageRes = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, style, address }),
      });

      if (!imageRes.ok) {
        const errData = await imageRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Image generation failed');
      }

      const data = await imageRes.json();
      setLeadId(data.leadId);
      setDescription(data.description);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  const handleReveal = (url: string) => {
    setAfterImageUrl(url);
    setShowLeadModal(false);
  };

  const handleDownload = () => {
    if (!afterImageUrl) return;
    const link = document.createElement('a');
    link.href = afterImageUrl;
    link.download = `livewire-glowup-${Date.now()}.png`;
    link.target = '_blank';
    link.click();
  };

  const handleShare = async () => {
    if (!afterImageUrl || !navigator.share) return;
    try {
      const blob = await fetch(afterImageUrl).then((r) => r.blob());
      const file = new File([blob], 'livewire-glowup.png', { type: 'image/png' });
      await navigator.share({ title: 'My Home Glow Up by Livewire', files: [file] });
    } catch {
      // User cancelled or share failed
    }
  };

  // Determine which view to show
  const isGateStage = !!leadId && !afterImageUrl;
  const isResultStage = !!leadId && !!afterImageUrl;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {!leadId && !isGenerating ? (
            // ===== INPUT VIEW =====
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Hero */}
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-5xl font-serif leading-tight">
                  See Your Home in a<br />
                  <span className="italic text-livewire-orange">New Light</span>
                </h1>
                <p className="text-sm sm:text-base text-black/50 max-w-md mx-auto">
                  Upload a photo of your home and we'll show you what professional landscape lighting looks like — in seconds.
                </p>
              </div>

              {/* Upload */}
              <PhotoUpload image={image} onImageChange={setImage} />

              {/* Address (optional) */}
              {image && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <label className="text-xs font-bold uppercase tracking-widest text-black/40">
                    Property Address (optional)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 123 River Road, Richmond, VA"
                    className="input-field"
                  />
                </motion.div>
              )}

              {/* Style Picker */}
              {image && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <StylePicker selected={style} onChange={setStyle} />
                </motion.div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="luxury-button w-full flex items-center justify-center gap-2 text-base"
              >
                <Sparkles className="w-5 h-5" />
                See Your Glow Up
              </button>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
            </motion.div>

          ) : isGenerating ? (
            // ===== LOADING VIEW =====
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center py-24 space-y-8"
            >
              <div className="relative">
                <div className="w-24 h-24 border-4 border-livewire-orange/20 border-t-livewire-orange rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Moon className="w-8 h-8 text-livewire-orange animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif">Creating Your Glow Up</h3>
                <p className="text-black/40 animate-pulse text-sm">{progress}</p>
              </div>
            </motion.div>

          ) : isGateStage ? (
            // ===== GATE STAGE — email required to reveal =====
            <motion.div
              key="gate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Back button */}
              <button
                onClick={reset}
                className="flex items-center gap-2 text-sm font-semibold text-livewire-orange hover:text-livewire-grey transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Try Another Photo
              </button>

              {/* Blurred teaser */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-black/5">
                {image && (
                  <img
                    src={image}
                    alt="Your home"
                    className="absolute inset-0 w-full h-full object-cover blur-[20px] scale-105 opacity-60"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-white/20">
                    <Lock className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-serif text-white mb-2">
                    Your Glow Up is Ready
                  </h3>
                  <p className="text-white/70 text-sm max-w-sm">
                    Enter your email below to reveal your personalized lighting design.
                  </p>
                </div>
              </div>

              {/* Description (shown to build desire) */}
              {description && (
                <div className="glass-panel rounded-2xl p-6 sm:p-8">
                  <h2 className="font-serif text-xl sm:text-2xl mb-3">Your Lighting Design</h2>
                  <p className="text-sm sm:text-base text-black/60 leading-relaxed">
                    {description}
                  </p>
                </div>
              )}

              {/* CTA to reveal */}
              <button
                onClick={() => setShowLeadModal(true)}
                className="luxury-button w-full flex items-center justify-center gap-2 text-base"
              >
                <Sparkles className="w-5 h-5" />
                Reveal Your Glow Up
              </button>
            </motion.div>

          ) : isResultStage ? (
            // ===== RESULTS VIEW — fully unlocked =====
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Back button */}
              <button
                onClick={reset}
                className="flex items-center gap-2 text-sm font-semibold text-livewire-orange hover:text-livewire-grey transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Try Another Photo
              </button>

              {/* Before/After Slider */}
              {image && afterImageUrl && (
                <BeforeAfterSlider
                  beforeImage={image}
                  afterImage={afterImageUrl}
                />
              )}

              {/* Description */}
              {description && (
                <div className="glass-panel rounded-2xl p-6 sm:p-8">
                  <h2 className="font-serif text-xl sm:text-2xl mb-3">Your Lighting Design</h2>
                  <p className="text-sm sm:text-base text-black/60 leading-relaxed">
                    {description}
                  </p>
                </div>
              )}

              {/* Action buttons — no gating needed */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownload}
                  className="luxury-button flex-1 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Image
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 px-8 py-4 rounded-full border-2 border-livewire-orange text-livewire-orange font-semibold hover:bg-livewire-orange hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button
                  onClick={() => {
                    window.location.href = `mailto:?subject=Check out my home's glow up!&body=See what my home could look like with Livewire landscape lighting.`;
                  }}
                  className="flex-1 px-8 py-4 rounded-full border-2 border-black/10 font-semibold hover:bg-black/5 transition-all flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" /> Email This
                </button>
              </div>

              {/* CTA */}
              <div className="text-center py-6 border-t border-black/5">
                <p className="text-sm text-black/40 mb-3">Love what you see?</p>
                <a
                  href="https://getlivewire.com/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="luxury-button inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Schedule a Free Consultation
                </a>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Lead Capture Modal */}
      <LeadCaptureModal
        open={showLeadModal}
        leadId={leadId}
        onReveal={handleReveal}
        onClose={() => setShowLeadModal(false)}
      />

      {/* Footer */}
      <footer className="border-t border-black/5 py-8 mt-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="opacity-30 grayscale">
            <Logo className="h-5" />
          </div>
          <p className="text-[10px] text-black/30 uppercase tracking-widest">
            &copy; 2026 Livewire Lighting Design &bull; Central Virginia
          </p>
        </div>
      </footer>
    </div>
  );
}
