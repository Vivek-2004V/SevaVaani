import React, { useState } from 'react';
import logoImg from '../assets/seva-vaani-logo.png';

export interface SevaVaaniLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  subtitle?: string;
  variant?: 'full' | 'compact' | 'auto';
}

/**
 * SEVA VAANI Official Brand Emblem
 * Features:
 * - High-fidelity authentic artwork: The Speaking Face, Golden & Emerald Peepal leaves, Acoustic Voice waves, 3D Gold "SEVA" and Glowing "VAANI".
 * - Rich interactive hover experience:
 *   * Scale lift with smooth spring easing
 *   * Dual-layer ambient glow (Emerald green + Golden dawn aura)
 *   * Subtle 3D perspective tilt
 *   * Interactive live civic badge
 */
export const SevaVaaniLogo: React.FC<SevaVaaniLogoProps> = ({
  size = 62,
  className = '',
  showWordmark = false,
  subtitle = 'डिजिटल जन सेवा केंद्र',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`group relative inline-flex items-center gap-3 select-none cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="banner"
      aria-label="SEVA VAANI — Digital Citizen Service"
    >
      {/* Ambient Radial Bloom Backdrop on Hover */}
      <div
        className={`absolute -inset-3 rounded-full transition-all duration-500 pointer-events-none ${
          isHovered
            ? 'opacity-100 bg-gradient-to-r from-emerald-500/30 via-amber-400/25 to-emerald-400/30 blur-2xl scale-110'
            : 'opacity-0 scale-90'
        }`}
      />

      {/* Main Logo Container with Smooth Interactive Hover Effects */}
      <div
        className="relative flex items-center justify-center transition-all duration-300 ease-out transform"
        style={{
          transform: isHovered
            ? 'translateY(-2px) scale(1.06)'
            : 'translateY(0px) scale(1)',
        }}
      >
        <img
          src={logoImg}
          alt="SEVA VAANI — सेवा वाणी"
          className="w-auto object-contain transition-all duration-300 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] group-hover:drop-shadow-[0_0_22px_rgba(34,197,94,0.55)] group-hover:drop-shadow-[0_0_36px_rgba(234,179,8,0.35)] group-hover:brightness-110"
          style={{
            height: size,
            maxHeight: size,
          }}
          loading="eager"
        />

        {/* Shimmer sweep effect on hover */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background:
              'linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.28) 50%, transparent 75%)',
            backgroundSize: '200% 100%',
            animation: isHovered ? 'shimmerSweep 1.5s infinite ease-in-out' : 'none',
          }}
        />
      </div>

      {/* Accompanying Civic Badge & Subtitle (When enabled) */}
      {showWordmark && (
        <div className="hidden xl:flex flex-col text-left transition-all duration-300 pl-1 border-l border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span
              className={`text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ${
                isHovered ? 'text-emerald-300' : 'text-emerald-400/90'
              }`}
            >
              जन सेवा केंद्र
            </span>
          </div>
          {subtitle && (
            <p className="text-[10px] text-slate-300/80 font-normal tracking-wide">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Embedded Keyframe style for the smooth shimmer */}
      <style>{`
        @keyframes shimmerSweep {
          0% { background-position: -150% 0; }
          100% { background-position: 250% 0; }
        }
      `}</style>
    </div>
  );
};

export default SevaVaaniLogo;
