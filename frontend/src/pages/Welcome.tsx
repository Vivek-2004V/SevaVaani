import React from 'react';
import { SylvaLivingWorldScene } from '../effects/sylva-living-world/SylvaLivingWorldScene';

export interface WelcomeProps {
  onStartVoice: () => void;
  onOpenJudgeMode: () => void;
}

export const Welcome: React.FC<WelcomeProps> = ({
  onStartVoice,
  onOpenJudgeMode
}) => {
  const trustCards = [
    {
      title: '11 भारतीय भाषाएं',
      desc: 'हिन्दी, मराठी, বাংলা, தமிழ், తెలుగు, ಕನ್ನಡ, ગુજરાતી, മലയാളം, ਪੰਜਾਬੀ, ଓଡ଼ିଆ',
      icon: '🇮🇳'
    },
    {
      title: 'Step-by-step Voice',
      desc: 'एक समय में केवल एक प्रश्न (Zero Cognitive Load)',
      icon: '📋'
    },
    {
      title: 'Answer Confirmation',
      desc: 'बिना पुष्टि के कुछ भी दर्ज नहीं (Zero Silent Commits)',
      icon: '🛡️'
    },
    {
      title: 'Text & Human Help',
      desc: 'अस्पष्टता पर ऑपरेटर सहायता (Never Leaves You Stuck)',
      icon: '🤝'
    },
    {
      title: 'Low Internet Mode',
      desc: '2G/3G नेटवर्क पर भी सुचारू संचालन (Bandwidth Efficient)',
      icon: '⚡'
    }
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden text-slate-800">
      {/* 3D Sylva Living World Scene Background (Full Viewport) */}
      <div className="absolute inset-0 z-0">
        <SylvaLivingWorldScene variant="living-green" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-950/60 pointer-events-none" />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center text-blue-600 font-extrabold text-xl">
            स
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-md">
              SEVA VAANI <span className="text-xs font-normal text-emerald-300 ml-1">सेवा वाणी</span>
            </h1>
            <p className="text-[11px] text-slate-200 font-medium tracking-wide">
              Pan-India Multilingual Voice Digital Citizen Assistance
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenJudgeMode}
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 transition-colors flex items-center gap-1.5 shadow"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Judge Metrics</span>
        </button>
      </header>

      {/* Center Hero Card */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 text-center my-auto">
        <div className="inline-block px-4 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold mb-4 shadow">
          11 भारतीय भाषाओं में बोलकर फॉर्म भरें • Digital Seva Counter
        </div>

        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-lg mb-4">
          आवाज़ आपकी, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-200">
            सरकारी सेवा हमारी।
          </span>
        </h2>

        <p className="text-base md:text-xl text-slate-100 max-w-2xl mx-auto font-light leading-relaxed drop-shadow mb-8">
          कठिन फॉर्म और भाषा की दीवार छोड़ें। अपनी मातृभाषा (हिन्दी, मराठी, বাংলা, தமிழ், తెలుగు, ಕನ್ನಡ, ગુજરાતી, आदि) में बोलें और छात्रवृत्ति का आवेदन मिनटों में पूरा करें।
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
            onClick={onStartVoice}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-semibold text-base backdrop-blur-md border border-white/30 transition-colors"
          >
            डेमो देखें (Watch Demo)
          </button>
        </div>
      </main>

      {/* Bottom 5 Trust Cards */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-8 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {trustCards.map((card, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/10 text-white shadow-lg text-left"
            >
              <div className="text-xl mb-1">{card.icon}</div>
              <h3 className="font-bold text-xs md:text-sm text-emerald-300">
                {card.title}
              </h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
