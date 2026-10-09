/**
 * ConnectionBanner — visible network status indicator for SEVA VAANI.
 *
 * Shows:
 *  - Green "Online" pill when connected (auto-hides after 3s on reconnect)
 *  - Amber persistent banner when offline, listing what still works locally
 *  - Sync indicator when pending items are being retried
 */
import React, { useState, useEffect } from 'react';
import { NetworkStatus } from '../hooks/useNetworkStatus';

interface ConnectionBannerProps {
  status: NetworkStatus;
  pendingSyncCount?: number;
  isSyncing?: boolean;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  status,
  pendingSyncCount = 0,
  isSyncing = false,
}) => {
  const [showOnlinePill, setShowOnlinePill] = useState(false);
  const [prevOnline, setPrevOnline] = useState(status.isOnline);

  // Show "back online" pill for 3s after reconnect
  useEffect(() => {
    if (!prevOnline && status.isOnline) {
      setShowOnlinePill(true);
      const timer = setTimeout(() => setShowOnlinePill(false), 3500);
      return () => clearTimeout(timer);
    }
    setPrevOnline(status.isOnline);
  }, [status.isOnline, prevOnline]);

  // ── Offline Banner ────────────────────────────────────────────────────────
  if (status.isOffline) {
    return (
      <div
        role="status"
        aria-live="assertive"
        aria-label="Network offline — limited mode active"
        className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center"
      >
        <div className="w-full bg-amber-900/95 backdrop-blur-md border-b border-amber-500/40 px-4 py-2.5 flex items-center justify-between gap-3 text-sm shadow-xl">
          <div className="flex items-center gap-2 text-amber-100">
            <span className="text-base">📡</span>
            <div>
              <span className="font-bold">इंटरनेट बंद है (Offline Mode)</span>
              <span className="hidden sm:inline text-amber-200/80 font-normal">
                {' '}— आपके सहेजे गए उत्तर सुरक्षित हैं
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pendingSyncCount > 0 && (
              <span className="text-[11px] bg-amber-800 text-amber-200 px-2 py-0.5 rounded-full border border-amber-600/40 font-semibold">
                {pendingSyncCount} sync pending
              </span>
            )}
            <span className="text-[11px] text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-700/40">
              टाइप करके जारी रखें ↓
            </span>
          </div>
        </div>

        {/* What works offline */}
        <div className="bg-amber-950/90 backdrop-blur-sm border-b border-amber-900/60 px-4 py-1.5 w-full flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-amber-300/90">
          <span>✅ Text input</span>
          <span>✅ Saved answers</span>
          <span>✅ Session progress</span>
          <span>⚠️ Voice needs connection</span>
          <span>⚠️ Submission requires connection</span>
        </div>
      </div>
    );
  }

  // ── Syncing Indicator ─────────────────────────────────────────────────────
  if (isSyncing && pendingSyncCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="w-full bg-blue-900/90 backdrop-blur-md border-b border-blue-500/30 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-blue-200">
          <span className="animate-spin inline-block">⟳</span>
          <span>Syncing {pendingSyncCount} saved answers with server…</span>
        </div>
      </div>
    );
  }

  // ── Back Online Pill ──────────────────────────────────────────────────────
  if (showOnlinePill) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce-once">
        <div className="bg-emerald-700/95 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl border border-emerald-400/40 flex items-center gap-2">
          <span>✅</span>
          <span>वापस ऑनलाइन (Back Online)</span>
          {pendingSyncCount > 0 && (
            <span className="text-emerald-200">— {pendingSyncCount} answers syncing…</span>
          )}
        </div>
      </div>
    );
  }

  return null;
};
