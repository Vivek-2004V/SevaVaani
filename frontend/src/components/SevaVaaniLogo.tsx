import React from 'react';

export interface SevaVaaniLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  animated?: boolean;
  subtitle?: string;
}

export const SevaVaaniLogo: React.FC<SevaVaaniLogoProps> = ({
  size = 44,
  className = '',
  showWordmark = false,
  animated = true,
  subtitle = 'नागरिकों की अपनी भाषा में डिजिटल सरकारी सेवा'
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem Container with subtle glass plate & glow */}
      <div
        className={`relative flex items-center justify-center rounded-2xl bg-slate-900/80 backdrop-blur-md p-1.5 border border-emerald-400/30 shadow-lg shadow-emerald-950/40 transition-transform duration-300 hover:scale-105 group`}
        style={{ width: size, height: size }}
      >
        {/* Glow halo behind logo */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-blue-600/20 blur-md pointer-events-none -z-10 group-hover:opacity-100 opacity-70 transition-opacity" />

        {/* Vector SVG Emblem: Leaf + Voice Resonance */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="leafGrad" x1="50" y1="20" x2="50" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="leafLightGrad" x1="50" y1="20" x2="68" y2="55" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            <linearGradient id="micCradleGrad" x1="25" y1="45" x2="75" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>

            <linearGradient id="waveGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Radiating Acoustic Voice Wave Arcs (Left, Top, Right) */}
          {/* Outer Wave 1 */}
          <path
            d="M 22 28 A 40 40 0 0 1 78 28"
            stroke="url(#waveGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.85"
            className={animated ? 'animate-pulse' : ''}
          />
          {/* Outer Wave 2 (Left) */}
          <path
            d="M 14 44 A 42 42 0 0 1 20 28"
            stroke="url(#waveGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          {/* Outer Wave 2 (Right) */}
          <path
            d="M 80 28 A 42 42 0 0 1 86 44"
            stroke="url(#waveGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Mid Wave Arcs (Left & Right) */}
          <path
            d="M 23 48 A 32 32 0 0 1 28 36"
            stroke="url(#waveGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.75"
          />
          <path
            d="M 72 36 A 32 32 0 0 1 77 48"
            stroke="url(#waveGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Top Voice Echo Arc */}
          <path
            d="M 36 21 A 20 20 0 0 1 64 21"
            stroke="url(#waveGrad)"
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Central Organic Leaf: Split into shaded & lit halves */}
          {/* Left Leaf Half */}
          <path
            d="M 50 20 C 37 32 34 52 50 67 C 50 50 50 35 50 20 Z"
            fill="url(#leafGrad)"
          />
          {/* Right Leaf Half (Lighter facet) */}
          <path
            d="M 50 20 C 63 32 66 52 50 67 C 50 50 50 35 50 20 Z"
            fill="url(#leafLightGrad)"
          />

          {/* Central Leaf Vein & Branching lines (Acoustic Equalizer motif) */}
          <path
            d="M 50 22 L 50 68"
            stroke="#064e3b"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M 50 35 L 42 30"
            stroke="#064e3b"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 50 38 L 58 33"
            stroke="#047857"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 50 48 L 41 43"
            stroke="#064e3b"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 50 51 L 59 46"
            stroke="#047857"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Microphone Acoustic Cradle (Embracing the Leaf) */}
          <path
            d="M 33 46 C 33 65 42 75 50 75 C 58 75 67 65 67 46"
            stroke="url(#micCradleGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Bottom Stem & Base Stand */}
          <path
            d="M 50 75 L 50 86"
            stroke="url(#micCradleGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 38 88 L 62 88"
            stroke="url(#micCradleGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Radiant Center Leaf Sprout Dot */}
          <circle cx="50" cy="20" r="2.2" fill="#86efac" />
        </svg>
      </div>

      {/* Optional Wordmark */}
      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-md">
              SEVA VAANI
            </span>
            <span className="text-xs font-semibold text-emerald-400 px-1.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800">
              सेवा वाणी
            </span>
          </div>
          {subtitle && (
            <p className="text-[10px] md:text-[11px] text-slate-300 font-medium tracking-wide">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SevaVaaniLogo;
