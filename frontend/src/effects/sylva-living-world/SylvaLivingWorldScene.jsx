import React, { useState, useEffect, useRef } from 'react';
import './styles.css';

/**
 * Sylva Living World Scene Component
 * Built from verified authored source using Three.js r149
 * Preserves the root and ridge geometry, moss blades, ferns, flowers, pollen,
 * scan-light entrance, butterfly flight, pointer parting, parallax, camera, and responsive framing.
 */
export function SylvaLivingWorldScene({
  variant = 'living-green',
  className = '',
  style = {}
}) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  // Visibility observer to pause/unmount when out of view (Step 6)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
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
}

// Re-export as SylvaHero to satisfy both import signatures from the PDF specification
export const SylvaHero = SylvaLivingWorldScene;

export default SylvaLivingWorldScene;
