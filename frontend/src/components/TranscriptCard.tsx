import React from 'react';
import { SupportedLanguage } from '../types';

export interface TranscriptCardProps {
  transcript: string;
  isLive?: boolean;
  confidence?: number;
  language: SupportedLanguage;
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({
  transcript,
  isLive = false,
  confidence,
  language
}) => {
  if (!transcript) return null;

  const getHeading = () => {
    const msgs: Record<SupportedLanguage, string> = {
      hi: 'आपने कहा (You said):',
      mr: 'तुम्ही म्हणालात (You said):',
      bn: 'আপনি বললেন (You said):',
      te: 'మీరు చెప్పారు (You said):',
      ta: 'நீங்கள் கூறியது (You said):',
      gu: 'તમે કહ્યું (You said):',
      kn: 'ನೀವು ಹೇಳಿದ್ದು (You said):',
      ml: 'നിങ്ങൾ പറഞ്ഞത് (You said):',
      pa: 'ਤੁਸੀਂ ਕਿਹਾ (You said):',
      or: 'ଆପଣ କହିଲେ (You said):',
      en: 'Recognized Transcript:'
    };
    return msgs[language] || msgs.en;
  };

  return (
    <div className="w-full max-w-xl mx-auto my-3 p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          {getHeading()}
        </span>
        {confidence !== undefined && (
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
            Accuracy: {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      <p className="text-base md:text-lg font-medium text-slate-800 italic">
        "{transcript}"
      </p>
    </div>
  );
};

export default TranscriptCard;
