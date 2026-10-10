import React from 'react';

/**
 * HumzieSymbol — Official Humzie AI Brand Icon
 * A unique, modern SVG symbol representing Humzie's on-device voice AI.
 * Consists of: circular head with "H" initial, sound-wave ears, and a voice waveform at base.
 */
export interface HumzieSymbolProps {
  size?: number;
  className?: string;
  /** Color variant */
  variant?: 'white' | 'emerald' | 'gradient' | 'amber';
  /** Whether to show the animated pulse ring around it */
  animated?: boolean;
}

export const HumzieSymbol: React.FC<HumzieSymbolProps> = ({
  size = 36,
  className = '',
  variant = 'white',
  animated = false,
}) => {
  const colors = {
    white: { main: '#ffffff', accent: '#d1fae5', wave: '#6ee7b7' },
    emerald: { main: '#34d399', accent: '#10b981', wave: '#6ee7b7' },
    gradient: { main: '#34d399', accent: '#f59e0b', wave: '#6ee7b7' },
    amber: { main: '#fbbf24', accent: '#f59e0b', wave: '#fde68a' },
  };

  const c = colors[variant];

  return (
    <span
      className={`inline-flex items-center justify-center relative ${className}`}
      style={{ width: size, height: size }}
      aria-label="Humzie AI"
    >
      {animated && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ background: c.main }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Gradient defs */}
        <defs>
          <linearGradient id="humzie-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={c.main} />
            <stop offset="100%" stopColor={c.accent} />
          </linearGradient>
        </defs>

        {/* Outer circle — head */}
        <circle
          cx="24"
          cy="22"
          r="13"
          stroke={variant === 'gradient' ? 'url(#humzie-grad)' : c.main}
          strokeWidth="2.5"
          fill="none"
        />

        {/* Left ear / sound bar */}
        <rect x="7" y="18" width="3" height="8" rx="1.5" fill={c.wave} />
        <rect x="4" y="20" width="3" height="4" rx="1.5" fill={c.wave} opacity="0.6" />

        {/* Right ear / sound bar */}
        <rect x="38" y="18" width="3" height="8" rx="1.5" fill={c.wave} />
        <rect x="41" y="20" width="3" height="4" rx="1.5" fill={c.wave} opacity="0.6" />

        {/* Letter H centered in head */}
        <text
          x="24"
          y="27"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fontFamily="'Inter', 'Helvetica Neue', sans-serif"
          fill={variant === 'gradient' ? 'url(#humzie-grad)' : c.main}
          letterSpacing="-0.5"
        >
          H
        </text>

        {/* Voice waveform at bottom — 5 bars */}
        <rect x="14" y="39" width="3" height="5" rx="1.5" fill={c.wave} />
        <rect x="19" y="36" width="3" height="8" rx="1.5" fill={c.wave} />
        <rect x="24" y="38" width="3" height="6" rx="1.5" fill={c.wave} />
        <rect x="29" y="35" width="3" height="9" rx="1.5" fill={c.wave} />
        <rect x="34" y="39" width="3" height="5" rx="1.5" fill={c.wave} />

        {/* Small neck connector */}
        <line x1="24" y1="35" x2="24" y2="37" stroke={c.wave} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
};

export default HumzieSymbol;
