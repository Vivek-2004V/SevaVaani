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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex flex-col justify-between p-6">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200"
        >
          ← भाषा बदलें (Back)
        </button>
        <div className="flex items-center gap-2">
          <SevaVaaniLogo size={28} showWordmark={false} />
          <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-3 py-1 rounded-full">
            Step 2 of 4: सेवा चयन (Select Service)
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full py-8 my-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            सेवा का चयन करें (Choose Public Service)
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            जिस योजना या प्रमाण पत्र के लिए आवेदन करना है, उसे चुनें:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              onClick={() => svc.active && onSelectService(svc.id)}
              className={`p-5 rounded-3xl border-2 transition-all duration-200 relative flex flex-col justify-between ${
                svc.active
                  ? 'bg-white/95 border-blue-500 hover:border-blue-600 hover:shadow-xl cursor-pointer ring-2 ring-blue-500/20'
                  : 'bg-slate-50/80 border-slate-200/90 opacity-75 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{svc.icon}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${svc.badgeColor}`}>
                    {svc.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  {svc.name[language] || svc.name.en}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {svc.desc[language] || svc.desc.en}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                {svc.active ? (
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
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
