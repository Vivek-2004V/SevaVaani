import React from 'react';

export default function ConfirmationCard({
  candidateValue,
  prompt,
  onConfirm,
  onReject,
  language = 'hi'
}) {
  const isHi = language === 'hi';
  const yesText = isHi ? 'हाँ, सही है' : 'होय, बरोबर आहे';
  const noText = isHi ? 'नहीं, गलत है' : 'नाही, चूक आहे';
  const header = isHi ? 'कृपया पुष्टि करें (Confirmation Gate)' : 'कृपया पुष्टी करा (Confirmation Gate)';

  if (!candidateValue) return null;

  return (
    <div className="bg-white border-2 border-emerald-500 rounded-xl p-4 shadow-md flex flex-col gap-3 my-3">
      <div className="flex items-center gap-2 font-bold text-emerald-700 text-sm">
        <span>🛡️</span> {header}
      </div>

      <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-950 font-bold text-xl px-4 py-2 rounded-r-lg">
        {String(candidateValue)}
      </div>

      <div className="text-sm text-slate-700">
        {prompt || (isHi ? 'क्या यह जानकारी सही है?' : 'ही माहिती बरोबर आहे का?')}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
        >
          <span>✓</span> {yesText}
        </button>
        <button
          type="button"
          onClick={onReject}
          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          <span>✕</span> {noText}
        </button>
      </div>
    </div>
  );
}
