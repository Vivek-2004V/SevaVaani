import React from 'react';
import logoImg from '../assets/seva-vaani-logo.png';

export interface SevaVaaniLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  subtitle?: string;
}

/**
 * SEVA VAANI Clean Official Brand Logo
 * - Transparent, seamless presentation (no clunky boxes or borders)
 * - Pure, elegant hover effect: smooth scale lift + soft emerald & gold ambient glow
 * - Fast, butter-smooth cubic-bezier transition
 */
export const SevaVaaniLogo: React.FC<SevaVaaniLogoProps> = ({
  size = 58,
  className = '',
}) => {
  return (
    <div
      className={`group relative inline-flex items-center select-none cursor-pointer transition-transform duration-300 ease-out hover:scale-105 active:scale-95 ${className}`}
      role="banner"
      aria-label="SEVA VAANI — सेवा वाणी"
    >
      {/* Soft Ambient Glow Backdrop (Activates smoothly on hover) */}
      <div
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-xl bg-gradient-to-r from-emerald-500/30 via-amber-400/25 to-emerald-400/30 -z-10"
        style={{ transform: 'scale(1.15)' }}
      />

      {/* Clean Transparent Logo Image */}
      <img
        src={logoImg}
        alt="SEVA VAANI — सेवा वाणी"
        className="w-auto object-contain transition-all duration-300 ease-out filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:drop-shadow-[0_0_20px_rgba(34,197,94,0.5)] group-hover:drop-shadow-[0_0_32px_rgba(234,179,8,0.3)] group-hover:brightness-105"
        style={{
          height: size,
          maxHeight: size,
        }}
        loading="eager"
      />
    </div>
  );
};

export default SevaVaaniLogo;
