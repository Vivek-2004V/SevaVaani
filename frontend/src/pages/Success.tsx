import React from 'react';
import { SupportedLanguage } from '../types';

export interface SuccessProps {
  applicationId: string;
  language: SupportedLanguage;
  onHome: () => void;
  onOpenJudgeMode: () => void;
}

export const Success: React.FC<SuccessProps> = ({
  applicationId,
  language,
  onHome,
  onOpenJudgeMode
}) => {
  const getHeading = () => {
    const headings: Record<SupportedLanguage, string> = {
      hi: 'आवेदन सफलतापूर्वक जमा हो गया!',
      mr: 'अर्ज यशस्वीरित्या सादर करण्यात आला आहे!',
      bn: 'আবেদন সফলভাবে জমা দেওয়া হয়েছে!',
      te: 'దరఖాస్తు విజయవంతంగా సమర్పించబడింది!',
      ta: 'விண்ணப்பம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!',
      gu: 'અરજી સફળતાપૂર્વક સબમિટ થઈ ગઈ છે!',
      kn: 'ಅರ್ಜಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ!',
      ml: 'അപേക്ഷ വിജയകരമായി സമർപ്പിച്ചു!',
      pa: 'ਅਰਜ਼ੀ ਸਫਲਤਾਪੂਰਵਕ ਜਮ੍ਹਾਂ ਹੋ ਗਈ ਹੈ!',
      or: 'ଆବେଦନ ସଫଳତାର ସହ ଦାଖଲ ହୋଇଛି!',
      en: 'Application Submitted Successfully!'
    };
    return headings[language] || headings.en;
  };

  const getSubtext = () => {
    const subtexts: Record<SupportedLanguage, string> = {
      hi: 'आपकी छात्रवृत्ति का आवेदन आधिकारिक रूप से दर्ज कर लिया गया है। आपको पावती संदेश आपके मोबाइल नंबर पर भी प्राप्त होगा।',
      mr: 'आपला शिष्यवृत्ती अर्ज अधिकृतपणे नोंदवला गेला आहे. पावतीचा संदेश आपल्या मोबाईल क्रमांकावर पाठवला जाईल.',
      bn: 'আপনার স্কলারশিপের আবেদন আনুষ্ঠানিকভাবে গ্রহণ করা হয়েছে। আপনার মোবাইল নম্বরে রসিদ পাঠানো হয়েছে।',
      te: 'మీ స్కాలర్‌షిప్ దరఖాస్తు అధికారికంగా నమోదు చేయబడింది. మీ మొబైల్‌కు రసీదు పంపబడుతుంది.',
      ta: 'உங்கள் உதவித்தொகை விண்ணப்பம் முறையாக பதிவு செய்யப்பட்டது. ரசீது உங்கள் கைபேசிக்கு அனுப்பப்படும்.',
      gu: 'તમારી શિષ્યવૃત્તિ અરજી નોંધાઈ ગઈ છે. પહોંચ તમારા મોબાઇલ પર મોકલવામાં આવશે.',
      kn: 'ನಿಮ್ಮ ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಜಿಯನ್ನು ಅಧಿಕೃತವಾಗಿ ದಾಖಲಿಸಲಾಗಿದೆ. ರಶೀದಿಯನ್ನು ಮೊಬೈಲ್ ಸಂಖ್ಯೆಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.',
      ml: 'നിങ്ങളുടെ സ്കോളർഷിപ്പ് അപേക്ഷ രജിസ്റ്റർ ചെയ്തു. രസീത് മൊബൈൽ നമ്പറിലേക്ക് അയക്കും.',
      pa: 'ਤੁਹਾਡੀ ਵਜ਼ੀਫ਼ਾ ਅਰਜ਼ੀ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ। ਰਸੀਦ ਤੁਹਾਡੇ ਮੋਬਾਈਲ ਤੇ ਭੇਜੀ ਜਾਵੇਗੀ।',
      or: 'ଆପଣଙ୍କ ବୃତ୍ତି ଆବେଦନ ପଞ୍ଜୀକୃତ ହୋଇଛି। ରସିଦ ମୋବାଇଲକୁ ପଠାଯିବ।',
      en: 'Your scholarship application has been officially recorded. An SMS receipt has been dispatched to your registered mobile.'
    };
    return subtexts[language] || subtexts.en;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 flex flex-col justify-between p-6 text-slate-800">
      <header className="max-w-xl mx-auto w-full flex items-center justify-end">
        <button
          type="button"
          onClick={onOpenJudgeMode}
          className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
        >
          View Judge Metrics →
        </button>
      </header>

      <main className="max-w-md mx-auto w-full text-center my-auto py-8">
        {/* Animated Celebration Icon */}
        <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-xl border-4 border-emerald-300 animate-bounce">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">
          {getHeading()}
        </h2>

        <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto mb-6">
          {getSubtext()}
        </p>

        {/* Application ID Card */}
        <div className="p-4 bg-white/95 rounded-2xl border-2 border-emerald-300 shadow-md mb-6">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            आवेदन संदर्भ क्रमांक (Application ID)
          </span>
          <span className="text-xl md:text-2xl font-mono font-black text-emerald-800 mt-1 block">
            {applicationId}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            दिनांक: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onHome}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-95 text-sm"
          >
            मुख्य पृष्ठ पर लौटें (Back to Home)
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-2xl border border-slate-300 shadow-sm text-sm"
          >
            रसीद प्रिंट करें (Print Receipt)
          </button>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-2">
        SEVA VAANI • Digital India Public Assistance • Pan-India Voice
      </footer>
    </div>
  );
};

export default Success;
