import React, { useState } from 'react';
import { SupportedLanguage } from '../types';
import { LanguageSelector } from '../components/LanguageSelector';
import { SevaVaaniLogo } from '../components/SevaVaaniLogo';

export interface LanguageSelectProps {
  currentLanguage: SupportedLanguage;
  onConfirmLanguage: (lang: SupportedLanguage) => void;
  onBack: () => void;
}

export const LanguageSelect: React.FC<LanguageSelectProps> = ({
  currentLanguage,
  onConfirmLanguage,
  onBack
}) => {
  const [selected, setSelected] = useState<SupportedLanguage>(currentLanguage);

  return (
    <div className="min-h-screen w-full bg-black/45 backdrop-blur-md flex flex-col justify-between p-3.5 sm:p-6 text-white">
      <header className="max-w-2xl mx-auto w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-emerald-100 hover:text-white flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-lg shadow-sm transition-all active:scale-95 shrink-0"
        >
          {selected === 'en' ? '← Back to Dashboard' : '← वापस (Back)'}
        </button>
        <div className="flex items-center gap-2">
          <SevaVaaniLogo size={28} showWordmark={false} />
          <span className="text-[11px] sm:text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
            {selected === 'en' ? 'Step 1 of 4: Select Language' : 'Step 1 of 4: भाषा चयन (Select Language)'}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full text-center my-auto py-6 sm:py-8 bg-[#121f15]/80 border border-white/15 rounded-3xl p-4 sm:p-6 md:p-8 backdrop-blur-2xl shadow-2xl shadow-black/60">
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
          {selected === 'en' ? 'Choose Your Language' : 'अपनी भाषा चुनें'} <br />
          <span className="text-base md:text-lg font-normal text-emerald-200/80">
            {selected === 'en'
              ? 'Which language would you prefer to speak in?'
              : 'आप किस भाषा में बातचीत करना पसंद करेंगे?'}
          </span>
        </h2>
        <p className="text-xs text-slate-300 mb-6">
          You can switch language anytime during the application.
        </p>

        <LanguageSelector
          selectedLanguage={selected}
          onSelectLanguage={(lang) => setSelected(lang)}
        />

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            id="btn-confirm-language"
            onClick={() => onConfirmLanguage(selected)}
            className="w-full max-w-sm px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/50 border border-emerald-300/30 transition-all active:scale-95 cursor-pointer"
          >
            {selected === 'en'
              ? 'Continue with English →'
              : selected === 'mr'
              ? 'मराठीत पुढे जा (Continue) →'
              : 'आगे बढ़ें (Continue with हिन्दी) →'}
          </button>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-2">
        SEVA VAANI • Digital India Public Assistance
      </footer>
    </div>
  );
};

export default LanguageSelect;
