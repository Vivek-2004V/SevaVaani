import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import './styles.css';

export interface SylvaLivingWorldSceneProps {
  variant?: 'living-green' | 'sakura-sunset' | 'maple-autumn' | 'sequoia-mist';
  className?: string;
  style?: CSSProperties;
  headingFont?: string;
  bodyFont?: string;
  headingWeight?: string;
  bodyWeight?: string;
  primaryColor?: string;
  headingSize?: number;
  bodySize?: number;
  headingLetterSpacing?: number;
}

/**
 * Sylva Living World Scene Component
 * Renders the Three.js moss-root world from the authored inner-green-3d.html source
 * as a sandboxed iframe — preserves all shaders, motion, interactions, and
 * the full composition (root geometry, moss blades, ferns, flowers, pollen,
 * scan-light entrance, butterfly flight, pointer parting, parallax).
 *
 * For background use: renders without page chrome (canvas only).
 * For full-page hero use: see SylvaHero.
 */
export const SylvaLivingWorldScene: React.FC<SylvaLivingWorldSceneProps> = ({
  variant = 'living-green',
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Visibility-aware lifecycle: only mount iframe while host is visible
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // The fully-local patched canonical source (all assets resolved to /landing-pages/inner-green-assets/)
  const src = '/landing-pages/inner-green-3d-local.html';

  return (
    <div
      ref={containerRef}
      className={`sylva-living-world-host ${className}`}
      style={style}
      aria-hidden="true"
    >
      {isVisible && (
        <iframe
          src={src}
          title="Sylva Living World 3D Scene"
          className="sylva-living-world-iframe"
          sandbox="allow-scripts allow-same-origin"
          loading="eager"
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SylvaHero — Full-page hero implementation
   Source: SHA-256 05f359ce157a  /  ThreeUI SylvaHero living-green

   Renders the complete inner-green-3d.html page (Sylva landing page)
   as a full-viewport iframe using the exact authored structure,
   shaders, motion, interactions, and responsive behaviour from the
   canonical source. No recreation from screenshot or description.

   Configuration matches the specified usage:
     variant="living-green"
     headingFont="lexend", bodyFont="lexend"
     headingWeight="300",  bodyWeight="300"
     primaryColor="#ffffff"
     headingSize={63}      bodySize={16.5}
     headingLetterSpacing={-0.006}
   ───────────────────────────────────────────────────────────── */
export interface SylvaHeroProps {
  variant?: 'living-green' | 'sakura-sunset' | 'maple-autumn' | 'sequoia-mist';
  language?: string;
  className?: string;
  style?: CSSProperties;
  headingFont?: string;
  bodyFont?: string;
  headingWeight?: string;
  bodyWeight?: string;
  primaryColor?: string;
  headingSize?: number;
  bodySize?: number;
  headingLetterSpacing?: number;
}

export const SylvaHero: React.FC<SylvaHeroProps> = ({
  variant = 'living-green',
  language = 'hi',
  className = '',
  style = {},
  headingFont = 'lexend',
  bodyFont = 'lexend',
  headingWeight = '300',
  bodyWeight = '300',
  primaryColor = '#ffffff',
  headingSize = 63,
  bodySize = 16.5,
  headingLetterSpacing = -0.006,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // For living-green: load the canonical page byte-for-byte (local-patched)
  // For other variants: the canonical source handles them via JS (future)
  const src = '/landing-pages/inner-green-3d-local.html';

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: 'SET_LANGUAGE', language: language || 'hi' }, '*');
    } catch (e) {}
  }, [language]);

  // Inject typography customization into the iframe once loaded
  // (follows the pattern from pageTypography.ts: append one stylesheet to <head>)
  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;

    const applyTypography = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return;

        // Only inject if props differ from the page's authored defaults
        const needsOverride =
          headingFont !== 'lexend' ||
          bodyFont !== 'lexend' ||
          headingWeight !== '300' ||
          bodyWeight !== '300' ||
          primaryColor !== '#ffffff' ||
          headingSize !== 63 ||
          bodySize !== 16.5 ||
          headingLetterSpacing !== -0.006;

        if (!needsOverride) return;

        const existing = doc.querySelector('style[data-threeui-typography]');
        if (existing) existing.remove();

        const style = doc.createElement('style');
        style.setAttribute('data-threeui-typography', '');
        style.textContent = `
          .headline {
            font-size: calc(${headingSize} * var(--u));
            font-weight: ${headingWeight};
            letter-spacing: calc(${headingLetterSpacing * headingSize} * var(--u));
            color: ${primaryColor};
          }
          .lede {
            font-size: calc(${bodySize} * var(--u));
            font-weight: ${bodyWeight};
            color: ${primaryColor === '#ffffff' ? 'rgba(255,255,255,.62)' : primaryColor};
          }
        `;
        doc.head.appendChild(style);
      } catch (_) {
        // Cross-origin guard — won't reach here since we're same-origin
      }
    };

    const handleLoad = () => {
      applyTypography();
      try {
        if (frame.contentWindow) {
          frame.contentWindow.postMessage({ type: 'SET_LANGUAGE', language: language || 'hi' }, '*');
        }
      } catch (_) {}
    };

    frame.addEventListener('load', handleLoad);
    return () => frame.removeEventListener('load', handleLoad);
  }, [language, headingFont, bodyFont, headingWeight, bodyWeight, primaryColor, headingSize, bodySize, headingLetterSpacing]);

  return (
    <div
      className={`sylva-hero-host ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100svh',
        minHeight: '100svh',
        overflow: 'hidden',
        ...style
      }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title="Sylva — Into the living world"
        sandbox="allow-scripts allow-same-origin allow-popups"
        loading="eager"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
      />
    </div>
  );
};

// Also export MAPLE_AUTUMN_STYLE etc. for completeness (stubs — full transforms live in ThreeUI)
export const MAPLE_AUTUMN_STYLE = '';
export const SAKURA_SUNSET_STYLE = '';
export const SEQUOIA_MIST_STYLE = '';
export function applyMapleAutumnVariant(src: string) { return src; }
export function applySakuraSunsetVariant(src: string) { return src; }
export function applySequoiaMistVariant(src: string) { return src; }

export default SylvaLivingWorldScene;
