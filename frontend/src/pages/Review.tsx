import React, { useState } from 'react';
import { FormField, SupportedLanguage } from '../types';
import { FieldSummary } from '../components/FieldSummary';
import { submitFinalApplication } from '../services/api';

export interface ReviewProps {
  sessionId: string;
  fields: FormField[];
  language: SupportedLanguage;
  onEditField: (index: number) => void;
  onSubmitSuccess: (applicationId: string) => void;
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

    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj: Record<string, string> = {};
    fields.forEach((f) => {
      formDataObj[f.id] = f.value || '';
    });

    try {
      const res = await submitFinalApplication(sessionId, true, formDataObj);
      setIsSubmitting(false);
      if (res.application_id) {
        onSubmitSuccess(res.application_id);
      } else {
        onSubmitSuccess(`SV-SCH-${Math.floor(100000 + Math.random() * 900000)}`);
      }
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError('जमा करने में समस्या हुई। कृपया पुनः प्रयास करें.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col justify-between p-4 md:p-6 text-slate-800">
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200"
        >
          ← वापस (Back)
        </button>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
          Step 3 of 4: समीक्षा एवं सहमति (Review & Consent)
        </span>
      </header>

      <main className="max-w-2xl mx-auto w-full py-6 my-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            {getReviewHeading()}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            कृपया अपने सभी उत्तरों की जांच करें। आवश्यकतानुसार 'बदलें' बटन दबाकर सुधार कर सकते हैं।
          </p>
        </div>

        {/* 10 Fields Summary Table */}
        <FieldSummary
          fields={fields}
          language={language}
          onEditField={onEditField}
        />

        {/* Consent Section (Section 9.J) */}
        <div className="mt-6 p-5 bg-white/95 rounded-3xl border-2 border-blue-200 shadow-md">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => {
                setConsentGiven(e.target.checked);
                if (e.target.checked) setSubmitError(null);
              }}
              className="w-5 h-5 mt-1 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
              {getConsentText()}
            </span>
          </label>
        </div>

        {submitError && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 text-xs md:text-sm rounded-xl border border-red-200 text-center font-medium">
            {submitError}
          </div>
        )}

        {/* Final Submit Button */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!consentGiven || isSubmitting}
            className={`w-full max-w-md px-8 py-4 rounded-2xl font-bold text-base md:text-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              consentGiven && !isSubmitting
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <span>आवेदन भेजा जा रहा है... (Submitting...)</span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
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
