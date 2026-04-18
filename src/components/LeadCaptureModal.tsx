import { useState } from 'react';
import { X, Loader2, CheckCircle2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LeadCaptureModalProps {
  open: boolean;
  onClose: (submitted: boolean) => void;
  address: string;
}

export function LeadCaptureModal({ open, onClose, address }: LeadCaptureModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('sending');
    try {
      const res = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, address }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose(false);
          }}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)] sm:pb-0"
          >
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <h3 className="font-serif text-xl">Get Your Glow Up</h3>
              <button
                onClick={() => onClose(false)}
                aria-label="Close"
                className="w-11 h-11 -mr-2 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 active:bg-black/15 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {status === 'sent' ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="font-serif text-xl">You're all set!</h4>
                <p className="text-sm text-black/50">
                  We'll be in touch to discuss bringing this vision to life.
                </p>
                <button onClick={() => onClose(true)} className="luxury-button mt-4">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <p className="text-sm text-black/50 mb-2">
                  Enter your info to download the full-resolution visualization and connect with our lighting team.
                </p>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1 block">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First & last name"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1 block">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(804) 555-1234"
                    className="input-field"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-red-500 text-sm">Something went wrong. Please try again.</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending' || !email || !name}
                  className="luxury-button w-full flex items-center justify-center gap-2"
                >
                  {status === 'sending' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Get My Glow Up</>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
