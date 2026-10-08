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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex flex-col justify-between p-6">
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200"
        >
          ← वापस (Back)
        </button>
        <div className="flex items-center gap-2">
          <SevaVaaniLogo size={28} showWordmark={false} />
          <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-3 py-1 rounded-full">
            Step 1 of 4: भाषा चयन (Select Language)
          </span>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full text-center my-auto py-8">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mb-2">
          अपनी भाषा चुनें <br />
          <span className="text-base md:text-lg font-normal text-slate-500">
            आप किस भाषा में बातचीत करना पसंद करेंगे?
          </span>
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          You can switch language anytime during the application.
        </p>

        <LanguageSelector
          selectedLanguage={selected}
          onSelectLanguage={(lang) => setSelected(lang)}
        />

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => onConfirmLanguage(selected)}
            className="w-full max-w-sm px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-transform active:scale-95"
          >
            आगे बढ़ें (Continue with {selected === 'hi' ? 'हिन्दी' : selected === 'mr' ? 'मराठी' : 'English'}) →
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
