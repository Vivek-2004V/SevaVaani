/**
 * SessionRecoveryBanner — shown when a saved incomplete session is detected.
 *
 * Gives the user a clear choice:
 *   1. Resume from where they left off (restores confirmed answers)
 *   2. Start fresh (discards local saved data)
 *
 * Never automatically resumes — consent is required.
 */
import React from 'react';
import { PersistedSession } from '../hooks/useOfflineStore';

interface SessionRecoveryBannerProps {
  savedSession: PersistedSession;
  onResume: (session: PersistedSession) => void;
  onDiscard: () => void;
}

export const SessionRecoveryBanner: React.FC<SessionRecoveryBannerProps> = ({
  savedSession,
  onResume,
  onDiscard,
}) => {
  const confirmedCount = savedSession.confirmedFields.length;
  const savedAt = new Date(savedSession.savedAt).toLocaleString('hi-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      role="dialog"
      aria-labelledby="session-recovery-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-[#111e14]/98 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-2xl">💾</span>
          <div>
            <h2 id="session-recovery-title" className="text-base font-bold text-white">
              अधूरा सत्र मिला (Saved Session Found)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {savedAt} पर सहेजा गया
            </p>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-emerald-950/60 border border-emerald-700/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-200">पुष्टि किए गए उत्तर</span>
            <span className="font-bold text-white">{confirmedCount} field{confirmedCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {savedSession.confirmedFields.slice(0, 5).map((f) => (
              <span
                key={f.fieldId}
                className="text-[11px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 px-2 py-0.5 rounded-full"
              >
                ✓ {f.fieldId}
              </span>
            ))}
            {confirmedCount > 5 && (
              <span className="text-[11px] text-slate-400">
                +{confirmedCount - 5} more
              </span>
            )}
          </div>
        </div>

        {/* Safety Note */}
        <p className="text-xs text-slate-400">
          🔒 कोई भी डेटा बिना आपकी सहमति के जमा नहीं होगा। आप सभी उत्तरों की समीक्षा कर सकते हैं।
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            id="session-recovery-resume"
            type="button"
            onClick={() => onResume(savedSession)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg"
          >
            ▶ वहीं से जारी रखें
          </button>
          <button
            id="session-recovery-discard"
            type="button"
            onClick={onDiscard}
            className="flex-1 bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 font-semibold py-3 rounded-xl text-sm transition-all border border-white/10"
          >
            🔄 नया शुरू करें
          </button>
        </div>
      </div>
    </div>
  );
};
