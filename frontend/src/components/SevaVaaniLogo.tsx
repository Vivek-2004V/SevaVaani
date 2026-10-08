import React, { useState, useRef, useCallback } from 'react';
import logoImg from '../assets/seva-vaani-logo.png';

export interface SevaVaaniLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  subtitle?: string;
  variant?: 'full' | 'compact' | 'auto';
}

/**
 * SEVA VAANI Official 3D Interactive Brand Emblem
 * Matches the 3D Sylva Living World Scene aesthetic:
 * 1. 3D Mouse Parallax Tilt Physics (perspective rotateX / rotateY)
 * 2. Dynamic Specular Light Glint (tracks cursor coordinate on 3D surface)
 * 3. Multi-layer translateZ 3D Parallax Depth (emblem floats forward, shadow casts back)
 * 4. Bioluminescent Spores & Forest Glow (emerald & golden sunlight bloom)
 * 5. Holographic Sonic Voice Ripples on hover
 * 6. Smooth spring physics return
 */
export const SevaVaaniLogo: React.FC<SevaVaaniLogoProps> = ({
  size = 64,
  className = '',
  showWordmark = false,
  subtitle = 'डिजिटल जन सेवा केंद्र',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({
    rx: 0,
    ry: 0,
    lightX: 50,
    lightY: 50,
    active: false,
  });

  // Calculate 3D cursor tracking physics
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Smooth proportional tilt angles (max ~18 deg for balanced 3D realism)
    const rx = (0.5 - y) * 22;
    const ry = (x - 0.5) * 26;
    const lightX = Math.round(x * 100);
    const lightY = Math.round(y * 100);

    setTilt({ rx, ry, lightX, lightY, active: true });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setTilt((prev) => ({ ...prev, active: true }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Spring physics return to neutral resting state
    setTilt({ rx: 0, ry: 0, lightX: 50, lightY: 50, active: false });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`group relative inline-flex items-center gap-3.5 select-none cursor-pointer ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1000px' }}
      role="banner"
      aria-label="SEVA VAANI — Digital Citizen Service"
    >
      {/* 1. Ambient 3D Bioluminescent Spores / Forest Glow (Layer -1 in 3D space) */}
      <div
        className="absolute -inset-4 rounded-3xl transition-all duration-700 pointer-events-none"
        style={{
          transform: 'translateZ(-20px)',
          opacity: tilt.active ? 1 : 0,
          background: `radial-gradient(circle at ${tilt.lightX}% ${tilt.lightY}%, rgba(34, 197, 94, 0.45) 0%, rgba(234, 179, 8, 0.3) 40%, transparent 75%)`,
          filter: 'blur(22px)',
        }}
      />

      {/* Floating Living Spores / Fireflies (active on hover) */}
      {tilt.active && (
        <>
          <span
            className="absolute -top-1 left-2 w-1.5 h-1.5 rounded-full bg-emerald-300 pointer-events-none animate-ping"
            style={{ animationDuration: '2.4s' }}
          />
          <span
            className="absolute -bottom-1.5 right-6 w-2 h-2 rounded-full bg-amber-300 pointer-events-none animate-pulse blur-[0.5px]"
            style={{ animationDuration: '1.8s' }}
          />
          <span
            className="absolute top-1/2 -right-2 w-1.5 h-1.5 rounded-full bg-cyan-300 pointer-events-none animate-bounce"
            style={{ animationDuration: '2s' }}
          />
        </>
      )}

      {/* 2. 3D Glass Pedestal & Emblem Stage with True Parallax Physics */}
      <div
        className="relative flex items-center justify-center p-1.5 rounded-2xl transition-all"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(${
            tilt.active ? 1.07 : 1
          }, ${tilt.active ? 1.07 : 1}, 1)`,
          transition: tilt.active
            ? 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)'
            : 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
          background: tilt.active
            ? 'rgba(15, 23, 42, 0.55)'
            : 'rgba(15, 23, 42, 0.25)',
          backdropFilter: 'blur(16px)',
          border: tilt.active
            ? '1px solid rgba(74, 222, 128, 0.35)'
            : '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: tilt.active
            ? `${-tilt.ry * 0.7}px ${
                tilt.rx * 0.7 + 12
              }px 28px -4px rgba(0, 0, 0, 0.65), 0 0 24px rgba(34, 197, 94, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)`
            : '0 8px 24px -4px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Acoustic Soundwave Rings (Pulse in 3D space when hovered) */}
        {tilt.active && (
          <div
            className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ transform: 'translateZ(10px)' }}
          >
            <div className="w-9 h-9 rounded-full border border-cyan-400/40 animate-ping" style={{ animationDuration: '1.4s' }} />
          </div>
        )}

        {/* 3. The 3D Emblem Image (Layer +25px in 3D space, floating towards camera) */}
        <div
          className="relative transition-transform duration-200"
          style={{
            transform: 'translateZ(28px)',
          }}
        >
          <img
            src={logoImg}
            alt="SEVA VAANI — सेवा वाणी"
            className="w-auto object-contain transition-all duration-300"
            style={{
              height: size,
              maxHeight: size,
              filter: tilt.active
                ? `drop-shadow(${ -tilt.ry * 0.5 }px ${ tilt.rx * 0.5 + 6 }px 12px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 18px rgba(74, 222, 128, 0.4)) brightness(1.08)`
                : 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5)) brightness(1)',
            }}
            loading="eager"
          />

          {/* 4. Dynamic 3D Specular Light Glint Layer (Layer +38px) */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 mix-blend-screen"
            style={{
              transform: 'translateZ(38px)',
              opacity: tilt.active ? 0.75 : 0,
              background: `radial-gradient(circle at ${tilt.lightX}% ${tilt.lightY}%, rgba(255, 255, 255, 0.75) 0%, rgba(74, 222, 128, 0.25) 28%, transparent 65%)`,
            }}
          />
        </div>
      </div>

      {/* 5. Accompanying Civic 3D Pill Badge (When enabled) */}
      {showWordmark && (
        <div
          className="hidden xl:flex flex-col text-left transition-all duration-300 pl-2 border-l border-white/15"
          style={{
            transform: `translateZ(${tilt.active ? '15px' : '0px'})`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                tilt.active ? 'bg-emerald-300 shadow-[0_0_8px_#86efac]' : 'bg-emerald-400'
              } animate-pulse`}
            />
            <span
              className={`text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ${
                tilt.active
                  ? 'text-emerald-200 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                  : 'text-emerald-400/90'
              }`}
            >
              जन सेवा केंद्र
            </span>
          </div>
          {subtitle && (
            <p
              className={`text-[10px] font-normal tracking-wide transition-colors duration-300 ${
                tilt.active ? 'text-slate-100' : 'text-slate-300/80'
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SevaVaaniLogo;
