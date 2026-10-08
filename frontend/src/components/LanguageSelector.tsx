import React from 'react';
import { SupportedLanguage } from '../types';

export interface LanguageSelectorProps {
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage
}) => {
  const languages: { id: SupportedLanguage; native: string; english: string; desc: string }[] = [
    {
      id: 'hi',
      native: 'हिन्दी',
      english: 'Hindi',
      desc: 'आवाज़ द्वारा सरल हिन्दी में सहायता'
    },
    {
      id: 'mr',
      native: 'मराठी',
      english: 'Marathi',
      desc: 'आवाजाद्वारे सोप्या मराठीत मार्गदर्शन'
    },
    {
      id: 'en',
      native: 'English',
      english: 'English',
      desc: 'Voice assistance in Indian English'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-3 w-full max-w-xl mx-auto">
      {languages.map((lang) => {
        const isSelected = selectedLanguage === lang.id;
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => onSelectLanguage(lang.id)}
            className={`p-4 rounded-2xl text-left transition-all duration-200 border-2 relative ${
              isSelected
                ? 'bg-blue-50/90 border-blue-600 shadow-md ring-2 ring-blue-400/20'
                : 'bg-white/80 border-slate-200/90 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl font-bold text-slate-800">{lang.native}</span>
              {isSelected && (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang.english}
            </p>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              {lang.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSelector;
