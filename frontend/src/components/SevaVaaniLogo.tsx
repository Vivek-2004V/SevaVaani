import React from 'react';

export interface SevaVaaniLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  subtitle?: string;
  variant?: 'human-civic' | 'speaking-leaf' | 'auto';
}

/**
 * SEVA VAANI — Human-Crafted Indian Civic Emblem (मानवीय एवं प्रामाणिक पहचान)
 * Handcrafted Indian Public Service Brand Identity:
 * 1. Devanagari 'स' (सेवा और स्वर) — Deep civic navy, the foundation of citizen service.
 * 2. Sprouting Peepal Leaf (अंकुर / पत्ता) — Vibrant emerald green, representing life, youth & welfare.
 * 3. Acoustic Voice Ripples (वाणी / स्वर तरंगें) — Warm saffron soundwaves radiating citizen speech.
 * 4. High legibility at 24px and 120px scale with zero synthetic AI clutter.
 */
export const SevaVaaniLogo: React.FC<SevaVaaniLogoProps> = ({
  size = 46,
  className = '',
  showWordmark = false,
  subtitle = 'नागरिकों की अपनी आवाज़ • जन सेवा केंद्र',
  variant = 'human-civic'
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem Badge Container: Crisp porcelain circular medallion */}
      <div
        className="relative flex items-center justify-center rounded-full bg-white shadow-md border border-slate-200/90 transition-all duration-300 hover:scale-105 hover:shadow-lg flex-shrink-0 group overflow-hidden"
        style={{ width: size, height: size, padding: size * 0.08 }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Porcelain white medallion backdrop */}
          <circle cx="50" cy="50" r="48" fill="#ffffff" />
          
          <defs>
            {/* Natural Forest & Neem Leaf Gradient (Rich, grounded organic green) */}
            <linearGradient id="civicLeafGrad" x1="58" y1="36" x2="88" y2="12" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="60%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Warm Saffron Acoustic Wave Gradient */}
            <linearGradient id="civicVoiceWaves" x1="10" y1="30" x2="24" y2="65" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {variant === 'speaking-leaf' ? (
            /* Variant: The Speaking Leaf (वाणी-पर्ण) */
            <g>
              <path
                d="M 50 82 C 48 82, 22 72, 24 44 C 26 26, 42 16, 50 14 C 50 28, 49 60, 50 82 Z"
                fill="url(#civicLeafGrad)"
              />
              <path d="M 50 84 L 50 14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 50 32 C 60 33, 70 40, 70 52" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
              <path d="M 50 48 C 65 49, 82 58, 80 72" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
              <path d="M 50 64 C 62 65, 74 72, 72 82" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="50" cy="85" r="3.5" fill="#ea580c" />
            </g>
          ) : (
            /* Default Variant: Human Civic 'स' + Sprouting Leaf + Voice Waves */
            <g>
              {/* 1. SEVA: The Dignified Civic Devanagari 'स' in Deep Navy (#1e3a8a) */}
              {/* Top Shirorekha / Horizontal Bar */}
              <path
                d="M 25 26 L 73 26"
                stroke="#1e3a8a"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              {/* Vertical Spine (Right Column) */}
              <path
                d="M 61 26 L 61 76"
                stroke="#1e3a8a"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              {/* Middle Connecting Bridge */}
              <path
                d="M 43 49 L 61 49"
                stroke="#1e3a8a"
                strokeWidth="5"
                strokeLinecap="round"
              />
              {/* Left Acoustic Curve (Devanagari loop / sound receiver) */}
              <path
                d="M 44 26 C 27 26, 23 38, 23 48 C 23 60, 35 66, 41 74"
                stroke="#1e3a8a"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* 2. LEAF: Organic Peepal Sprout blossoming from the top right */}
              <path
                d="M 61 26 
                   C 66 14 81 12 87 25 
                   C 85 36 73 34 61 26 Z"
                fill="url(#civicLeafGrad)"
              />
              {/* Delicate white leaf central vein */}
              <path
                d="M 63 26 C 70 23 78 21 84 24"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* 3. VAANI: Acoustic Sound Waves (Citizen Voice radiating from the left) */}
              {/* Inner Voice Wave */}
              <path
                d="M 17 38 A 14 14 0 0 0 17 58"
                stroke="url(#civicVoiceWaves)"
                strokeWidth="3.4"
                strokeLinecap="round"
              />
              {/* Outer Voice Wave */}
              <path
                d="M 10 32 A 23 23 0 0 0 10 64"
                stroke="url(#civicVoiceWaves)"
                strokeWidth="2.8"
                strokeLinecap="round"
                opacity="0.85"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Wordmark (When enabled) */}
      {showWordmark && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-sm font-sans">
              SEVA VAANI
            </span>
            <span className="text-[11px] font-bold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-600/50">
              सेवा वाणी
            </span>
          </div>
          {subtitle && (
            <p className="text-[10px] md:text-[11px] text-slate-200 font-normal tracking-wide mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SevaVaaniLogo;
