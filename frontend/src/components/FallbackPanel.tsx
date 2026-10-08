import React, { useState } from 'react';

export interface FallbackPanelProps {
  fieldName: string;
  fieldLabel: string;
  language: 'hi' | 'mr' | 'en';
  onRetryVoice: () => void;
  onSubmitText: (text: string) => void;
  onRequestHelp: () => void;
  helpTicketId?: string | null;
}

export const FallbackPanel: React.FC<FallbackPanelProps> = ({
  fieldName,
  fieldLabel,
  language,
  onRetryVoice,
  onSubmitText,
  onRequestHelp,
  helpTicketId
}) => {
  const [typedText, setTypedText] = useState('');
  const [showTypeInput, setShowTypeInput] = useState(false);

  const getHeading = () => {
    if (language === 'hi') return 'आवाज़ समझने में थोड़ी कठिनाई हुई';
    if (language === 'mr') return 'आवाज समजण्यात अडचण आली';
    return 'Voice was unclear or low confidence';
  };

  const getSubtext = () => {
    if (language === 'hi') return 'चिंता न करें, आपकी दर्ज जानकारी सुरक्षित है। कृपया इनमें से एक चुनें:';
    if (language === 'mr') return 'काळजी करू नका, भरलेली माहिती सुरक्षित आहे. खालील पर्याय निवडा:';
    return 'Do not worry, your saved fields are preserved. Please choose an option:';
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedText.trim()) {
      onSubmitText(typedText.trim());
      setTypedText('');
      setShowTypeInput(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto my-4 p-5 bg-amber-50/95 border-2 border-amber-300 rounded-3xl shadow-lg animate-fade-in text-slate-800">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-base md:text-lg text-amber-900">
            {getHeading()}
          </h4>
          <p className="text-xs md:text-sm text-amber-800 mt-0.5">
            {getSubtext()}
          </p>
        </div>
      </div>

      {helpTicketId ? (
        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-center">
          <p className="text-emerald-800 font-bold text-base">
            सहायक अनुरोध दर्ज (Human Help Ticket Generated)
          </p>
          <p className="text-emerald-700 text-sm mt-1">
            टिकट क्रमांक: <span className="font-mono font-bold">{helpTicketId}</span>
          </p>
          <p className="text-xs text-emerald-600 mt-2">
            आपकी सभी प्रविष्टियां सुरक्षित हैं। एक ऑपरेटर जल्द ही संपर्क करेगा।
          </p>
        </div>
      ) : showTypeInput ? (
        <form onSubmit={handleTextSubmit} className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {fieldLabel} लिखकर दर्ज करें (Type Answer):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="यहाँ उत्तर लिखें..."
              autoFocus
              className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
            <button
              type="submit"
              disabled={!typedText.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              पुष्टि करें (Save)
            </button>
            <button
              type="button"
              onClick={() => setShowTypeInput(false)}
              className="px-3 py-2.5 bg-slate-200 text-slate-600 font-medium rounded-xl text-sm"
            >
              रद्द करें
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          <button
            type="button"
            onClick={onRetryVoice}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-transform active:scale-95"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span>दोबारा बोलें (Speak Again)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTypeInput(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-transform active:scale-95"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>लिखकर बताएं (Type)</span>
          </button>

          <button
            type="button"
            onClick={onRequestHelp}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-transform active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>मानव सहायता (Human Help)</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FallbackPanel;
