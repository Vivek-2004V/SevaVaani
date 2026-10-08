import React from 'react';

export default function LanguageSelector({ currentLanguage, onSelectLanguage }) {
  return (
    <div className="flex bg-white/10 p-1 rounded-full border border-white/20">
      <button
        type="button"
        onClick={() => onSelectLanguage('hi')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
          currentLanguage === 'hi'
            ? 'bg-white text-navy-900 shadow-sm'
            : 'text-slate-200 hover:text-white'
        }`}
      >
        हिन्दी
      </button>
      <button
        type="button"
        onClick={() => onSelectLanguage('mr')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
          currentLanguage === 'mr'
            ? 'bg-white text-navy-900 shadow-sm'
            : 'text-slate-200 hover:text-white'
        }`}
      >
        मराठी
      </button>
    </div>
  );
}
