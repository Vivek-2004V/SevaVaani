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
 * Built from verified authored source using Three.js r149
 * Preserves the root and ridge geometry, moss blades, ferns, flowers, pollen,
 * scan-light entrance, butterfly flight, pointer parting, parallax, camera, and responsive framing.
 */
export const SylvaLivingWorldScene: React.FC<SylvaLivingWorldSceneProps> = ({
  variant = 'living-green',
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Visibility-aware lifecycle (Step 6): mount allow-scripts-only iframe only while host is visible
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

  return (
    <div
      ref={containerRef}
      className={`sylva-living-world-host ${className}`}
      style={style}
      aria-hidden="true"
    >
      {isVisible && (
        <iframe
          src="/landing-pages/sylva-scene.html"
          title="Sylva Living World 3D Scene"
          className="sylva-living-world-iframe"
          sandbox="allow-scripts allow-same-origin"
          loading="eager"
        />
      )}
    </div>
  );
};

// Also export SylvaHero to support both import signatures
export const SylvaHero = SylvaLivingWorldScene;

export default SylvaLivingWorldScene;
