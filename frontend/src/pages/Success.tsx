import React from 'react';
import { SupportedLanguage } from '../types';

export interface SuccessProps {
  applicationId: string;
  language: SupportedLanguage;
  onHome: () => void;
  onOpenJudgeMode: () => void;
}

export const Success: React.FC<SuccessProps> = ({
  applicationId,
  language,
  onHome,
  onOpenJudgeMode
}) => {
  const getHeading = () => {
    if (language === 'hi') return 'आवेदन सफलतापूर्वक जमा हो गया!';
    if (language === 'mr') return 'अर्ज यशस्वीरित्या सादर करण्यात आला आहे!';
    return 'Application Submitted Successfully!';
  };

  const getSubtext = () => {
    if (language === 'hi') {
      return 'आपकी छात्रवृत्ति का आवेदन आधिकारिक रूप से दर्ज कर लिया गया है। आपको पावती संदेश आपके मोबाइल नंबर पर भी प्राप्त होगा।';
    }
    if (language === 'mr') {
      return 'आपला शिष्यवृत्ती अर्ज अधिकृतपणे नोंदवला गेला आहे. पावतीचा संदेश आपल्या मोबाईल क्रमांकावर पाठवला जाईल.';
    }
    return 'Your scholarship application has been officially recorded. An SMS receipt has been dispatched to your registered mobile.';
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 flex flex-col justify-between p-6 text-slate-800">
      <header className="max-w-xl mx-auto w-full flex items-center justify-end">
        <button
          type="button"
          onClick={onOpenJudgeMode}
          className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
        >
          View Judge Metrics →
        </button>
      </header>

      <main className="max-w-md mx-auto w-full text-center my-auto py-8">
        {/* Animated Celebration Icon */}
        <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-xl border-4 border-emerald-300 animate-bounce">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">
          {getHeading()}
        </h2>

        <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto mb-6">
          {getSubtext()}
        </p>

        {/* Application ID Card */}
        <div className="p-4 bg-white/95 rounded-2xl border-2 border-emerald-300 shadow-md mb-6">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
            आवेदन संदर्भ क्रमांक (Application ID)
          </span>
          <span className="text-xl md:text-2xl font-mono font-black text-emerald-800 mt-1 block">
            {applicationId}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            दिनांक: {new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onHome}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-95 text-sm"
          >
            मुख्य पृष्ठ पर लौटें (Back to Home)
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-2xl border border-slate-300 shadow-sm text-sm"
          >
            रसीद प्रिंट करें (Print Receipt)
          </button>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-2">
        SEVA VAANI • Digital India Public Assistance
      </footer>
    </div>
  );
};

export default Success;
