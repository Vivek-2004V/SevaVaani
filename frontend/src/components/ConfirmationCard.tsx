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
