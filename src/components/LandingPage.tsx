import React from 'react';
import { LogIn, Sparkles, ShieldCheck, Database, ArrowRight, Terminal, Bot } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

interface LandingPageProps {
  onLoginSuccess: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginSuccess,
  isLoading,
  error,
}) => {
  const [signingIn, setSigningIn] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      setLocalError(null);
      await signInWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      console.error('Sign in error:', err);
      setLocalError(
        err?.message || 'Could not complete Google Sign-In. Please check pop-up permissions.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#121212] flex flex-col justify-between selection:bg-[#121212] selection:text-white relative overflow-hidden font-sans">
      {/* Subtle giant background typography watermark */}
      <div className="absolute top-12 right-0 pointer-events-none select-none z-0">
        <p className="text-[140px] sm:text-[220px] md:text-[300px] font-black leading-none text-[#121212] opacity-[0.03] uppercase tracking-tighter">
          GEMINI
        </p>
      </div>

      {/* Top Header */}
      <header className="w-full border-b border-[#121212] bg-[#FDFCFB]/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-[#121212] flex items-center justify-center text-white text-xs font-black tracking-tighter">
              MR
            </div>
            <div>
              <span className="font-black text-xl tracking-tighter uppercase leading-none block text-[#121212]">
                MIND & REFLECTION
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
                Private AI Journal • Gemini 3.6
              </span>
            </div>
          </div>

          <button
            id="nav-signin-btn"
            onClick={handleSignIn}
            disabled={signingIn || isLoading}
            className="inline-flex items-center gap-3 bg-[#121212] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50"
          >
            {signingIn ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>AUTHENTICATING...</span>
              </span>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>SIGN IN WITH GOOGLE</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 sm:px-10 py-16 sm:py-24 flex flex-col justify-between relative z-10 w-full">
        <div className="max-w-4xl space-y-8">
          {/* Metadata pill */}
          <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-[#EEE] border border-[#121212]/10 text-[#121212]">
            <span className="w-2 h-2 bg-[#121212] inline-block" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#121212]">
              Cloud Firestore • User Isolation Active
            </span>
          </div>

          {/* High-Impact Display Headline */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[96px] font-black leading-[0.88] tracking-tighter uppercase text-[#121212]">
            UNPACK THOUGHTS.<br />
            IGNITE CLARITY.
          </h1>

          {/* Editorial Subtitle */}
          <p className="text-xl sm:text-2xl font-serif italic text-[#444] max-w-2xl leading-relaxed">
            "A private sanctuary to converse with Gemini AI, balance daily friction, and record personal reflections with strict user isolation."
          </p>

          {/* Sign In Alert */}
          {(error || localError) && (
            <div className="p-4 bg-red-50 border-l-4 border-red-600 text-red-900 text-xs">
              <p className="font-bold uppercase tracking-wider">Authentication Notice</p>
              <p className="mt-1 font-mono">{error || localError}</p>
            </div>
          )}

          {/* Main Action Bar */}
          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              id="hero-get-started-btn"
              onClick={handleSignIn}
              disabled={signingIn || isLoading}
              className="bg-[#121212] text-white px-8 py-4.5 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-4 cursor-pointer disabled:opacity-50 shadow-md"
            >
              {signingIn ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>INITIALIZING SECURE SESSION...</span>
                </span>
              ) : (
                <>
                  <span>START YOUR JOURNAL SESSION</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
              Zero Passwords • Federated Google Auth
            </span>
          </div>
        </div>

        {/* Feature Grid with High Contrast Borders */}
        <div className="mt-20 sm:mt-28 grid grid-cols-1 md:grid-cols-3 border-t-2 border-[#121212]">
          <div className="p-8 md:border-r border-b md:border-b-0 border-[#121212] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
                01 / SECURITY
              </span>
              <ShieldCheck className="w-4 h-4 text-[#121212]" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              ISOLATED STORAGE
            </h3>
            <p className="text-xs text-[#555] leading-relaxed">
              Every journal entry is strictly scoped to your Firebase UID. Firestore security rules prevent any cross-user data exposure.
            </p>
          </div>

          <div className="p-8 md:border-r border-b md:border-b-0 border-[#121212] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
                02 / INTELLIGENCE
              </span>
              <Sparkles className="w-4 h-4 text-[#121212]" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              MULTI-TURN GEMINI
            </h3>
            <p className="text-xs text-[#555] leading-relaxed">
              Deep reasoning and resilient fallback ladders across Gemini models to brainstorm, summarize, and reflect on your daily experiences.
            </p>
          </div>

          <div className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
                03 / CONTINUITY
              </span>
              <Database className="w-4 h-4 text-[#121212]" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              CLOUD PERSISTENCE
            </h3>
            <p className="text-xs text-[#555] leading-relaxed">
              Continuous autosave directly to Cloud Firestore. Search past sessions, revisit breakthroughs, and track long-term growth.
            </p>
          </div>
        </div>
      </main>

      {/* Stark Footer */}
      <footer className="w-full border-t border-[#121212] py-6 px-6 sm:px-10 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#121212]">
              GEMINI REFLECTION JOURNAL
            </span>
            <span className="text-[#A0A0A0] text-xs">•</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
              BOLD TYPOGRAPHY ARCHETYPE
            </span>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0A0A0]">
            AUTOSAVED TO FIRESTORE • CLOUD ACTIVE
          </p>
        </div>
      </footer>
    </div>
  );
};
