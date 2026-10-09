import React, { useState } from 'react';
import { SupportedLanguage } from '../types';

export interface FallbackPanelProps {
  fieldName: string;
  fieldLabel: string;
  language: SupportedLanguage;
  onRetryVoice: () => void;
  onSubmitText: (text: string) => void;
  onRequestHelp: () => void;
  helpTicketId?: string | null;
  helpError?: string | null;
  externalNotificationSent?: boolean;
}

export const FallbackPanel: React.FC<FallbackPanelProps> = ({
  fieldName,
  fieldLabel,
  language,
  onRetryVoice,
  onSubmitText,
  onRequestHelp,
  helpTicketId,
  helpError,
  externalNotificationSent = false
}) => {
  const [typedText, setTypedText] = useState('');
  const [showTypeInput, setShowTypeInput] = useState(false);

  const getHeading = () => {
    const msgs: Record<SupportedLanguage, string> = {
      hi: 'आवाज़ समझने में थोड़ी कठिनाई हुई',
      mr: 'आवाज समजण्यात अडचण आली',
      bn: 'কথা বুঝতে কিছুটা সমস্যা হয়েছে',
      te: 'వాయిస్ అర్థం చేసుకోవడంలో ఇబ్బంది వచ్చింది',
      ta: 'குரலை புரிந்துகொள்வதில் சற்று சிரமம் ஏற்பட்டது',
      gu: 'અવાજ સમજવામાં થોડી મુશ્કેલી થઈ',
      kn: 'ಧ್ವನಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸ್ವಲ್ಪ ತೊಂದರೆಯಾಯಿತು',
      ml: 'ശബ്ദം മനസ്സിലാക്കാൻ ബുദ്ധിമുട്ടായി',
      pa: 'ਆਵਾਜ਼ ਸਮਝਣ ਵਿੱਚ ਕੁਝ ਔਖਿਆਈ ਆਈ',
      or: 'ସ୍ୱର ବୁଝିବାରେ କିଛି ଅସୁବିଧା ହେଲା',
      en: 'Voice was unclear or low confidence'
    };
    return msgs[language] || msgs.en;
  };

  const getSubtext = () => {
    const msgs: Record<SupportedLanguage, string> = {
      hi: 'चिंता न करें, आपकी दर्ज जानकारी सुरक्षित है। कृपया इनमें से एक चुनें:',
      mr: 'काळजी करू नका, भरलेली माहिती सुरक्षित आहे. खालील पर्याय निवडा:',
      bn: 'চিন্তা করবেন না, আপনার তথ্য সংরক্ষিত আছে। একটি বিকল্প বেছে নিন:',
      te: 'చింతించకండి, మీ సమాచారం సురక్షితంగా ఉంది. ఒక ఎంపికను ఎంచుకోండి:',
      ta: 'கவலைப்பட வேண்டாம், உங்கள் தகவல் பாதுகாப்பாக உள்ளது:',
      gu: 'ચિંતા કરશો નહીં, તમારી માહિતી સુરક્ષિત છે:',
      kn: 'ಚಿಂತಿಸಬೇಡಿ, ನಿಮ್ಮ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿದೆ:',
      ml: 'വിഷമിക്കേണ്ട, നിങ്ങളുടെ വിവരങ്ങൾ സുരക്ഷിതമാണ്:',
      pa: 'ਚਿੰਤਾ ਨਾ ਕਰੋ, ਤੁਹਾਡੀ ਜਾਣਕਾਰੀ ਸੁਰੱਖਿਅਤ ਹੈ:',
      or: 'ଚିନ୍ତା କରନ୍ତୁ ନାହିଁ, ଆପଣଙ୍କ ତଥ୍ୟ ସୁରକ୍ଷିତ ଅଛି:',
      en: 'Do not worry, your saved fields are preserved. Please choose an option:'
    };
    return msgs[language] || msgs.en;
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
    <div className="w-full max-w-xl mx-auto my-4 p-4 sm:p-5 bg-[#172418]/95 border-2 border-amber-400/40 rounded-3xl shadow-2xl backdrop-blur-2xl animate-fade-in text-white">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-base md:text-lg text-amber-200">
            {getHeading()}
          </h4>
          <p className="text-xs md:text-sm text-emerald-100/80 mt-0.5">
            {getSubtext()}
          </p>
        </div>
      </div>

      {helpTicketId ? (
        <div className="mt-4 p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2">
            <span>●</span> आंतरिक संदर्भ रिकॉर्ड (Internal Reference Record)
          </div>
          <p className="text-emerald-300 font-bold text-base">
            सहायता अनुरोध आंतरिक डेटाबेस में दर्ज (Help Request Saved)
          </p>
          <p className="text-emerald-100 text-sm mt-1">
            आंतरिक टिकट क्रमांक: <span className="font-mono font-bold text-emerald-400">{helpTicketId}</span>
          </p>
          <div className="mt-3 p-2.5 bg-black/40 rounded-xl border border-white/10 text-xs text-amber-200/90 text-left">
            <span className="font-semibold block text-amber-300">ℹ️ प्रेषण सूचना (Dispatch Status):</span>
            बाह्य हेल्पडेस्क या ईमेल प्रदाता कॉन्फ़िगर नहीं है; बाह्य सूचना प्रेषित नहीं हुई है। आपकी जानकारी केवल SEVA VAANI स्थानीय सर्वर पर सुरक्षित है।
          </div>
        </div>
      ) : helpError ? (
        <div className="mt-4 p-3 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-center">
          <p className="text-rose-200 text-xs font-semibold">
            ⚠️ {helpError}
          </p>
          <p className="text-[11px] text-rose-300/80 mt-1">
            कोई टिकट उत्पन्न नहीं किया गया। कृपया दोबारा प्रयास करें या उत्तर लिखकर भरें।
          </p>
        </div>
      ) : showTypeInput ? (
        <form onSubmit={handleTextSubmit} className="mt-4">
          <label className="block text-xs font-semibold text-amber-200 mb-1">
            {fieldLabel} लिखकर दर्ज करें (Type Answer):
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="यहाँ उत्तर लिखें..."
              autoFocus
              className="flex-1 px-4 py-2.5 bg-black/50 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none text-white text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="submit"
                disabled={!typedText.trim()}
                className="px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl text-sm hover:bg-emerald-500 disabled:opacity-50 transition-all active:scale-95"
              >
                पुष्टि करें (Save)
              </button>
              <button
                type="button"
                onClick={() => setShowTypeInput(false)}
                className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-slate-300 font-medium rounded-xl text-sm transition-all"
              >
                रद्द करें
              </button>
            </div>
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
