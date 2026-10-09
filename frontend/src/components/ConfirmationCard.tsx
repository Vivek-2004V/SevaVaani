import React from 'react';
import { SupportedLanguage } from '../types';

export interface ConfirmationCardProps {
  fieldName: string;
  fieldLabel: string;
  candidateValue: string;
  confirmMessage?: string;
  language: SupportedLanguage;
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
    const msgs: Record<SupportedLanguage, string> = {
      hi: `क्या ${fieldLabel}: "${candidateValue}" सही है?`,
      mr: `काय ${fieldLabel}: "${candidateValue}" बरोबर आहे का?`,
      bn: `${fieldLabel}: "${candidateValue}", এটি কি সঠিক?`,
      te: `${fieldLabel}: "${candidateValue}", ఇది సరైనదేనా?`,
      ta: `${fieldLabel}: "${candidateValue}", இது சரியானதா?`,
      gu: `શું ${fieldLabel}: "${candidateValue}" સાચું છે?`,
      kn: `${fieldLabel}: "${candidateValue}", ಇದು ಸರಿಯೇ?`,
      ml: `${fieldLabel}: "${candidateValue}", ഇത് ശരിയാണോ?`,
      pa: `ਕੀ ${fieldLabel}: "${candidateValue}" ਸਹੀ ਹੈ?`,
      or: `କଣ ${fieldLabel}: "${candidateValue}" ସଠିକ କି?`,
      en: `Is ${fieldLabel}: "${candidateValue}" correct?`
    };
    return msgs[language] || msgs.en;
  };

  const getYesLabel = () => {
    const msgs: Record<SupportedLanguage, string> = {
      hi: 'हाँ, सही है (Yes)',
      mr: 'होय, बरोबर (Yes)',
      bn: 'হ্যাঁ, ঠিক আছে (Yes)',
      te: 'అవును, సరైనది (Yes)',
      ta: 'ஆம், சரி (Yes)',
      gu: 'હા, સાચું છે (Yes)',
      kn: 'ಹೌದು, ಸರಿ (Yes)',
      ml: 'അതെ, ശരിയാണ് (Yes)',
      pa: 'ਹਾਂ, ਸਹੀ ਹੈ (Yes)',
      or: 'ହଁ, ସଠିକ (Yes)',
      en: 'Yes, Correct'
    };
    return msgs[language] || msgs.en;
  };

  const getChangeLabel = () => {
    const msgs: Record<SupportedLanguage, string> = {
      hi: 'नहीं, बदलें (Change)',
      mr: 'नाही, बदला (Change)',
      bn: 'না, পরিবর্তন করুন (Change)',
      te: 'కాదు, మార్చండి (Change)',
      ta: 'இல்லை, மாற்றவும் (Change)',
      gu: 'ના, બદલો (Change)',
      kn: 'ಇಲ್ಲ, ಬದಲಾಯಿಸಿ (Change)',
      ml: 'അല്ല, മാറ്റുക (Change)',
      pa: 'ਨਹੀਂ, ਬਦਲੋ (Change)',
      or: 'ନାହିଁ, ବଦଳାନ୍ତୁ (Change)',
      en: 'No, Change'
    };
    return msgs[language] || msgs.en;
  };

  const getRetryLabel = () => {
    const msgs: Record<SupportedLanguage, string> = {
      hi: 'दोबारा बोलें (Speak Again)',
      mr: 'पुन्हा बोला (Speak Again)',
      bn: 'আবার বলুন (Speak Again)',
      te: 'మళ్లీ చెప్పండి (Speak Again)',
      ta: 'மீண்டும் பேசவும் (Speak Again)',
      gu: 'ફરી બોલો (Speak Again)',
      kn: 'ಮತ್ತೆ ಹೇಳಿ (Speak Again)',
      ml: 'വീണ്ടും പറയുക (Speak Again)',
      pa: 'ਦੁਬਾਰਾ ਬੋਲੋ (Speak Again)',
      or: 'ପୁଣି କୁହନ୍ତୁ (Speak Again)',
      en: 'Speak Again'
    };
    return msgs[language] || msgs.en;
  };

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={`${fieldLabel} confirmation`}
      className="w-full max-w-xl mx-auto my-4 p-5 bg-[#121f15]/90 backdrop-blur-2xl rounded-3xl border border-emerald-500/40 shadow-2xl animate-fade-in text-white"
    >
      <div className="text-center mb-4">
        <span className="inline-block px-3.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
          {fieldLabel}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
          {candidateValue}
        </h3>
        <p className="text-sm md:text-base text-emerald-100/90 mt-2 font-medium">
          {getDefaultMessage()}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
        <button
          type="button"
          onClick={onConfirm}
          className="flex items-center justify-center gap-1.5 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-950/50 transition-transform active:scale-95 border border-emerald-300/30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm">{getYesLabel()}</span>
        </button>

        <button
          type="button"
          onClick={onChange}
          className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white/10 hover:bg-white/20 text-slate-200 font-semibold rounded-2xl border border-white/15 backdrop-blur-md transition-transform active:scale-95"
        >
          <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-sm">{getChangeLabel()}</span>
        </button>

        <button
          type="button"
          onClick={onRetry}
          className="flex items-center justify-center gap-1.5 px-4 py-3 bg-amber-950/60 hover:bg-amber-900/70 text-amber-200 font-semibold rounded-2xl border border-amber-500/30 backdrop-blur-md transition-transform active:scale-95"
        >
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm">{getRetryLabel()}</span>
        </button>
      </div>
    </div>
  );
};

export default ConfirmationCard;
