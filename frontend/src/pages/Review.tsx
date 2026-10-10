import React, { useState } from 'react';
import { FormField, SupportedLanguage } from '../types';
import { FieldSummary } from '../components/FieldSummary';
import { submitFinalApplication } from '../services/api';
import { SevaVaaniLogo } from '../components/SevaVaaniLogo';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { ConnectionBanner } from '../components/ConnectionBanner';

export interface ReviewProps {
  sessionId: string;
  fields: FormField[];
  language: SupportedLanguage;
  onEditField: (index: number) => void;
  onSubmitSuccess: (applicationId: string, persistenceScope?: string, governmentPortalSubmitted?: boolean) => void;
  onBack: () => void;
}

export const Review: React.FC<ReviewProps> = ({
  sessionId,
  fields,
  language,
  onEditField,
  onSubmitSuccess,
  onBack
}) => {
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const networkStatus = useNetworkStatus();

  const getReviewHeading = () => {
    const headings: Record<SupportedLanguage, string> = {
      hi: 'आवेदन समीक्षा (Final Review)',
      mr: 'अर्जाचे पुनरावलोकन (Final Review)',
      bn: 'আবেদন পর্যালোচনা (Final Review)',
      te: 'దరఖాస్తు సమీక్ష (Final Review)',
      ta: 'விண்ணப்ப மறுஆய்வு (Final Review)',
      gu: 'અરજી સમીક્ષા (Final Review)',
      kn: 'ಅರ್ಜಿ ಪರಿಶೀಲನೆ (Final Review)',
      ml: 'അപേക്ഷാ അവലോകനം (Final Review)',
      pa: 'ਅਰਜ਼ੀ ਦੀ ਸਮੀਖਿਆ (Final Review)',
      or: 'ଆବେଦନ ସମୀକ୍ଷା (Final Review)',
      en: 'Final Application Review'
    };
    return headings[language] || headings.en;
  };

  const getConsentText = () => {
    const consents: Record<SupportedLanguage, string> = {
      hi: 'मैं प्रमाणित करता/करती हूँ कि मेरे द्वारा दी गई सभी जानकारियाँ सत्य एवं सही हैं। मैं छात्रवृत्ति पोर्टल पर इसे जमा करने की स्पष्ट सहमति देता/देती हूँ।',
      mr: 'मी प्रमाणित करतो/करते की मी दिलेली सर्व माहिती खरी आणि योग्य आहे. मी शिष्यवृत्ती पोर्टलवर हा अर्ज सादर करण्यास स्पष्ट संमती देतो/देते.',
      bn: 'আমি নিশ্চিত করছি যে আমার প্রদত্ত সমস্ত তথ্য সঠিক ও সত্য। আমি স্কলারশিপ পোর্টালে এই আবেদনটি জমা দেওয়ার সম্মতি দিচ্ছি।',
      te: 'నేను అందించిన మొత్తం సమాచారం నిజమైనదని మరియు సరైనదని నేను ధృవీకరిస్తున్నాను. స్కాలర్‌షిప్ పోర్టల్‌లో దీనిని సమర్పించడానికి నేను సమ్మతిస్తున్నాను.',
      ta: 'நான் அளித்த தகவல்கள் அனைத்தும் உண்மை என உறுதியளிக்கிறேன். கல்வி உதவித்தொகை தளத்தில் சமர்ப்பிக்க முழு சம்மதம் தெரிவிக்கிறேன்.',
      gu: 'હું પ્રમાણિત કરું છું કે મેં આપેલી તમામ માહિતી સાચી છે. હું શિષ્યવૃત્તિ પોર્ટલ પર આ અરજી જમા કરાવવાની સંમતિ આપું છું.',
      kn: 'ನಾನು ನೀಡಿದ ಎಲ್ಲಾ ಮಾಹಿತಿಯು ಸತ್ಯವಾಗಿದೆ ಎಂದು ಪ್ರಮಾಣೀಕರಿಸುತ್ತೇನೆ. ವಿದ್ಯಾರ್ಥಿವೇತನ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಸಲ್ಲಿಸಲು ಒಪ್ಪಿಗೆ ನೀಡುತ್ತೇನೆ.',
      ml: 'ഞാൻ നൽകിയ വിവരങ്ങൾ സത്യമാണെന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. സ്കോളർഷിപ്പ് പോർട്ടലിൽ ഇത് സമർപ്പിക്കാൻ ഞാൻ സമ്മതിക്കുന്നു.',
      pa: 'ਮੈਂ ਤਸਦੀਕ ਕਰਦਾ ਹਾਂ ਕਿ ਮੇਰੇ ਵੱਲੋਂ ਦਿੱਤੀ ਗਈ ਸਾਰੀ ਜਾਣਕਾਰੀ ਸੱਚੀ ਹੈ। ਮੈਂ ਵਜ਼ੀਫ਼ਾ ਪੋਰਟਲ ਤੇ ਇਸਨੂੰ ਜਮ੍ਹਾਂ ਕਰਨ ਦੀ ਸਹਿਮਤੀ ਦਿੰਦਾ ਹਾਂ।',
      or: 'ମୁଁ ପ୍ରମାଣିତ କରୁଛି ଯେ ମୋ ଦ୍ୱାରା ଦିଆଯାଇଥିବା ସମସ୍ତ ତଥ୍ୟ ସତ୍ୟ। ବୃତ୍ତି ପୋର୍ଟାଲରେ ଏହା ଦାଖଲ କରିବାକୁ ସମ୍ମତି ଦେଉଛି।',
      en: 'I certify that all details provided are true and accurate to the best of my knowledge. I give explicit consent to submit this application to the Scholarship portal.'
    };
    return consents[language] || consents.en;
  };

  const handleSubmit = async () => {
    if (!consentGiven) {
      setSubmitError('कृपया जमा करने से पहले सहमति चेकबॉक्स चुनें.');
      return;
    }

    // Block offline submission — government form data must only be sent with confirmed connectivity
    if (networkStatus.isOffline) {
      setSubmitError(
        language === 'mr'
          ? '📡 इंटरनेट बंद आहे. अर्ज जमा करण्यासाठी इंटरनेट जोडणी आवश्यक आहे. आपचे सर्व उत्तरे सुरक्षित सहेजले आहेत.'
          : language === 'en'
          ? '📡 You are offline. Final submission requires an internet connection. All your answers are saved locally and will not be lost.'
          : '📡 इंटरनेट बंद है। आवेदन जमा करने के लिए इंटरनेट ज़रूरी है। आपके सभी उत्तर सुरक्षित सहेजे गए हैं — कनेक्शन वापस आने पर जमा करें।'
      );
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const formDataObj: Record<string, string> = {};
    fields.forEach((f) => {
      formDataObj[f.id] = f.value || '';
    });

    try {
      const res = await submitFinalApplication(sessionId, true, formDataObj);
      setIsSubmitting(false);
      if (res.success && res.application_id) {
        onSubmitSuccess(res.application_id, res.persistence_scope, res.government_portal_submitted);
      } else {
        if (res.status === 'local_draft_saved') {
          setSubmitError(
            'सर्वर से संपर्क नहीं हो सका। आपका ड्राफ्ट इस डिवाइस पर सुरक्षित है। सर्वर उपलब्ध होने पर पुनः प्रयास करें।'
          );
        } else {
          setSubmitError(res.message || 'जमा करने में समस्या हुई। कृपया पुनः प्रयास करें.');
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err?.message || 'जमा करने में समस्या हुई। कृपया पुनः प्रयास करें.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-black/45 backdrop-blur-md flex flex-col justify-between p-3.5 sm:p-6 text-white">
      <ConnectionBanner status={networkStatus} />
      <header className={`max-w-2xl mx-auto w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 ${networkStatus.isOffline ? 'mt-16' : ''}`}>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-emerald-100 hover:text-white flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-lg shadow-sm transition-all active:scale-95 shrink-0"
        >
          ← वापस (Back)
        </button>
        <div className="flex items-center gap-2">
          <SevaVaaniLogo size={28} showWordmark={false} />
          <span className="text-[11px] sm:text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
            Step 3 of 4: समीक्षा (Review)
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full py-6 my-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {getReviewHeading()}
          </h2>
          <p className="text-xs md:text-sm text-emerald-200/90 mt-1 max-w-lg mx-auto">
            {language === 'mr'
              ? 'सर्व रकाने आवाजाने ऐकून पुष्टी केलेले आहेत. नावांची अचूक स्पेलिंग आधार किंवा अधिकृत ओळखपत्राशी जुळवून घ्या.'
              : language === 'en'
              ? 'All fields verified through conversational voice. Please double-check character spelling for names against official IDs.'
              : 'सभी फ़ील्ड्स आवाज़ से सुने और पुष्टि किए गए हैं। नाम की सटीक वर्तनी (Spelling) अपने आधार कार्ड से अवश्य मिला लें।'}
          </p>
        </div>

        {/* 10 Fields Summary Table */}
        <FieldSummary
          fields={fields}
          language={language}
          onEditField={onEditField}
        />

        {/* Consent Section (Section 9.J) */}
        <div className="mt-5 sm:mt-6 p-4 sm:p-5 bg-[#121f15]/90 backdrop-blur-2xl rounded-3xl border border-emerald-500/40 shadow-2xl lang-devanagari">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              id="checkbox-final-consent"
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => {
                setConsentGiven(e.target.checked);
                if (e.target.checked) setSubmitError(null);
              }}
              className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 rounded text-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-400/60 bg-black/40 border-white/20 accent-emerald-500 shrink-0 cursor-pointer"
            />
            <span className="text-xs sm:text-sm text-emerald-100 leading-relaxed font-medium">
              {getConsentText()}
            </span>
          </label>
        </div>

        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-3 p-3 bg-red-950/80 text-red-200 text-xs sm:text-sm rounded-2xl border border-red-500/40 text-center font-medium backdrop-blur-md"
          >
            {submitError}
          </div>
        )}

        {/* Final Submit Button */}
        <div className="mt-5 sm:mt-6 flex justify-center">
          <button
            type="button"
            id="btn-final-submit"
            onClick={handleSubmit}
            disabled={!consentGiven || isSubmitting || networkStatus.isOffline}
            className={`w-full max-w-md min-h-[48px] px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base md:text-lg shadow-2xl transition-all duration-200 flex items-center justify-center gap-2 border touch-target-44 ${
              consentGiven && !isSubmitting && !networkStatus.isOffline
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white border-emerald-300/40 shadow-emerald-950/80 active:scale-95 cursor-pointer focus-visible:ring-4 focus-visible:ring-emerald-400/60'
                : 'bg-white/10 text-slate-400 border-white/10 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <span>आवेदन भेजा जा रहा है... (Submitting...)</span>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>आवेदन अंतिम रूप से जमा करें (Submit Application)</span>
              </>
            )}
          </button>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-2">
        SEVA VAANI • Zero Silent Commits • Explicit Consent Guaranteed
      </footer>
    </div>
  );
};

export default Review;
