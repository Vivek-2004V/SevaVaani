import React from 'react';
import { UI_STRINGS } from '../state/sessionStore';

export default function Success({
  applicationId,
  language,
  onReset
}) {
  const t = UI_STRINGS[language] || UI_STRINGS.hi;
  const isHi = language === 'hi';

  return (
    <div className="bg-white rounded-2xl p-8 border-2 border-emerald-500 shadow-2xl max-w-xl mx-auto text-center">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 font-bold">
        ✓
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mb-2">
        {t.completedBadge}
      </h2>

      <p className="text-slate-600 text-sm mb-6">
        {isHi
          ? 'आपका छात्रवृत्ति आवेदन राज्य कल्याण पोर्टल पर सुरक्षित रूप से प्रेषित कर दिया गया है।'
          : 'आपला शिष्यवृत्ती अर्ज सुरक्षितपणे सादर केला गेला आहे.'}
      </p>

      <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 max-w-sm mx-auto mb-8">
        <div className="text-xs uppercase font-extrabold text-slate-500 tracking-wider mb-1">
          {t.appIdLabel}
        </div>
        <div className="text-2xl font-black text-navy-900 tracking-wide font-mono">
          {applicationId}
        </div>
      </div>

      <div className="flex justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-navy-800 hover:bg-navy-900 text-white font-bold px-6 py-2.5 rounded-full text-sm shadow transition flex items-center gap-2"
        >
          <span>🖨️</span> {isHi ? 'पावती प्रिंट करें' : 'पावती प्रिंट करा'}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-2.5 rounded-full text-sm transition flex items-center gap-2"
        >
          <span>🔄</span> {t.btnNewApp}
        </button>
      </div>
    </div>
  );
}
