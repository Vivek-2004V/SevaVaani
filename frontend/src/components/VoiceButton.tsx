import React from 'react';

export interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  error?: string | null;
  onStartListening: () => void;
  onStopListening: () => void;
  language: 'hi' | 'mr' | 'en';
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  isProcessing,
  error,
  onStartListening,
  onStopListening,
  language
}) => {
  const getButtonText = () => {
    if (isProcessing) {
      if (language === 'hi') return 'आवाज़ समझ रहे हैं... (Processing)';
      if (language === 'mr') return 'आवाज प्रक्रिया सुरू आहे...';
      return 'Processing Speech...';
    }
    if (isListening) {
      if (language === 'hi') return 'बोलिए, हम सुन रहे हैं (Listening...)';
      if (language === 'mr') return 'बोला, आम्ही ऐकत आहोत...';
      return 'Listening... Speak now';
    }
    if (language === 'hi') return 'बोलने के लिए माइक दबाएं (Tap to Speak)';
    if (language === 'mr') return 'बोलण्यासाठी माइक दाबा (Tap to Speak)';
    return 'Tap to Speak';
  };

  const handleClick = () => {
    if (isProcessing) return;
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center my-4 select-none">
      <button
        type="button"
        onClick={handleClick}
        disabled={isProcessing}
        aria-label={getButtonText()}
        className={`relative flex items-center justify-center w-24 h-24 md:w-28 md:h-28 rounded-full shadow-2xl transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 scale-105 shadow-red-200'
            : isProcessing
            ? 'bg-amber-500 cursor-wait'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-102 shadow-blue-200'
        }`}
      >
        {/* Animated sound wave rings when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-400 opacity-75 animate-ping" />
            <span className="absolute -inset-2 rounded-full border-2 border-red-300 animate-pulse" />
          </>
        )}

        {/* Icon */}
        <div className="relative z-10 text-white">
          {isProcessing ? (
            <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : isListening ? (
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </div>
      </button>

      {/* Button label */}
      <p className={`mt-3 font-medium text-sm md:text-base text-center transition-colors ${
        isListening ? 'text-red-600 font-semibold' : isProcessing ? 'text-amber-600' : 'text-slate-700'
      }`}>
        {getButtonText()}
      </p>

      {error && (
        <div className="mt-2 text-xs md:text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceButton;
