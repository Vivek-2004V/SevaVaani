import React, { useState, useEffect } from 'react';
import { SupportedLanguage } from '../types';
import { AuthUser, getUserSavedSessions } from '../services/api';
import { SevaVaaniLogo } from '../components/SevaVaaniLogo';
import { HumzieSymbol } from '../components/HumzieSymbol';
import { INDIAN_LANGUAGES } from '../components/LanguageSelector';
import { HumanHelpModal } from '../components/HumanHelpModal';

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
  const [showHelpModal, setShowHelpModal] = useState(false);

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

  const inAppService = {
    id: 'scholarship_post_matric',
    name: selectedLang === 'en' ? 'Post-Matric Scholarship (In-App)' : 'पोस्ट-मैट्रिक छात्रवृत्ति (इन-ऐप वेब मोड)',
    desc: selectedLang === 'en' ? 'Voice-guided interactive application inside SevaVaani' : 'सेवा वाणी वेब ऐप में सीधे आवाज से बोलकर छात्रवृत्ति फॉर्म भरें',
    badge: 'Active P0',
    icon: '🎓'
  };

  const officialGovtPortals = [
    {
      id: 'nsp',
      name: 'National Scholarship Portal (NSP)',
      hindiName: 'राष्ट्रीय छात्रवृत्ति पोर्टल (scholarships.gov.in)',
      url: 'https://scholarships.gov.in',
      desc: 'Central schemes: Post-Matric, Top Class, MCM',
      hindiDesc: 'केंद्र सरकार की सभी आधिकारिक छात्रवृत्तियां — एक्सटेंशन समर्थित',
      badge: 'scholarships.gov.in',
      icon: '🏛️'
    },
    {
      id: 'mahadbt',
      name: 'MahaDBT (Maharashtra Portal)',
      hindiName: 'महाडीबीटी (mahadbt.maharashtra.gov.in)',
      url: 'https://mahadbt.maharashtra.gov.in',
      desc: 'Social Justice & Tribal Development schemes',
      hindiDesc: 'महाराष्ट्र सरकार की सभी छात्रवृत्तियां — एक्सटेंशन समर्थित',
      badge: 'mahadbt.gov.in',
      icon: '🚩'
    },
    {
      id: 'aaplesarkar',
      name: 'Aaple Sarkar / e-District',
      hindiName: 'आपले सरकार / ई-डिस्ट्रिक्ट (aaplesarkar.mahaonline.gov.in)',
      url: 'https://aaplesarkar.mahaonline.gov.in',
      desc: 'Income, Caste & Domicile certificates',
      hindiDesc: 'आय, जाति व मूल निवास प्रमाण पत्र — एक्सटेंशन समर्थित',
      badge: 'aaplesarkar.gov.in',
      icon: '📜'
    },
    {
      id: 'up_scholarship',
      name: 'UP Scholarship Portal',
      hindiName: 'यूपी छात्रवृत्ति पोर्टल (scholarship.up.gov.in)',
      url: 'https://scholarship.up.gov.in',
      desc: 'Post-Matric Intermediate & Dashmottar schemes',
      hindiDesc: 'दशमोत्तर एवं उच्च शिक्षा छात्रवृत्ति — एक्सटेंशन समर्थित',
      badge: 'scholarship.up.gov.in',
      icon: '🇮🇳'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black/50 backdrop-blur-md flex flex-col justify-between p-3.5 sm:p-6 text-white">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto w-full flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <SevaVaaniLogo size={32} showWordmark={true} />
          <span className="hidden sm:inline-block text-[11px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
            नागरिक डैशबोर्ड (Citizen Portal)
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Human Help / Support Entry Point */}
          <button
            type="button"
            id="btn-dashboard-human-help"
            onClick={() => setShowHelpModal(true)}
            className="touch-target-44 min-h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-900/80 to-teal-900/80 hover:from-emerald-800 hover:to-teal-800 border border-emerald-400/50 rounded-full text-xs font-bold text-emerald-100 transition-all active:scale-95 shadow-md focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <span className="text-sm">🆘</span>
            <span>{selectedLang === 'mr' ? 'इन्सानी मदत' : selectedLang === 'en' ? 'Human Help' : 'इंसानी सहायता'}</span>
          </button>

          {/* Optional Extension Trigger */}
          <button
            type="button"
            id="btn-dashboard-extension"
            onClick={onOpenExtensionModal}
            className="touch-target-44 min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full text-xs font-semibold text-emerald-200 transition-all active:scale-95 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <span>🧩 एक्सटेंशन से जोड़ें</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-500/30">वैकल्पिक</span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-emerald-500/30 rounded-full text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-emerald-200 truncate max-w-[120px] sm:max-w-[200px]" title={user.email}>
              {user.email}
            </span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            id="btn-logout"
            onClick={onLogout}
            className="touch-target-44 min-h-[38px] px-3.5 py-1.5 bg-red-950/70 hover:bg-red-900/90 border border-red-500/50 text-red-200 hover:text-white rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm focus-visible:ring-2 focus-visible:ring-red-400"
          >
            लॉगआउट
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
                {selectedLang === 'en'
                  ? 'Authenticated Citizen Session'
                  : 'सत्यापित नागरिक सत्र (Authenticated Citizen Session)'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {selectedLang === 'en' ? 'Welcome' : 'नमस्ते'}, {user.email.split('@')[0]}!
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
                {selectedLang === 'en'
                  ? 'Welcome to SEVA VAANI. You can apply for any government service or scholarship by speaking in your regional language.'
                  : 'सेवा वाणी में आपका स्वागत है। आप अपनी स्थानीय भाषा में बोलकर किसी भी सरकारी सेवा या छात्रवृत्ति के लिए आवेदन कर सकते हैं।'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenJudgeMode}
                className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-3.5 py-2 rounded-2xl hover:bg-emerald-900/90 transition-all shadow-sm"
              >
                📊 {selectedLang === 'en' ? 'System Metrics (Judge Mode)' : 'सिस्टम मेट्रिक्स (Judge Mode)'}
              </button>
            </div>
          </div>
        </div>

        {/* Primary Voice Action Stage */}
        <div className="bg-gradient-to-br from-[#132818]/95 via-[#0e1d12]/95 to-[#09150c]/95 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-8 backdrop-blur-2xl shadow-2xl relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-400/40 rounded-full text-xs font-bold text-emerald-300 mb-3 shadow-inner">
              <HumzieSymbol size={18} variant="emerald" animated />
              <span>{selectedLang === 'en' ? 'Humzie Ready' : 'Humzie तैयार है'}</span>
            </div>

            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <HumzieSymbol size={32} variant="gradient" />
              {selectedLang === 'en' ? 'Start with Humzie' : 'Humzie से बोलकर आवेदन शुरू करें'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 mt-1 leading-relaxed">
              {selectedLang === 'en'
                ? 'Select your language and tap to begin. Every answer is displayed on screen and saved only with your explicit confirmation.'
                : 'अपनी भाषा चुनें और माइक दबाकर बातचीत शुरू करें। आपका हर उत्तर स्क्रीन पर दिखेगा और केवल आपकी स्पष्ट पुष्टि के बाद ही सहेजा जाएगा।'}
            </p>

            {/* Language Quick Chips (Focus on Hindi & Marathi as required) */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider block mb-2">
                {selectedLang === 'en' ? 'Select Conversation Language:' : 'संवाद की भाषा चुनें (Select Conversation Language):'}
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
                <HumzieSymbol size={22} variant="amber" />
                <span>{selectedLang === 'hi' ? 'Humzie से हिन्दी में बोलें' : selectedLang === 'mr' ? 'Humzie ने मराठीत बोला' : `Speak to Humzie (${selectedLang.toUpperCase()})`}</span>
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

          {/* Column 2: Supported In-App Service & Official Government Portals */}
          <div className="bg-[#121f15]/85 border border-white/15 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏛️</span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {selectedLang === 'en' ? 'Official Govt Portals & Services' : 'आधिकारिक सरकारी पोर्टल एवं सेवाएं'}
                    </h3>
                    <p className="text-[11px] text-emerald-200/70">
                      {selectedLang === 'en'
                        ? 'SevaVaani voice assistant fills forms directly on live government sites'
                        : 'सेवा वाणी एक्सटेंशन सीधे आधिकारिक सरकारी वेबसाइटों पर फॉर्म भरता है'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenExtensionModal}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 rounded-full text-[11px] font-bold text-emerald-300 transition-colors shrink-0"
                >
                  🧩 एक्सटेंशन निर्देश
                </button>
              </div>

              {/* In-App Direct Service */}
              <div
                onClick={() => onStartVoice(selectedLang, inAppService.id)}
                className="p-3.5 rounded-2xl border bg-gradient-to-r from-[#17301d] to-[#122417] border-emerald-400/60 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-950/60 cursor-pointer active:scale-98 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{inAppService.icon}</span>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      {inAppService.name}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-black border border-emerald-300">
                    {inAppService.badge}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/80 leading-snug">
                  {inAppService.desc}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                  <span>🎙️ बोलकर फॉर्म भरें</span>
                  <span>शुरू करें →</span>
                </div>
              </div>

              {/* Official Portals Grid */}
              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  {selectedLang === 'en' ? 'Official Government Portals (Extension Mode):' : 'आधिकारिक सरकारी पोर्टल (एक्सटेंशन से भरें):'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {officialGovtPortals.map((portal) => (
                    <div
                      key={portal.id}
                      className="p-3 rounded-xl border bg-black/40 border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-base">{portal.icon}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 truncate max-w-[120px]">
                            {portal.badge}
                          </span>
                        </div>
                        <h5 className="text-[11px] font-bold text-white leading-tight">
                          {selectedLang === 'en' ? portal.name : portal.hindiName}
                        </h5>
                        <p className="text-[10px] text-slate-300 mt-1 line-clamp-2">
                          {selectedLang === 'en' ? portal.desc : portal.hindiDesc}
                        </p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                        <a
                          href={portal.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-[10px] font-bold text-emerald-300 hover:text-white flex items-center gap-1 underline"
                        >
                          पोर्टल खोलें ↗
                        </a>
                        <span className="text-[9px] text-emerald-400/80">✓ ऑटो-डिटेक्ट</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Test Portal Sandbox & Extension Connect */}
            <div className="mt-4 p-3 bg-black/50 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🧪</span>
                <div>
                  <span className="text-white font-semibold text-[11px] block">
                    लाइव टेस्ट पोर्टल (Local Government Simulator)
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    लोकल सरकारी फॉर्म पर एक्सटेंशन की टेस्टिंग करें
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/extension/test-portal.html"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition-all"
                >
                  टेस्ट पोर्टल खोलें ↗
                </a>
              </div>
            </div>

            {/* Human Help & Support Banner Card */}
            <div className="mt-4 p-4 bg-gradient-to-r from-emerald-950/70 via-zinc-900/90 to-teal-950/70 border border-emerald-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl">
                  🤝
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedLang === 'mr' ? 'इन्सानी मदत केंद्र (Human Help & Support)' : selectedLang === 'en' ? 'Human Support & Helpdesk' : 'इंसानी सहायता एवं हेल्पडेस्क (Human Helpdesk)'}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">सक्रिय</span>
                  </h4>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    {selectedLang === 'mr'
                      ? 'आवाज ओळखण्यात अडचण, अर्ज भरण्यात समस्या किंवा तिकीट ट्रॅक करण्यासाठी येथे क्लिक करा.'
                      : selectedLang === 'en'
                      ? 'Voice not recognized? Need operator assistance? Create support ticket or check status.'
                      : 'आवाज़ पहचान में रुकावट, फॉर्म भरने में समस्या या पूर्व टिकट देखने के लिए सहायता लें।'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 touch-target-44"
              >
                <span>🆘 सहायता मांगें / टिकट देखें</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-3 border-t border-white/10 mt-4">
        SEVA VAANI • Digital India Public Assistance • Pan-India Voice Engine
      </footer>

      {/* Human Help Modal */}
      <HumanHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        language={selectedLang}
      />
    </div>
  );
};

export default Dashboard;
