import React, { useState, useEffect } from 'react';
import { SupportedLanguage } from '../types';
import { AuthUser, getUserSavedSessions } from '../services/api';
import { SevaVaaniLogo } from '../components/SevaVaaniLogo';
import { INDIAN_LANGUAGES } from '../components/LanguageSelector';

export interface DashboardProps {
  user: AuthUser;
  onStartVoice: (lang: SupportedLanguage, serviceId?: string) => void;
  onLogout: () => void;
  onOpenExtensionModal: () => void;
  onOpenJudgeMode: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onStartVoice,
  onLogout,
  onOpenExtensionModal,
  onOpenJudgeMode
}) => {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('hi');
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await getUserSavedSessions();
      setSavedSessions(data || []);
    } catch (e) {
      console.warn('Failed to fetch user sessions:', e);
      setSavedSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const services = [
    {
      id: 'scholarship_post_matric',
      name: 'पोस्ट-मैट्रिक छात्रवृत्ति (Scholarship)',
      desc: 'उच्च शिक्षा हेतु सरकारी छात्रवृत्ति सहायता (पूर्णतः सक्रिय)',
      badge: 'Active P0',
      active: true,
      icon: '🎓'
    },
    {
      id: 'income_certificate',
      name: 'आय प्रमाण पत्र (Income Certificate)',
      desc: 'तहसीलदार द्वारा जारी वार्षिक पारिवारिक आय प्रमाण पत्र',
      badge: 'Coming Soon',
      active: false,
      icon: '📄'
    },
    {
      id: 'caste_certificate',
      name: 'जाति प्रमाण पत्र (Caste Certificate)',
      desc: 'ओबीसी, एससी, एसटी श्रेणी सत्यापन प्रमाण पत्र',
      badge: 'Coming Soon',
      active: false,
      icon: '🏛️'
    },
    {
      id: 'domicile_certificate',
      name: 'मूल निवास प्रमाण पत्र (Domicile)',
      desc: 'राज्य में स्थायी निवास का आधिकारिक प्रमाण पत्र',
      badge: 'Coming Soon',
      active: false,
      icon: '📍'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black/50 backdrop-blur-md flex flex-col justify-between p-3.5 sm:p-6 text-white">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto w-full flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <SevaVaaniLogo size={34} showWordmark={true} />
          <span className="hidden sm:inline-block text-[11px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
            नागरिक डैशबोर्ड (Citizen Portal)
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Optional Extension Trigger */}
          <button
            type="button"
            id="btn-dashboard-extension"
            onClick={onOpenExtensionModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full text-xs font-semibold text-emerald-200 transition-all active:scale-95 shadow-sm"
          >
            <span>🧩 एक्सटेंशन से जोड़ें</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-500/30">वैकल्पिक</span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-emerald-500/30 rounded-full text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-emerald-200 truncate max-w-[140px] sm:max-w-[200px]" title={user.email}>
              {user.email}
            </span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            id="btn-logout"
            onClick={onLogout}
            className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-200 hover:text-white rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            लॉगआउट (Logout)
          </button>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="max-w-6xl mx-auto w-full py-6 flex-1 space-y-6">
        {/* Welcome Greeting */}
        <div className="bg-[#121f15]/85 border border-white/15 rounded-3xl p-5 sm:p-7 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest block mb-1">
                सत्यापित नागरिक सत्र (Authenticated Citizen Session)
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                नमस्ते, {user.email.split('@')[0]}!
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
                सेवा वाणी में आपका स्वागत है। आप अपनी स्थानीय भाषा में बोलकर किसी भी सरकारी सेवा या छात्रवृत्ति के लिए आवेदन कर सकते हैं।
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenJudgeMode}
                className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-3.5 py-2 rounded-2xl hover:bg-emerald-900/90 transition-all shadow-sm"
              >
                📊 सिस्टम मेट्रिक्स (Judge Mode)
              </button>
            </div>
          </div>
        </div>

        {/* Primary Voice Action Stage */}
        <div className="bg-gradient-to-br from-[#132818]/95 via-[#0e1d12]/95 to-[#09150c]/95 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-8 backdrop-blur-2xl shadow-2xl relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-400/40 rounded-full text-xs font-bold text-emerald-300 mb-3 shadow-inner">
              <span className="animate-ping w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>वॉइस असिस्टेंट तैयार है (Voice Assistant Ready)</span>
            </div>

            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              🎙️ बोलकर आवेदन शुरू करें
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 mt-1 leading-relaxed">
              अपनी भाषा चुनें और माइक दबाकर बातचीत शुरू करें। आपका हर उत्तर स्क्रीन पर दिखेगा और केवल आपकी स्पष्ट पुष्टि के बाद ही सहेजा जाएगा।
            </p>

            {/* Language Quick Chips (Focus on Hindi & Marathi as required) */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider block mb-2">
                संवाद की भाषा चुनें (Select Conversation Language):
              </span>
              <div className="flex flex-wrap gap-2">
                {INDIAN_LANGUAGES.map((lang) => {
                  const isSelected = selectedLang === lang.id;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setSelectedLang(lang.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-950/80 ring-2 ring-emerald-300/40 scale-105'
                          : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/15'
                      }`}
                    >
                      <span>{lang.native}</span>
                      <span className="text-[10px] ml-1 opacity-80">({lang.english})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Launch CTA */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                id="btn-launch-voice-assistant"
                onClick={() => onStartVoice(selectedLang, 'scholarship_post_matric')}
                className="px-7 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-950/80 border border-emerald-300/40 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🎙️</span>
                <span>{selectedLang === 'hi' ? 'हिन्दी में बोलकर आवेदन शुरू करें' : selectedLang === 'mr' ? 'मराठीत बोलून अर्ज सुरू करा' : `Start Voice Application (${selectedLang.toUpperCase()})`}</span>
                <span>→</span>
              </button>

              <span className="text-xs text-emerald-300/70 text-center sm:text-left">
                ✓ 100% शून्य ऑटो-सबमिट • ✓ सुरक्षित SQLite सिंक
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Saved Sessions & Available Services */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Saved Sessions */}
          <div className="bg-[#121f15]/85 border border-white/15 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📁</span>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    सहेजे गए आवेदन (Saved Sessions)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={loadSessions}
                  className="text-xs text-emerald-300 hover:text-white transition-colors"
                >
                  ↻ रिफ्रेश
                </button>
              </div>

              {loadingSessions ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  सत्र लोड हो रहे हैं (Loading saved sessions)...
                </div>
              ) : savedSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-semibold text-emerald-200">
                    वर्तमान में कोई सहेजा गया आवेदन नहीं है।
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    जब आप बोलकर फॉर्म भरेंगे, तो आपकी प्रगति SQLite डेटाबेस में यहाँ सुरक्षित रहेगी।
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {savedSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-emerald-300">{s.id}</div>
                        <div className="text-slate-300 mt-0.5">
                          {s.service_type === 'scholarship_app' ? 'छात्रवृत्ति योजना' : s.service_type} • {s.answers_count} उत्तर दर्ज
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        s.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-950 text-amber-300 border-amber-500/40'
                      }`}>
                        {s.status === 'completed' ? 'पूर्ण (Submitted)' : 'प्रगति पर (In Progress)'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400">
              🔒 सत्र डेटा केवल आपके अधिकृत खाते ({user.email}) के लिए सुलभ है।
            </div>
          </div>

          {/* Column 2: Supported Public Services */}
          <div className="bg-[#121f15]/85 border border-white/15 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-4">
                <span className="text-lg">🏛️</span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  उपलब्ध सरकारी सेवाएं (Supported Public Services)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    onClick={() => svc.active && onStartVoice(selectedLang, svc.id)}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      svc.active
                        ? 'bg-[#152719] border-emerald-400/50 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-950/60 cursor-pointer active:scale-95'
                        : 'bg-white/5 border-white/10 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl">{svc.icon}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        svc.active
                          ? 'bg-emerald-900/80 text-emerald-200 border-emerald-400/40'
                          : 'bg-white/10 text-slate-400 border-white/10'
                      }`}>
                        {svc.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {svc.name}
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                      {svc.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Browser Extension Note */}
            <div className="mt-4 p-3 bg-black/40 border border-emerald-500/25 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span>🧩</span>
                <span className="text-slate-200 text-[11px]">
                  वेबसाइट के लिए एक्सटेंशन आवश्यक नहीं है। सीधे किसी सरकारी पोर्टल पर ऑटो-फिल के लिए यह वैकल्पिक है।
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenExtensionModal}
                className="text-xs font-semibold text-emerald-300 hover:text-white shrink-0 underline"
              >
                विवरण देखें
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-3 border-t border-white/10 mt-4">
        SEVA VAANI • Digital India Public Assistance • Pan-India Voice Engine
      </footer>
    </div>
  );
};

export default Dashboard;
