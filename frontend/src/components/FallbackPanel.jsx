import React, { useState } from 'react';

export default function FallbackPanel({
  isOpen,
  onClose,
  onSubmitText,
  onRequestHelp,
  language = 'hi',
  fieldExample = ''
}) {
  const [typedValue, setTypedValue] = useState('');
  const isHi = language === 'hi';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!typedValue.trim()) return;
    onSubmitText(typedValue.trim());
    setTypedValue('');
  };

  if (!isOpen) return null;

  return (
    <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 my-3 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="font-bold text-sky-900 text-sm flex items-center gap-2">
          <span>⌨️</span> {isHi ? 'लिखकर उत्तर दें (Text Fallback)' : 'टाईप करून उत्तर द्या (Text Fallback)'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 font-bold text-sm"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={typedValue}
          onChange={(e) => setTypedValue(e.target.value)}
          placeholder={fieldExample || (isHi ? 'यहाँ लिखें...' : 'येथे लिहा...')}
          className="flex-1 px-3 py-2 text-sm bg-white border border-sky-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-lg text-sm shadow-sm transition"
        >
          {isHi ? 'दर्ज करें' : 'नोंदवा'}
        </button>
      </form>

      <div className="pt-2 border-t border-sky-200/60 flex justify-between items-center text-xs text-sky-800">
        <span>{isHi ? 'यदि टाइपिंग में भी समस्या हो:' : 'टायपिंगमध्येही अडचण असल्यास:'}</span>
        <button
          type="button"
          onClick={onRequestHelp}
          className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1 rounded-md transition flex items-center gap-1"
        >
          <span>🆘</span> {isHi ? 'सहायता ऑपरेटर टिकट बनाएं' : 'मदत ऑपरेटर तिकीट बनवा'}
        </button>
      </div>
    </div>
  );
}
