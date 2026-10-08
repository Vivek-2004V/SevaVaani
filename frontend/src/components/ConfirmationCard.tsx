import React from 'react';

export interface ConfirmationCardProps {
  fieldName: string;
  fieldLabel: string;
  candidateValue: string;
  confirmMessage?: string;
  language: 'hi' | 'mr' | 'en';
  onConfirm: () => void;
  onChange: () => void;
  onRetry: () => void;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  fieldName,
  fieldLabel,
  candidateValue,
  confirmMessage,
  language,
  onConfirm,
  onChange,
  onRetry
}) => {
  const getDefaultMessage = () => {
    if (confirmMessage) return confirmMessage;
    if (language === 'hi') {
      return `क्या ${fieldLabel}: "${candidateValue}" सही है?`;
    }
    if (language === 'mr') {
      return `काय ${fieldLabel}: "${candidateValue}" बरोबर आहे का?`;
    }
    return `Is ${fieldLabel}: "${candidateValue}" correct?`;
  };

  const getYesLabel = () => {
    if (language === 'hi') return 'हाँ, सही है (Yes, correct)';
    if (language === 'mr') return 'होय, बरोबर आहे (Yes)';
    return 'Yes, Correct';
  };

  const getChangeLabel = () => {
    if (language === 'hi') return 'नहीं, बदलें (Change)';
    if (language === 'mr') return 'नाही, बदला (Change)';
    return 'No, Change';
  };

  const getRetryLabel = () => {
    if (language === 'hi') return 'दोबारा बोलें (Speak Again)';
    if (language === 'mr') return 'पुन्हा बोला (Speak Again)';
    return 'Speak Again';
  };

  return (
    <div className="w-full max-w-xl mx-auto my-4 p-5 bg-white/95 backdrop-blur-md rounded-3xl border-2 border-blue-400 shadow-xl animate-fade-in">
      <div className="text-center mb-4">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
          {fieldLabel}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-1">
          {candidateValue}
        </h3>
        <p className="text-sm md:text-base text-slate-600 mt-2 font-medium">
          {getDefaultMessage()}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
        <button
          type="button"
          onClick={onConfirm}
          className="flex items-center justify-center gap-1.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-md transition-transform active:scale-95 focus:ring-4 focus:ring-emerald-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm">{getYesLabel()}</span>
        </button>

        <button
          type="button"
          onClick={onChange}
          className="flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl border border-slate-300 transition-transform active:scale-95"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-sm">{getChangeLabel()}</span>
        </button>

        <button
          type="button"
          onClick={onRetry}
          className="flex items-center justify-center gap-1.5 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-2xl border border-amber-300 transition-transform active:scale-95"
        >
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm">{getRetryLabel()}</span>
        </button>
      </div>
    </div>
  );
};

export default ConfirmationCard;
