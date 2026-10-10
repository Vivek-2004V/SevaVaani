/**
 * OfflineIndicator — Live Network Status Banner
 *
 * Shows a non-intrusive banner at the top of the screen when the user
 * goes offline. Auto-dismisses 3 seconds after connectivity is restored.
 *
 * Also provides a usePWAStatus() hook for components to check:
 * - isOnline: current network status
 * - isStandalone: is the app running as an installed PWA
 * - isUpdateAvailable: a new service worker version is waiting
 */

import React, { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Hook — PWA + network status
// ---------------------------------------------------------------------------
export function usePWAStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStandalone] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  );
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    // Listen for service worker update events (vite-plugin-pwa fires these)
    const handleSWUpdate = () => setIsUpdateAvailable(true);
    window.addEventListener('sw-update-available', handleSWUpdate);
    return () => window.removeEventListener('sw-update-available', handleSWUpdate);
  }, []);

  const applyUpdate = useCallback(() => {
    // Ask the waiting SW to take control immediately
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  }, []);

  return { isOnline, isStandalone, isUpdateAvailable, applyUpdate };
}

// ---------------------------------------------------------------------------
// Component — visual offline banner + update notification
// ---------------------------------------------------------------------------
export default function OfflineIndicator() {
  const { isOnline, isUpdateAvailable, applyUpdate } = usePWAStatus();
  const [showRestoredMsg, setShowRestoredMsg] = useState(false);
  const prevOnlineRef = React.useRef(isOnline);

  useEffect(() => {
    if (!prevOnlineRef.current && isOnline) {
      // Just came back online
      setShowRestoredMsg(true);
      const t = setTimeout(() => setShowRestoredMsg(false), 3500);
      return () => clearTimeout(t);
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  const showOfflineBanner = !isOnline;
  const showOnlineBanner = isOnline && showRestoredMsg;

  const bannerBase: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.55rem 1rem',
    fontSize: '0.82rem',
    fontWeight: 600,
    transition: 'transform 0.3s ease, opacity 0.3s ease',
  };

  return (
    <>
      {/* ── Offline banner ── */}
      <div
        role="status"
        aria-live="polite"
        style={{
          ...bannerBase,
          background: '#1e293b',
          borderBottom: '1px solid rgba(239,68,68,0.4)',
          color: '#fca5a5',
          transform: showOfflineBanner ? 'translateY(0)' : 'translateY(-100%)',
          opacity: showOfflineBanner ? 1 : 0,
          pointerEvents: showOfflineBanner ? 'auto' : 'none',
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#ef4444', flexShrink: 0,
          animation: 'offlBlink 1.2s ease-in-out infinite'
        }} />
        <style>{`
          @keyframes offlBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>
        <span>ऑफलाइन — You're offline. Your drafts are saved locally.</span>
      </div>

      {/* ── Restored banner ── */}
      <div
        role="status"
        aria-live="polite"
        style={{
          ...bannerBase,
          background: '#14532d',
          borderBottom: '1px solid rgba(34,197,94,0.35)',
          color: '#86efac',
          transform: showOnlineBanner ? 'translateY(0)' : 'translateY(-100%)',
          opacity: showOnlineBanner ? 1 : 0,
          pointerEvents: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>वापस ऑनलाइन — Connection restored ✓</span>
      </div>

      {/* ── SW Update available banner ── */}
      {isUpdateAvailable && (
        <div
          role="status"
          style={{
            ...bannerBase,
            top: 'auto',
            bottom: '4.5rem',
            left: '50%',
            right: 'auto',
            transform: 'translateX(-50%)',
            width: 'min(92vw, 360px)',
            background: 'rgba(15,23,42,0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: '0.85rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            flexDirection: 'column',
            gap: '0.4rem',
            padding: '0.75rem 1rem',
          }}
        >
          <span style={{ color: '#f8fafc', fontSize: '0.8rem' }}>
            🔄 नया अपडेट उपलब्ध है — New version available
          </span>
          <button
            id="pwa-update-btn"
            onClick={applyUpdate}
            style={{
              background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
              border: 'none', color: 'white',
              borderRadius: '0.5rem',
              padding: '0.35rem 0.9rem',
              fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
              alignSelf: 'flex-end'
            }}
          >
            अभी अपडेट करें / Update Now
          </button>
        </div>
      )}
    </>
  );
}
