import React, { useState } from 'react';
import { SylvaLivingWorldScene } from '../effects/sylva-living-world/SylvaLivingWorldScene';
import { UI_STRINGS } from '../state/sessionStore';

export default function Welcome({
  language,
  onSelectLanguage,
  onStartSession,
  onOpenJudge
}) {
  const [selectedLang, setSelectedLang] = useState(language || 'hi');
  const [selectedService, setSelectedService] = useState('scholarship');
  const [stage, setStage] = useState('home'); // 'home' | 'language_select' | 'service_select'

  const t = UI_STRINGS[selectedLang] || UI_STRINGS.hi;

  const handleLanguagePick = (langCode) => {
    setSelectedLang(langCode);
    if (onSelectLanguage) onSelectLanguage(langCode);
  };

  const handleStart = () => {
    onStartSession();
  };

  return (
    <div className="relative w-full min-h-[85vh] flex flex-col justify-between items-center rounded-3xl overflow-hidden my-2 shadow-2xl border border-white/20">
      {/* 3D Sylva Living World Background (Three.js r149 authored procedural scene) */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <SylvaLivingWorldScene variant="living-green" />
        {/* Soft glass overlay gradient ensuring text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/60 via-slate-900/40 to-navy-950/80 backdrop-blur-[2px]" />
      </div>

      {/* Main Glassmorphism Content Area */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center text-center my-auto">
        {stage === 'home' && (
          <div className="bg-white/90 backdrop-blur-md border border-white/60 rounded-3xl p-6 sm:p-10 shadow-2xl max-w-2xl w-full">
            <div className="inline-flex items-center gap-2 bg-saffron-50 border border-saffron-200 text-saffron-700 text-xs font-bold px-3 py-1 rounded-full mb-4 shadow-sm">
              <span>🏛️</span> DIGITAL PUBLIC SERVICE ASSISTANT • भारत सरकार पहल
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-navy-900 mb-3 tracking-tight">
              {t.welcomeTitle}
            </h1>

            <p className="text-slate-600 text-sm sm:text-base mb-6 leading-relaxed">
              {t.welcomeSub}
            </p>

            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 text-left mb-6 flex items-start gap-3">
              <span className="text-2xl mt-0.5">🎓</span>
              <div>
                <h3 className="font-bold text-navy-900 text-sm">{t.serviceName}</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {selectedLang === 'hi'
                    ? 'अपनी मातृभाषा में बोलकर 10 सवालों के जवाब दें और डिजिटल छात्रवृत्ति आवेदन पूरा करें।'
                    : 'आपल्या भाषेत बोलून १० प्रश्नांची उत्तरे द्या आणि डिजिटल शिष्यवृत्ती अर्ज पूर्ण करा.'}
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
              <button
                type="button"
                onClick={() => setStage('language_select')}
                className="w-full sm:w-auto bg-gradient-to-r from-saffron-600 to-saffron-500 hover:from-saffron-700 hover:to-saffron-600 text-white font-extrabold text-base px-8 py-3.5 rounded-full shadow-lg shadow-saffron-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>🎙️</span> {selectedLang === 'hi' ? 'आवाज़ से शुरू करें (Start with Voice)' : 'आवाजाने सुरू करा'}
              </button>

              <button
                type="button"
                onClick={onOpenJudge}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-6 py-3.5 rounded-full border border-slate-300 transition flex items-center justify-center gap-2"
              >
                <span>📊</span> {selectedLang === 'hi' ? 'लाइव मेट्रिक्स देखें (Demo)' : 'थेट मेट्रिक्स पहा'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Language Selection Screen */}
        {stage === 'language_select' && (
          <div className="bg-white/95 backdrop-blur-md border border-white/60 rounded-3xl p-6 sm:p-10 shadow-2xl max-w-xl w-full text-left">
            <div className="text-xs font-bold text-saffron-600 uppercase tracking-wider mb-1">
              चरण 1: भाषा का चयन (Select Language)
            </div>
            <h2 className="text-2xl font-black text-navy-900 mb-2">
              आप किस भाषा में बात करना चाहते हैं?
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Select your preferred language. You can also switch languages midway through the form.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleLanguagePick('hi')}
                className={`p-4 rounded-2xl border-2 text-left transition flex items-center justify-between ${
                  selectedLang === 'hi'
                    ? 'border-blue-600 bg-blue-50/80 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="text-base font-extrabold text-navy-900">हिन्दी (Hindi)</div>
                  <div className="text-xs text-slate-500">हिंदी में संवाद करें</div>
                </div>
                {selectedLang === 'hi' && <span className="text-blue-600 text-xl font-bold">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => handleLanguagePick('mr')}
                className={`p-4 rounded-2xl border-2 text-left transition flex items-center justify-between ${
                  selectedLang === 'mr'
                    ? 'border-blue-600 bg-blue-50/80 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="text-base font-extrabold text-navy-900">मराठी (Marathi)</div>
                  <div className="text-xs text-slate-500">मराठीत संवाद साधा</div>
                </div>
                {selectedLang === 'mr' && <span className="text-blue-600 text-xl font-bold">✓</span>}
              </button>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStage('home')}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold"
              >
                ← वापस जाएं
              </button>
              <button
                type="button"
                onClick={() => setStage('service_select')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm px-6 py-2.5 rounded-full shadow transition"
              >
                आगे बढ़ें (Continue) →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Service Selection Screen */}
        {stage === 'service_select' && (
          <div className="bg-white/95 backdrop-blur-md border border-white/60 rounded-3xl p-6 sm:p-10 shadow-2xl max-w-2xl w-full text-left">
            <div className="text-xs font-bold text-saffron-600 uppercase tracking-wider mb-1">
              चरण 2: सार्वजनिक सेवा चुनें (Select Public Service)
            </div>
            <h2 className="text-2xl font-black text-navy-900 mb-4">
              {selectedLang === 'hi' ? 'आप किस सेवा का लाभ लेना चाहते हैं?' : 'आपण कोणत्या सेवेचा लाभ घेऊ इच्छिता?'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {/* P0 Active Service */}
              <div
                onClick={() => setSelectedService('scholarship')}
                className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/80 cursor-pointer shadow-sm"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xl">🎓</span>
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">सक्रिय (Active MVP)</span>
                </div>
                <div className="text-sm font-extrabold text-navy-900">{t.serviceName}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {selectedLang === 'hi' ? 'पोस्ट-मैट्रिक छात्रवृत्ति योजना (10 फ़ील्ड)' : 'पोस्ट-मॅट्रिक शिष्यवृत्ती योजना (१० माहिती)'}
                </div>
              </div>

              {/* Placeholder 1 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xl">📜</span>
                  <span className="text-[10px] bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded-full">शीघ्र उपलब्ध</span>
                </div>
                <div className="text-sm font-bold text-slate-700">आय प्रमाण पत्र (Income Certificate)</div>
                <div className="text-xs text-slate-500 mt-1">राजस्व विभाग सेवा</div>
              </div>

              {/* Placeholder 2 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xl">📑</span>
                  <span className="text-[10px] bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded-full">शीघ्र उपलब्ध</span>
                </div>
                <div className="text-sm font-bold text-slate-700">जाति प्रमाण पत्र (Caste Certificate)</div>
                <div className="text-xs text-slate-500 mt-1">सामाजिक कल्याण विभाग</div>
              </div>

              {/* Placeholder 3 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xl">🏠</span>
                  <span className="text-[10px] bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded-full">शीघ्र उपलब्ध</span>
                </div>
                <div className="text-sm font-bold text-slate-700">मूल निवास प्रमाण पत्र (Domicile)</div>
                <div className="text-xs text-slate-500 mt-1">नागरिक सेवा केंद्र</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStage('language_select')}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold"
              >
                ← भाषा बदलें
              </button>
              <button
                type="button"
                onClick={handleStart}
                className="bg-gradient-to-r from-saffron-600 to-saffron-500 hover:from-saffron-700 text-white font-extrabold text-sm px-8 py-3 rounded-full shadow-lg transition flex items-center gap-2"
              >
                <span>🎙️</span> {selectedLang === 'hi' ? 'आवेदन शुरू करें' : 'अर्ज सुरू करा'} →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5 Bottom Trust Cards (Section 9.A of UI/UX Document) */}
      <div className="relative z-10 w-full max-w-5xl px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-left">
          <div className="bg-white/80 backdrop-blur-md border border-white/40 p-2.5 rounded-xl shadow-sm">
            <span className="text-lg">🇮🇳</span>
            <div className="text-[11px] font-bold text-navy-900 mt-1">हिंदी + मराठी</div>
            <div className="text-[10px] text-slate-500">स्वाभाविक बोली पहचान</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md border border-white/40 p-2.5 rounded-xl shadow-sm">
            <span className="text-lg">📋</span>
            <div className="text-[11px] font-bold text-navy-900 mt-1">Step-by-step</div>
            <div className="text-[10px] text-slate-500">एक-एक सवाल पर ध्यान</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md border border-white/40 p-2.5 rounded-xl shadow-sm">
            <span className="text-lg">🛡️</span>
            <div className="text-[11px] font-bold text-navy-900 mt-1">Confirmation Gate</div>
            <div className="text-[10px] text-slate-500">Zero Guessing गारंटी</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md border border-white/40 p-2.5 rounded-xl shadow-sm">
            <span className="text-lg">✍️</span>
            <div className="text-[11px] font-bold text-navy-900 mt-1">Text & Help</div>
            <div className="text-[10px] text-slate-500">टाइपिंग व ऑपरेटर टिकट</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md border border-white/40 p-2.5 rounded-xl shadow-sm col-span-2 sm:col-span-1">
            <span className="text-lg">🌐</span>
            <div className="text-[11px] font-bold text-navy-900 mt-1">Low Internet</div>
            <div className="text-[10px] text-slate-500">धीमी गति पर भी सुरक्षित</div>
          </div>
        </div>
      </div>
    </div>
  );
}
