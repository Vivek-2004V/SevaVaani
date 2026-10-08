import React, { useState } from 'react';
import { SylvaLivingWorldScene } from '../effects/sylva-living-world/SylvaLivingWorldScene';
import { SevaVaaniLogo } from '../components/SevaVaaniLogo';
import logoImg from '../assets/seva-vaani-logo.png';

export interface WelcomeProps {
  onStartVoice: () => void;
  onOpenJudgeMode: () => void;
}

export type WelcomeTab = 'home' | 'how-it-works' | 'services' | 'stories' | 'help';

export const Welcome: React.FC<WelcomeProps> = ({
  onStartVoice,
  onOpenJudgeMode
}) => {
  const [activeTab, setActiveTab] = useState<WelcomeTab>('home');

  const navTabs: { id: WelcomeTab; labelHi: string; labelEn: string }[] = [
    { id: 'home', labelHi: 'मुख्य पृष्ठ', labelEn: 'Home' },
    { id: 'how-it-works', labelHi: 'काम कैसे करता है?', labelEn: 'How It Works' },
    { id: 'services', labelHi: 'सरकारी योजनाएं', labelEn: 'Services' },
    { id: 'stories', labelHi: 'नागरिकों की आवाज़', labelEn: 'Citizen Stories' },
    { id: 'help', labelHi: 'सहायता केंद्र', labelEn: 'Operator Help' }
  ];

  const trustCards = [
    {
      title: '11 मातृभाषाओं में अपनापन',
      desc: 'हिन्दी, मराठी, বাংলা, தமிழ், తెలుగు সহ अपनी बोली में बात करें — कोई अंग्रेजी की मजबूरी नहीं।',
      icon: '🗣️'
    },
    {
      title: 'एक समय में एक सरल बात',
      desc: 'न कोई उलझाऊ फॉर्म, न आँखों पर जोर। एक समय में सिर्फ एक सीधा सवाल पूछा जाता है।',
      icon: '📋'
    },
    {
      title: 'आपकी "हाँ" पर ही आगे बढ़ेगा',
      desc: 'जो आपने कहा, वही दोहराया जाएगा। जब तक आप पुष्टि न करें, कुछ भी दर्ज नहीं होगा।',
      icon: '🛡️'
    },
    {
      title: 'अटकने पर सच्चा सहारा',
      desc: 'आवाज़ में दिक्कत हो तो लिखकर बताएं या गाँव के सेवा ऑपरेटर से तुरंत मदद पाएं।',
      icon: '🤝'
    },
    {
      title: 'धीमे 2G/3G नेटवर्क पर भी पक्का',
      desc: 'कमजोर इंटरनेट में भी आपकी मेहनत व्यर्थ नहीं जाएगी। हर दर्ज जानकारी पूरी तरह सुरक्षित।',
      icon: '⚡'
    }
  ];

  const citizenStories = [
    {
      name: 'अंजलि पाटिल',
      location: 'कोल्हापुर, महाराष्ट्र',
      role: 'प्रथम वर्ष बी.एससी छात्रा',
      quote: 'हमारे परिवार में पहली बार कोई डिग्री कॉलेज जा रहा है। साइबर कैफ़े वाले फॉर्म भरने के 300 रुपये मांगते थे। सेवा वाणी पर मैंने सिर्फ मराठी में बोलकर पूरा फॉर्म भर लिया — एक भी रुपया खर्च नहीं हुआ!',
      service: 'पोस्ट-मैट्रिक छात्रवृत्ति योजना'
    },
    {
      name: 'रमेश विश्वकर्मा',
      location: 'सतना, मध्य प्रदेश',
      role: 'कारीगर व अभिभावक',
      quote: 'मुझे अंग्रेजी पढ़ना-लिखना नहीं आता। सेवा वाणी पर जब माइक दबाया और उसने हिन्दी में पूछा "बेटे का नाम क्या है", तो लगा जैसे गाँव का कोई समझदार साथी सामने बैठकर फॉर्म भरवा रहा है।',
      service: 'कौटुंबिक आय व शिक्षा सहायता'
    },
    {
      name: 'सुनील मुर्मू',
      location: 'बांकुड़ा, पश्चिम बंगाल',
      role: 'पॉलिटेक्निक छात्र',
      quote: 'गाँव में नेटवर्क बहुत धीमा रहता है। पहले ऑनलाइन फॉर्म बार-बार क्रैश हो जाता था। यहाँ जब तक मैंने खुद सुनकर "हाँ, सही है" नहीं कहा, तब तक कुछ भी आगे नहीं बढ़ा। कोई गलती होने का डर ही नहीं रहा।',
      service: 'तकनीकी शिक्षा छात्रवृत्ति'
    }
  ];

  const howItWorksSteps = [
    {
      step: '01',
      title: 'अपनी पसंदीदा भाषा चुनें',
      desc: 'हिन्दी, मराठी, बंगाली, तमिल, तेलुगु या जिस भी भाषा में आप घर पर बात करते हैं — उसी में बातचीत शुरू करें।'
    },
    {
      step: '02',
      title: 'माइक दबाकर सीधे बोलें',
      desc: 'जैसे किसी सेवा केंद्र के सहायक से बात कर रहे हों। नाम, कॉलेज, कक्षा या मोबाइल नंबर बिना झिझक के बताएं।'
    },
    {
      step: '03',
      title: 'सुनें और तसल्ली से पुष्टि करें',
      desc: 'सहायक आपके उत्तर को दोहराएगा। यदि सही है तो "हाँ, सही है" कहें। यदि कोई सुधार है, तो तुरंत दोबारा बोलें।'
    },
    {
      step: '04',
      title: 'अंतिम सहमति और सरकारी रसीद',
      desc: 'पूरा फॉर्म एक नजर में देखें, अपनी स्वीकृति दें और तुरंत आधिकारिक आवेदन क्रमांक (Application ID) पाएं।'
    }
  ];

  const publicServices = [
    {
      title: 'पोस्ट-मैट्रिक छात्रवृत्ति (Scholarship)',
      dept: 'उच्च शिक्षा व सामाजिक न्याय विभाग',
      desc: '11वीं, 12वीं, आईटीआई, पॉलिटेक्निक, बीए, बीएससी, बीटेक और मेडिकल विद्यार्थियों के लिए शुल्क प्रतिपूर्ति व भत्ता।',
      status: 'सक्रिय (Live Application Available)',
      highlight: true
    },
    {
      title: 'वार्षिक आय प्रमाण पत्र (Income Certificate)',
      dept: 'राजस्व विभाग (तहसीलदार कार्यालय)',
      desc: 'सरकारी योजनाओं, शुल्क छूट और छात्रवृत्ति के लिए आवश्यक पारिवारिक आय का आधिकारिक प्रमाण पत्र।',
      status: 'आगामी सेवा (Coming Soon)',
      highlight: false
    },
    {
      title: 'जाति व सामाजिक वर्ग प्रमाण पत्र (Caste Certificate)',
      dept: 'सामाजिक कल्याण विभाग',
      desc: 'आरक्षण, छात्रावास और विशेष योजनाओं का लाभ लेने हेतु वैध जाति प्रमाण पत्र।',
      status: 'आगामी सेवा (Coming Soon)',
      highlight: false
    },
    {
      title: 'मूल निवास प्रमाण पत्र (Domicile Certificate)',
      dept: 'सामान्य प्रशासन विभाग',
      desc: 'राज्य में स्थायी नागरिकता और राज्य-स्तरीय भर्ती/प्रवेश के लिए जरूरी प्रमाण पत्र।',
      status: 'आगामी सेवा (Coming Soon)',
      highlight: false
    }
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden text-slate-800">
      {/* 3D Sylva Living World Scene Background (Full Viewport) */}
      <div className="absolute inset-0 z-0">
        <SylvaLivingWorldScene variant="living-green" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/35 to-slate-950/80 pointer-events-none" />
      </div>

      {/* Floating Island Navbar (Adopted from Image 1 Visual Style + Image 2 Content) */}
      <header className="relative z-30 w-full pt-4 md:pt-6 px-3 flex justify-center">
        <nav
          className="flex items-center justify-between gap-2.5 md:gap-5 p-1.5 md:p-2 rounded-full bg-black/85 backdrop-blur-2xl border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)] max-w-full overflow-x-auto no-scrollbar select-none"
          role="navigation"
          aria-label="Main Navigation"
        >
          {/* 1. Left: Brand Icon + Logo Name (Image 1 Style) */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 pl-1.5 pr-2 py-0.5 cursor-pointer group flex-shrink-0"
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]">
              <img
                src={logoImg}
                alt="SEVA VAANI"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs md:text-sm font-black tracking-tight text-white whitespace-nowrap group-hover:text-emerald-300 transition-colors font-sans leading-none">
                SEVA VAANI
              </span>
              <span className="text-[9px] font-semibold text-emerald-400/90 tracking-wider">
                सेवा वाणी
              </span>
            </div>
          </div>

          {/* Subtle vertical divider */}
          <div className="h-4 w-px bg-white/15 flex-shrink-0 hidden md:block" />

          {/* 2. Middle: Navigation Tabs (Exact Image 2 Content & Active Pill Styling) */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 md:px-3.5 py-1 md:py-1.5 rounded-full text-xs transition-all duration-200 flex flex-col items-center leading-tight whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'bg-white text-slate-950 font-bold shadow-md scale-102'
                      : 'text-slate-300 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  <span className="text-[11px] md:text-xs font-semibold">{tab.labelHi}</span>
                  <span
                    className={`text-[9px] md:text-[10px] leading-none ${
                      isActive ? 'text-slate-600 font-medium' : 'text-slate-400 font-normal'
                    }`}
                  >
                    {tab.labelEn}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Subtle vertical divider */}
          <div className="h-4 w-px bg-white/15 flex-shrink-0 hidden md:block" />

          {/* 3. Right: CTA Button (Exact Image 1 High-Contrast Pill Button) */}
          <div className="flex-shrink-0 pr-1">
            <button
              type="button"
              onClick={onOpenJudgeMode}
              className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>तकनीकी मैट्रिक्स</span>
              <span className="text-[10px] text-slate-500 font-medium hidden lg:inline">(Metrics)</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Dynamic Content based on Active Tab */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-6 my-auto w-full">
        {/* ===================== TAB 1: HOME ===================== */}
        {activeTab === 'home' && (
          <div className="text-center animate-fade-in">
            <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-emerald-200 text-xs font-semibold mb-4 shadow">
              🌿 गाँव-गाँव, घर-घर सहज सेवा • बिना किसी साइबर कैफ़े के चक्कर
            </div>

            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-lg mb-4">
              आवाज़ आपकी, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200">
                अधिकार आपका, सहयोग हमारा।
              </span>
            </h2>

            {/* Humanized, Empathetic Citizen Description */}
            <p className="text-base md:text-xl text-slate-100 max-w-3xl mx-auto font-normal leading-relaxed drop-shadow mb-8">
              कॉलेज की छात्रवृत्ति हो या जरूरी सरकारी प्रमाण पत्र — अब जटिल नियमों और कठिन अंग्रेजी फॉर्म के डर को भूल जाइए। जैसे घर के किसी जिम्मेदार बड़े से बात करते हैं, वैसे ही अपनी सहज मातृभाषा में बोलें। हर जानकारी को तसल्ली से सुनकर जांचिए और बिना किसी संकोच के अपना आवेदन पूरा कीजिए।
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <button
                type="button"
                onClick={onStartVoice}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-xl shadow-blue-900/40 transition-transform active:scale-95 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>बोलकर शुरू करें (Start with Voice)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('how-it-works')}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-semibold text-base backdrop-blur-md border border-white/30 transition-colors"
              >
                यह कैसे काम करता है? (Learn More)
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: HOW IT WORKS ===================== */}
        {activeTab === 'how-it-works' && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 text-white shadow-2xl animate-fade-in">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider">
                सरल 4 चरणों की यात्रा (Step-by-step Flow)
              </span>
              <h3 className="text-2xl md:text-3xl font-black mt-3">
                जैसे किसी अपने मददगार से बात कर रहे हों
              </h3>
              <p className="text-xs md:text-sm text-slate-300 mt-2">
                सेवा वाणी में कोई रोबोटिक उलझन नहीं है। यह प्रक्रिया पूरी तरह पारदर्शी और आपके नियंत्रण में है।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {howItWorksSteps.map((step) => (
                <div key={step.step} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 font-black text-lg flex items-center justify-center flex-shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-300">{step.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={onStartVoice}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg transition-transform active:scale-95"
              >
                अभी बोलकर आज़माएँ (Try Voice Assistant Now) →
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: SERVICES ===================== */}
        {activeTab === 'services' && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 text-white shadow-2xl animate-fade-in">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider">
                नागरिक कल्याण सेवाएं (Available Public Services)
              </span>
              <h3 className="text-2xl md:text-3xl font-black mt-3">
                हर छात्र और परिवार तक सरकारी मदद
              </h3>
              <p className="text-xs md:text-sm text-slate-300 mt-2">
                छात्रवृत्ति से शुरुआत होकर सभी जरूरी नागरिक प्रमाण पत्र आपकी अपनी भाषा में उपलब्ध कराए जा रहे हैं।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publicServices.map((svc, i) => (
                <div
                  key={i}
                  className={`p-5 rounded-2xl border flex flex-col justify-between ${
                    svc.highlight
                      ? 'bg-blue-900/30 border-blue-400/50 shadow-lg ring-1 ring-blue-400/30'
                      : 'bg-white/5 border-white/10 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400">{svc.dept}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        svc.highlight ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {svc.status}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-white">{svc.title}</h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{svc.desc}</p>
                  </div>

                  {svc.highlight && (
                    <button
                      type="button"
                      onClick={onStartVoice}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold w-fit shadow"
                    >
                      छात्रवृत्ति फॉर्म भरें (Apply Now) →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 4: CITIZEN STORIES ===================== */}
        {activeTab === 'stories' && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 text-white shadow-2xl animate-fade-in">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider">
                सच्चे अनुभव (Real Citizen Voices)
              </span>
              <h3 className="text-2xl md:text-3xl font-black mt-3">
                "अब मुझे किसी के आगे हाथ जोड़ने की जरूरत नहीं"
              </h3>
              <p className="text-xs md:text-sm text-slate-300 mt-2">
                सुनिए उन युवाओं और माता-पिता की जुबानी, जिन्होंने बिना किसी दलाल या साइबर कैफ़े के अपना हक पाया।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {citizenStories.map((story, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="text-2xl mb-2 text-emerald-300">“</div>
                    <p className="text-xs md:text-sm text-slate-200 italic leading-relaxed">
                      {story.quote}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <h5 className="font-bold text-sm text-white">{story.name}</h5>
                    <p className="text-[11px] text-emerald-300">{story.role}</p>
                    <p className="text-[10px] text-slate-400">{story.location} • {story.service}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 5: OPERATOR & HELP ===================== */}
        {activeTab === 'help' && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 text-white shadow-2xl animate-fade-in">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-3 py-1 rounded-full uppercase tracking-wider">
                हमेशा आपका साथ (Human Safety Net)
              </span>
              <h3 className="text-2xl md:text-3xl font-black mt-3">
                तकनीक जहाँ रुकेगी, इंसान वहाँ हाथ थामेगा
              </h3>
              <p className="text-xs md:text-sm text-slate-300 mt-2">
                सेवा वाणी का मूल मंत्र है — कोई भी नागरिक कभी भी बीच में अधूरा नहीं छूटेगा।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-2xl mb-2">✍️</div>
                <h4 className="font-bold text-sm text-white">लिखकर बताने की सुविधा</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  यदि माइक में कोई शोर हो या आवाज़ पकड़ में न आए, तो आप कीबोर्ड से भी उत्तर टाइप कर सकते हैं।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-2xl mb-2">🎫</div>
                <h4 className="font-bold text-sm text-white">तत्काल सहायता टिकट</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  एक क्लिक में सहायता अनुरोध दर्ज होता है। आपका भरा हुआ डेटा पूरी तरह सुरक्षित रहता है।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-2xl mb-2">🧑‍💼</div>
                <h4 className="font-bold text-sm text-white">सीएससी / वीएलई ऑपरेटर</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  गाँव के डिजिटल सेवा केंद्र के ऑपरेटर को आपकी समस्या की सूचना तुरंत भेजी जाती है।
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={onStartVoice}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-transform active:scale-95"
              >
                विश्वास के साथ आवेदन शुरू करें (Start Application) →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom 5 Trust Cards (Always visible on Home, or accessible as quick trust anchors) */}
      {activeTab === 'home' && (
        <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-6 pb-6 pt-2 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {trustCards.map((card, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-slate-900/65 backdrop-blur-md border border-white/15 text-white shadow-lg text-left hover:border-emerald-400/40 transition-colors"
              >
                <div className="text-xl mb-1">{card.icon}</div>
                <h3 className="font-bold text-xs md:text-sm text-emerald-300 leading-snug">
                  {card.title}
                </h3>
                <p className="text-[10px] md:text-[11px] text-slate-300 mt-1 leading-snug">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
};

export default Welcome;
