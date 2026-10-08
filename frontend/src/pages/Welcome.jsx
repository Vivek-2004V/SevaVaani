import React from 'react';
import { UI_STRINGS } from '../state/sessionStore';

export default function Welcome({ language, onStartSession }) {
  const t = UI_STRINGS[language] || UI_STRINGS.hi;

  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center max-w-2xl mx-auto">
      <div className="w-20 h-20 bg-saffron-50 border-2 border-saffron-200 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
        🎙️
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mb-3 tracking-tight">
        {t.welcomeTitle}
      </h2>

      <p className="text-slate-600 text-sm sm:text-base mb-6 leading-relaxed">
        {t.welcomeSub}
      </p>

      <div className="bg-slate-50 border-l-4 border-saffron-500 rounded-r-xl p-4 text-left mb-6">
        <h3 className="font-bold text-navy-900 text-sm mb-1">{t.serviceName}</h3>
        <p className="text-xs text-slate-600">
          {language === 'hi'
            ? 'उच्च शिक्षा (इंजीनियरिंग, मेडिकल, डिग्री) प्राप्त कर रहे पात्र छात्रों के लिए छात्रवृत्ति सहायता।'
            : 'उच्च शिक्षण घेणाऱ्या पात्र विद्यार्थ्यांसाठी शिष्यवृत्ती सहाय्य.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
          <span className="text-2xl">🇮🇳</span>
          <div className="text-xs font-bold text-slate-700">
            {language === 'hi' ? 'हिंदी व मराठी स्वाभाविक आवाज़' : 'मराठी व हिंदी नैसर्गिक आवाज'}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div className="text-xs font-bold text-slate-700">
            {language === 'hi' ? 'जीरो गेसिंग (सत्यापन गेट)' : 'शून्य अंदाज (पडताळणी गेट)'}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
          <span className="text-2xl">✍️</span>
          <div className="text-xs font-bold text-slate-700">
            {language === 'hi' ? 'टेक्स्ट व ऑपरेटर बैकअप' : 'मजकूर व ऑपरेटर बॅकअप'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onStartSession}
        className="bg-gradient-to-r from-saffron-600 to-saffron-500 hover:from-saffron-700 hover:to-saffron-600 text-white font-extrabold text-base sm:text-lg px-8 py-3.5 rounded-full shadow-lg shadow-saffron-500/30 hover:scale-105 active:scale-95 transition-all duration-200 inline-flex items-center gap-2"
      >
        <span>🚀</span> {t.startBtn}
      </button>
    </div>
  );
}
