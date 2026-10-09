import React from 'react';
import { SupportedLanguage } from '../types';
import { SevaVaaniLogo } from '../components/SevaVaaniLogo';

export interface SuccessProps {
  applicationId: string;
  language: SupportedLanguage;
  onHome: () => void;
  onOpenJudgeMode: () => void;
  persistenceScope?: string;
  governmentPortalSubmitted?: boolean;
}

export const Success: React.FC<SuccessProps> = ({
  applicationId,
  language,
  onHome,
  onOpenJudgeMode,
  persistenceScope = 'saved_in_backend',
  governmentPortalSubmitted = false
}) => {
  const getHeading = () => {
    if (governmentPortalSubmitted) {
      const headings: Record<SupportedLanguage, string> = {
        hi: 'सरकारी पोर्टल पर आवेदन जमा हो गया!',
        mr: 'सरकारी पोर्टलवर अर्ज सादर झाला!',
        bn: 'সরকারি পোর্টালে আবেদন জমা হয়েছে!',
        te: 'ప్రభుత్వ పోర్టల్‌లో దరఖాస్తు సమర్పించబడింది!',
        ta: 'அரசு போர்ட்டலில் விண்ணப்பம் சமர்ப்பிக்கப்பட்டது!',
        gu: 'સરકારી પોર્ટલ પર અરજી સબમિટ થઈ ગઈ!',
        kn: 'ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಅರ್ಜಿಯನ್ನು ಸಲ್ಲಿಸಲಾಗಿದೆ!',
        ml: 'സർക്കാർ പോർട്ടലിൽ അപേക്ഷ സമർപ്പിച്ചു!',
        pa: 'ਸਰਕਾਰੀ ਪੋਰਟਲ ਤੇ ਅਰਜ਼ੀ ਜਮ੍ਹਾਂ ਹੋ ਗਈ!',
        or: 'ସରକାରୀ ପୋର୍ଟାଲରେ ଆବେଦନ ଦାଖଲ ହୋଇଛି!',
        en: 'Application Submitted to Government Portal!'
      };
      return headings[language] || headings.en;
    }

    const headings: Record<SupportedLanguage, string> = {
      hi: 'आवेदन SEVA VAANI बैकएंड में दर्ज!',
      mr: 'अर्ज SEVA VAANI बॅकएंडमध्ये नोंदवला गेला!',
      bn: 'আবেদন SEVA VAANI ব্যাকএন্ডে সংরক্ষিত হয়েছে!',
      te: 'దరఖాస్తు SEVA VAANI బ్యాకెండ్‌లో నమోదైంది!',
      ta: 'விண்ணப்பம் SEVA VAANI சேமிப்பகத்தில் பதிவானது!',
      gu: 'અરજી SEVA VAANI બેકએન્ડમાં નોંધાઈ ગઈ!',
      kn: 'ಅರ್ಜಿಯು SEVA VAANI ಬ್ಯಾಕೆಂಡ್‌ನಲ್ಲಿ ದಾಖಲಾಗಿದೆ!',
      ml: 'അപേക്ഷ SEVA VAANI ബാക്കെൻഡിൽ രേഖപ്പെടുത്തി!',
      pa: 'ਅਰਜ਼ੀ SEVA VAANI ਬੈਕਐਂਡ ਵਿੱਚ ਦਰਜ ਹੋ ਗਈ!',
      or: 'ଆବେଦନ SEVA VAANI ବ୍ୟାକଏଣ୍ଡରେ ସଂରକ୍ଷିତ ହୋଇଛି!',
      en: 'Application Saved in SEVA VAANI Backend!'
    };
    return headings[language] || headings.en;
  };

  const getSubtext = () => {
    if (governmentPortalSubmitted) {
      return language === 'mr'
        ? 'आपला अर्ज अधिकृत सरकारी पोर्टलवर यशस्वीरित्या पोहोचला आहे.'
        : language === 'en'
        ? 'Your application has been successfully confirmed by the official government portal.'
        : 'आपका आवेदन आधिकारिक सरकारी पोर्टल पर सफलतापूर्वक प्राप्त हो गया है।';
    }

    const subtexts: Record<SupportedLanguage, string> = {
      hi: 'आपका छात्रवृत्ति आवेदन SEVA VAANI के आंतरिक डेटाबेस में सुरक्षित रूप से दर्ज कर लिया गया है। कृपया ध्यान दें: आधिकारिक सरकारी पोर्टल (NSP / MahaDBT) के साथ सीधा लाइव एकीकरण अभी सक्रिय नहीं है; यह आंतरिक रिकॉर्ड है।',
      mr: 'आपला शिष्यवृत्ती अर्ज SEVA VAANI च्या अंतर्गत डेटाबेसमध्ये सुरक्षितपणे नोंदवला गेला आहे. कृपया नोंद घ्या: अधिकृत सरकारी पोर्टल (NSP / MahaDBT) सह थेट लाइव्ह एकत्रीकरण अद्याप सक्रिय नाही; ही अंतर्गत नोंद आहे.',
      bn: 'আপনার স্কলারশিপের আবেদন SEVA VAANI অভ্যন্তরীণ ডাটাবেসে সংরক্ষিত হয়েছে। সরকারি পোর্টালে সরাসরি স্বয়ংক্রিয় সংযোগ এখনও সক্রিয় নয়।',
      te: 'మీ స్కాలర్‌షిప్ దరఖాస్తు SEVA VAANI అంతర్గత డేటాబేస్‌లో సురక్షితంగా నమోదైంది. అధికారిక ప్రభుత్వ పోర్టల్‌తో ప్రత్యక్ష ఏకీకరణ ఇంకా సక్రియం కాలేదు.',
      ta: 'உங்கள் உதவித்தொகை விண்ணப்பம் SEVA VAANI உள் தரவுத்தளத்தில் பாதுகாப்பாக பதிவு செய்யப்பட்டுள்ளது. நேரடி அரசு போர்ட்டல் இணைப்பு இன்னும் நேரலையில் இல்லை.',
      gu: 'તમારી શિષ્યવૃત્તિ અરજી SEVA VAANI આંતરિક ડેટાબેઝમાં સુરક્ષિત રીતે નોંધાઈ છે. સરકારી પોર્ટલ સાથે સીધું જોડાણ હજુ સક્રિય નથી.',
      kn: 'ನಿಮ್ಮ ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಜಿಯನ್ನು SEVA VAANI ಆಂತರಿಕ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ದಾಖಲಿಸಲಾಗಿದೆ. ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ನೊಂದಿಗೆ ನೇರ ಸಂಯೋಜನೆ ಇನ್ನೂ ಸಕ್ರಿಯವಾಗಿಲ್ಲ.',
      ml: 'നിങ്ങളുടെ സ്കോളർഷിപ്പ് അപേക്ഷ SEVA VAANI ആന്തരിക ഡാറ്റാബേസിൽ രേഖപ്പെടുത്തിയിട്ടുണ്ട്. ഔദ്യോഗിക സർക്കാർ പോർട്ടലിലേക്ക് നേരിട്ടുള്ള സംയോജനം നിലവിൽ സജീവമല്ല.',
      pa: 'ਤੁਹਾਡੀ ਵਜ਼ੀਫ਼ਾ ਅਰਜ਼ੀ SEVA VAANI ਅੰਦਰੂਨੀ ਡੇਟਾਬੇਸ ਵਿੱਚ ਦਰਜ ਹੋ ਗਈ ਹੈ। ਸਰਕਾਰੀ ਪੋਰਟਲ ਨਾਲ ਸਿੱਧਾ ਕਨੈਕਸ਼ਨ ਅਜੇ ਚਾਲੂ ਨਹੀਂ ਹੈ।',
      or: 'ଆପଣଙ୍କ ବୃତ୍ତି ଆବେଦନ SEVA VAANI ଆଭ୍ୟନ୍ତରୀଣ ଡାଟାବେସରେ ସଂରକ୍ଷିତ ହୋଇଛି। ସରକାରୀ ପୋର୍ଟାଲ ସହ ସିଧାସଳଖ ସଂଯୋଗ ଏପର୍ଯ୍ୟନ୍ତ ସକ୍ରିୟ ନାହିଁ।',
      en: 'Your scholarship application is recorded in the SEVA VAANI internal database. Note: Direct live submission to official government portals (NSP / MahaDBT) is not active; this is an internal reference record.'
    };
    return subtexts[language] || subtexts.en;
  };

  return (
    <div className="min-h-screen w-full bg-black/45 backdrop-blur-md flex flex-col justify-between p-3.5 sm:p-6 text-white">
      <header className="max-w-xl mx-auto w-full flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <SevaVaaniLogo size={32} showWordmark={true} />
        </div>
        <button
          type="button"
          onClick={onOpenJudgeMode}
          className="text-xs font-semibold text-emerald-200 bg-emerald-950/70 border border-emerald-500/40 px-3.5 py-1.5 rounded-full hover:bg-emerald-900/80 transition-all backdrop-blur-md shadow-sm active:scale-95"
        >
          View Judge Metrics →
        </button>
      </header>

      <main className="max-w-md mx-auto w-full text-center my-auto py-6 sm:py-8 bg-[#121f15]/85 border border-white/15 rounded-3xl p-4 sm:p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
        {/* Animated Icon */}
        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-emerald-950/80 border-4 border-emerald-300/30">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
          {getHeading()}
        </h2>

        {/* Status disclosure pills */}
        <div className="flex flex-col gap-2 my-4">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-emerald-950/70 border border-emerald-500/40 rounded-full text-xs font-bold text-emerald-300">
            <span>●</span>
            <span>स्थिति: SEVA VAANI बैकएंड में सुरक्षित (Saved in Backend)</span>
          </div>
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-500/40 rounded-full text-[11px] font-medium text-amber-200">
            <span>ℹ️</span>
            <span>सरकारी पोर्टल: सीधा एकीकरण उपलब्ध नहीं (Internal Record Only)</span>
          </div>
        </div>

        <p className="text-xs md:text-sm text-emerald-200/80 leading-relaxed max-w-sm mx-auto mb-6">
          {getSubtext()}
        </p>

        {/* Application ID Card */}
        <div className="p-4 bg-black/40 rounded-2xl border border-emerald-500/40 shadow-inner mb-6 text-left">
          <span className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-widest block">
            आंतरिक संदर्भ क्रमांक (Internal Reference ID)
          </span>
          <span className="text-xl md:text-2xl font-mono font-black text-white mt-1 block">
            {applicationId}
          </span>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-white/10 pt-2">
            <span>दिनांक: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span className="text-emerald-400 font-semibold">सत्यापित रिकॉर्ड</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onHome}
            className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-950/60 border border-emerald-300/30 transition-all active:scale-95 text-sm"
          >
            मुख्य पृष्ठ पर लौटें (Back to Home)
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-slate-200 font-semibold rounded-2xl border border-white/15 backdrop-blur-md shadow-sm text-sm transition-all"
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
