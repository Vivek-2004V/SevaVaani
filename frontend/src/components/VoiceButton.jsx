import React from 'react';

export default function VoiceButton({ isListening, isProcessing, onClick, language = 'hi' }) {
  const label = isListening
    ? (language === 'hi' ? 'सुन रहा हूँ... बोलिए' : 'ऐकत आहे... बोला')
    : isProcessing
    ? (language === 'hi' ? 'समझ रहा हूँ...' : 'समजून घेत आहे...')
    : (language === 'hi' ? 'बोलने के लिए माइक दबाएं' : 'बोलण्यासाठी माइक दाबा');

  return (
    <div className="flex flex-col items-center gap-3 my-4">
      <div className="relative flex items-center justify-center">
        {isListening && (
          <div className="absolute w-24 h-24 rounded-full bg-red-500/30 animate-pulse-ring" />
        )}
        <button
          type="button"
          disabled={isProcessing}
          onClick={onClick}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all duration-300 z-10 ${
            isListening
              ? 'bg-red-600 text-white scale-105 shadow-red-500/50'
              : 'bg-gradient-to-tr from-saffron-600 to-saffron-500 text-white hover:scale-105 shadow-saffron-500/40'
          }`}
          title={label}
        >
          {isProcessing ? '⏳' : '🎙️'}
        </button>
      </div>

      <div className="text-sm font-semibold text-slate-700">
        {label}
      </div>

      <div className="flex items-center gap-1 h-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${
              isListening
                ? 'bg-red-500 wave-bar'
                : 'bg-slate-300 h-1.5'
            }`}
            style={isListening ? { animationDelay: `${i * 0.15}s` } : {}}
          />
        ))}
      </div>
    </div>
  );
}
