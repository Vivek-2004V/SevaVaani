import React from 'react';

export interface TranscriptCardProps {
  transcript: string;
  isLive?: boolean;
  confidence?: number;
  language: 'hi' | 'mr' | 'en';
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({
  transcript,
  isLive = false,
  confidence,
  language
}) => {
  if (!transcript) return null;

  const getHeading = () => {
    if (language === 'hi') return 'आपने कहा (You said):';
    if (language === 'mr') return 'तुम्ही म्हणालात (You said):';
    return 'Recognized Transcript:';
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
