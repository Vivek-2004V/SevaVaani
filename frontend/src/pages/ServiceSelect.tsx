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
        hi: 'पोस्ट-मैट्रिक छात्रवृत्ति योजना (Scholarship)',
        mr: 'पोस्ट-मॅट्रिक शिष्यवृत्ती योजना (Scholarship)',
        en: 'Post-Matric Scholarship Scheme'
      },
      desc: {
        hi: 'उच्च शिक्षा हेतु सरकारी छात्रवृत्ति सहायता (पूर्णतः सक्रिय)',
        mr: 'उच्च शिक्षणासाठी शासकीय शिष्यवृत्ती सहाय्य (सक्रिय)',
        en: 'Financial assistance for college & higher education students'
      },
      badge: 'Active P0 Service',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      active: true,
      icon: '🎓'
    },
    {
      id: 'income_certificate',
      name: {
        hi: 'आय प्रमाण पत्र (Income Certificate)',
        mr: 'उत्पन्नाचा दाखला (Income Certificate)',
        en: 'Income Certificate'
      },
      desc: {
        hi: 'तहसीलदार द्वारा जारी वार्षिक पारिवारिक आय प्रमाण पत्र',
        mr: 'तहसीलदारांकडून कौटुंबिक उत्पन्नाचा दाखला',
        en: 'Official certificate for annual family income'
      },
      badge: 'Coming Soon (जल्द आ रहा है)',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      active: false,
      icon: '📄'
    },
    {
      id: 'caste_certificate',
      name: {
        hi: 'जाति प्रमाण पत्र (Caste Certificate)',
        mr: 'जातीचे प्रमाणपत्र (Caste Certificate)',
        en: 'Caste Certificate'
      },
      desc: {
        hi: 'ओबीसी, एससी, एसटी श्रेणी सत्यापन प्रमाण पत्र',
        mr: 'मागासवर्गीय प्रवर्ग पडताळणी प्रमाणपत्र',
        en: 'Community & caste verification certificate'
      },
      badge: 'Coming Soon (जल्द आ रहा है)',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      active: false,
      icon: '🏛️'
    },
    {
      id: 'domicile_certificate',
      name: {
        hi: 'मूल निवास प्रमाण पत्र (Domicile)',
        mr: 'अधिवास प्रमाणपत्र (Domicile)',
        en: 'Domicile / Residence Certificate'
      },
      desc: {
        hi: 'राज्य में स्थायी निवास का आधिकारिक प्रमाण पत्र',
        mr: 'राज्यातील वास्तव्याचा अधिकृत दाखला',
        en: 'Proof of permanent residency in the state'
      },
      badge: 'Coming Soon (जल्द आ रहा है)',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      active: false,
      icon: '📍'
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
          ← भाषा बदलें (Back)
        </button>
        <div className="flex items-center gap-2">
          <SevaVaaniLogo size={28} showWordmark={false} />
          <span className="text-[11px] sm:text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
            Step 2 of 4: सेवा चयन (Select Service)
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full py-8 my-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            सेवा का चयन करें (Choose Public Service)
          </h2>
          <p className="text-xs md:text-sm text-emerald-200/80 mt-1">
            जिस योजना या प्रमाण पत्र के लिए आवेदन करना है, उसे चुनें:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              onClick={() => svc.active && onSelectService(svc.id)}
              className={`p-5 rounded-3xl border transition-all duration-200 relative flex flex-col justify-between backdrop-blur-2xl shadow-xl ${
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
                    आवेदन शुरू करें (Start Application) →
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    आगामी अद्यतन में उपलब्ध
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
