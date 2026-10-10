/**
 * PWAInstallPrompt — Smart PWA Install Banner
 *
 * Shows a native-style install prompt when:
 * 1. The browser fires `beforeinstallprompt` (Chrome / Edge / Android)
 * 2. The app is NOT already running in standalone (PWA) mode
 *
 * Respects user dismissal — stores preference in sessionStorage so it
 * doesn't annoy the user on every page reload within a session.
 */

import React, { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // User dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      // Delay showing prompt by 3s — let user settle into the page first
      setTimeout(() => setShowPrompt(true), 3000);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      deferredPrompt.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const choice = await deferredPrompt.current.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }
    setShowPrompt(false);
    deferredPrompt.current = null;
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Install SevaVaani as an app"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'min(92vw, 400px)',
        background: 'rgba(15,23,42,0.96)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99,102,241,0.35)',
        borderRadius: '1.1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
        padding: '1rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(1rem); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Icon */}
      <div style={{
        width: 48, height: 48, borderRadius: '12px', flexShrink: 0,
        background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.15rem' }}>
          SevaVaani App Install करें
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
          Offline support • तेज़ loading • आवाज़ असिस्टेंट
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button
          id="pwa-dismiss-btn"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          style={{
            background: 'transparent',
            border: '1px solid rgba(148,163,184,0.3)',
            color: '#94a3b8',
            borderRadius: '0.5rem',
            padding: '0.4rem 0.65rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(148,163,184,0.6)')}
          onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(148,163,184,0.3)')}
        >
          बाद में
        </button>
        <button
          id="pwa-install-btn"
          onClick={handleInstall}
          aria-label="Install SevaVaani"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            border: 'none',
            color: 'white',
            borderRadius: '0.5rem',
            padding: '0.4rem 0.85rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.15s, transform 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          Install ↓
        </button>
      </div>
    </div>
  );
}
