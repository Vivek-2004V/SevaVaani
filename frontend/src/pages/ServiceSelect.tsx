import React from 'react';
import { SupportedLanguage } from '../types';
import { SevaVaaniLogo } from '../components/SevaVaaniLogo';

export interface ServiceSelectProps {
  language: SupportedLanguage;
  onSelectService: (serviceId: string) => void;
  onBack: () => void;
}

export const ServiceSelect: React.FC<ServiceSelectProps> = ({
  language,
  onSelectService,
  onBack
}) => {
  const services = [
    {
      id: 'scholarship_post_matric',
      name: {
        hi: 'पोस्ट-मैट्रिक छात्रवृत्ति योजना (इन-ऐप फॉर्म)',
        mr: 'पोस्ट-मॅट्रिक शिष्यवृत्ती योजना (इन-अ‍ॅप फॉर्म)',
        en: 'Post-Matric Scholarship Scheme (In-App Mode)'
      },
      desc: {
        hi: 'सेवा वाणी वेब ऐप के अंदर सीधे आवाज से बोलकर छात्रवृत्ति फॉर्म भरें।',
        mr: 'सेवा वाणी वेब अ‍ॅपमध्ये थेट आवाजाने शिष्यवृत्ती अर्ज भरा.',
        en: 'Interactive voice-guided scholarship application within SevaVaani.'
      },
      badge: 'Active P0 (In-App)',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      active: true,
      icon: '🎓'
    },
    {
      id: 'official_portals_extension',
      name: {
        hi: 'आधिकारिक सरकारी पोर्टल मोड (एक्सटेंशन से भरें)',
        mr: 'अधिकृत शासकीय पोर्टल मोड (एक्स्टेंशन वापरून)',
        en: 'Official Government Portals (Extension Mode)'
      },
      desc: {
        hi: 'MahaDBT, NSP (scholarships.gov.in), व आपले सरकार पर सीधे बोलकर फॉर्म भरें।',
        mr: 'MahaDBT, NSP आणि आपले सरकार पोर्टलवर थेट बोलून फॉर्म भरा.',
        en: 'Fills forms directly on official government websites via Chrome extension.'
      },
      badge: 'Live Extension Bridge',
      badgeColor: 'bg-cyan-900/60 text-cyan-200 border-cyan-400/40',
      active: true,
      icon: '🌐'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-black/45 backdrop-blur-md flex flex-col justify-between p-3.5 sm:p-6 text-white">
      <header className="max-w-4xl mx-auto w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-emerald-100 hover:text-white flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-lg shadow-sm transition-all active:scale-95 shrink-0"
        >
          {language === 'en' ? '← Change Language' : '← भाषा बदलें (Back)'}
        </button>
        <div className="flex items-center gap-2">
          <SevaVaaniLogo size={28} showWordmark={false} />
          <span className="text-[11px] sm:text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
            {language === 'en' ? 'Step 2 of 4: Select Service' : 'Step 2 of 4: सेवा चयन (Select Service)'}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full py-8 my-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {language === 'en' ? 'Choose Public Service' : 'सेवा का चयन करें (Choose Public Service)'}
          </h2>
          <p className="text-xs md:text-sm text-emerald-200/80 mt-1">
            {language === 'en'
              ? 'Select the scheme or certificate you wish to apply for:'
              : 'जिस योजना या प्रमाण पत्र के लिए आवेदन करना है, उसे चुनें:'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              id={`btn-service-${svc.id}`}
              role={svc.active ? 'button' : undefined}
              tabIndex={svc.active ? 0 : -1}
              onClick={() => svc.active && onSelectService(svc.id)}
              onKeyDown={(e) => {
                if (svc.active && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectService(svc.id);
                }
              }}
              className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all duration-200 relative flex flex-col justify-between backdrop-blur-2xl shadow-xl lang-devanagari ${
                svc.active
                  ? 'bg-[#142317]/85 border-emerald-400/50 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-950/80 cursor-pointer ring-2 ring-emerald-400/30 transform hover:-translate-y-1'
                  : 'bg-white/5 border-white/10 opacity-60 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{svc.icon}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    svc.active
                      ? 'bg-emerald-900/60 text-emerald-200 border-emerald-400/40'
                      : 'bg-white/10 text-slate-400 border-white/10'
                  }`}>
                    {svc.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {svc.name[language] || svc.name.en}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {svc.desc[language] || svc.desc.en}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                {svc.active ? (
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                    {language === 'en' ? 'Start Application →' : 'आवेदन शुरू करें (Start Application) →'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    {language === 'en' ? 'Available in upcoming update' : 'आगामी अद्यतन में उपलब्ध'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-2">
        SEVA VAANI • Multilingual Voice-Based Public Assistance
      </footer>
    </div>
  );
};

export default ServiceSelect;
