import React from 'react';
import { SupportedLanguage } from '../types';
import { HumzieSymbol } from './HumzieSymbol';

export type AssistantVisualState =
  | 'ready'
  | 'mic_permission_required'
  | 'listening'
  | 'processing'
  | 'transcript_available'
  | 'confirmation_required'
  | 'answer_confirmed'
  | 'correction_required'
  | 'speaking'
  | 'network_error'
  | 'unsupported_feature'
  | 'stopped';

export interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking?: boolean;
  assistantState?: AssistantVisualState;
  error?: string | null;
  onStartListening: () => void;
  onStopListening: () => void;
  onRepeatAudio?: () => void;
  onSlowRepeatAudio?: () => void;
  onToggleFallbackText?: () => void;
  language: SupportedLanguage;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  isProcessing,
  isSpeaking = false,
  assistantState,
  error,
  onStartListening,
  onStopListening,
  onRepeatAudio,
  onSlowRepeatAudio,
  onToggleFallbackText,
  language
}) => {
  // Derive effective state if not explicitly supplied
  const effectiveState: AssistantVisualState = (() => {
    if (assistantState) return assistantState;
    if (error) {
      if (error.toLowerCase().includes('permission') || error.toLowerCase().includes('अनुमति')) {
        return 'mic_permission_required';
      }
      if (error.toLowerCase().includes('network') || error.toLowerCase().includes('इंटरनेट')) {
        return 'network_error';
      }
      if (error.toLowerCase().includes('unsupported') || error.toLowerCase().includes('असमर्थित')) {
        return 'unsupported_feature';
      }
      return 'correction_required';
    }
    if (isProcessing) return 'processing';
    if (isListening) return 'listening';
    if (isSpeaking) return 'speaking';
    return 'ready';
  })();

  const getStateMeta = (): {
    title: string;
    badge: string;
    icon: string;
    badgeClass: string;
    buttonClass: string;
  } => {
    switch (effectiveState) {
      case 'listening':
        return {
          title: language === 'mr' ? 'ऐकत आहोत... बोला' : language === 'en' ? 'Listening... Speak now' : 'बोलिए, हम सुन रहे हैं',
          badge: language === 'mr' ? 'सक्रिय ध्वनी नोंदणी' : language === 'en' ? 'Recording Voice' : 'आवाज़ रिकॉर्ड हो रही है',
          icon: '🎙️',
          badgeClass: 'bg-red-950/80 text-red-300 border-red-500/50 animate-pulse',
          buttonClass: 'bg-gradient-to-tr from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 ring-4 ring-red-400/50 shadow-red-950/90 scale-105'
        };
      case 'processing':
        return {
          title: language === 'mr' ? 'आवाज विश्लेषण सुरू आहे...' : language === 'en' ? 'Processing speech...' : 'आवाज़ समझ रहे हैं...',
          badge: language === 'mr' ? 'प्रक्रिया सुरू' : language === 'en' ? 'Processing' : 'विश्लेषण जारी',
          icon: '⏳',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
          buttonClass: 'bg-amber-500 cursor-wait shadow-amber-950/80'
        };
      case 'speaking':
        return {
          title: language === 'mr' ? 'सहाय्यक उत्तर वाचत आहे...' : language === 'en' ? 'Speaking response...' : 'सहायक बोल रहा है...',
          badge: language === 'mr' ? 'आवाज सुरू' : language === 'en' ? 'Audio Playing' : 'ऑडियो सक्रिय',
          icon: '🔊',
          badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-500/50',
          buttonClass: 'bg-gradient-to-tr from-sky-600 to-cyan-500 ring-4 ring-sky-400/40'
        };
      case 'mic_permission_required':
        return {
          title: language === 'mr' ? 'मायक्रोफोन परवानगी आवश्यक' : language === 'en' ? 'Microphone permission required' : 'माइक अनुमति आवश्यक है',
          badge: language === 'mr' ? 'परवानगी आवश्यक' : language === 'en' ? 'Permission Denied' : 'अनुमति दें',
          icon: '🔒',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
          buttonClass: 'bg-amber-700 hover:bg-amber-600 border border-amber-400/50'
        };
      case 'transcript_available':
        return {
          title: language === 'mr' ? 'उत्तर नोंदवले गेले' : language === 'en' ? 'Transcript available' : 'उत्तर दर्ज हुआ',
          badge: language === 'mr' ? 'तपासा' : language === 'en' ? 'Review Transcript' : 'जांचें',
          icon: '📝',
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
          buttonClass: 'bg-gradient-to-tr from-emerald-600 to-teal-500'
        };
      case 'confirmation_required':
        return {
          title: language === 'mr' ? 'पुष्टी आवश्यक आहे' : language === 'en' ? 'Confirmation required' : 'पुष्टि आवश्यक है',
          badge: language === 'mr' ? 'होय किंवा नाही सांगा' : language === 'en' ? 'Needs Confirmation' : 'सहमति दें',
          icon: '❓',
          badgeClass: 'bg-teal-950/80 text-teal-300 border-teal-500/40',
          buttonClass: 'bg-gradient-to-tr from-emerald-600 to-teal-500'
        };
      case 'answer_confirmed':
        return {
          title: language === 'mr' ? 'उत्तर पुष्टी झाली!' : language === 'en' ? 'Answer confirmed!' : 'उत्तर की पुष्टि हो गई!',
          badge: language === 'mr' ? 'पुष्टीत' : language === 'en' ? 'Confirmed' : 'पुष्टीकृत',
          icon: '✅',
          badgeClass: 'bg-emerald-950/80 text-emerald-200 border-emerald-500/50',
          buttonClass: 'bg-emerald-600'
        };
      case 'correction_required':
        return {
          title: language === 'mr' ? 'सुधारणा आवश्यक • पुन्हा बोला' : language === 'en' ? 'Correction required • Try again' : 'सुधार आवश्यक • दोबारा बोलें',
          badge: language === 'mr' ? 'अस्पष्ट उत्तर' : language === 'en' ? 'Uncertain' : 'अस्पष्ट उत्तर',
          icon: '🔄',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
          buttonClass: 'bg-amber-600 hover:bg-amber-500'
        };
      case 'network_error':
        return {
          title: language === 'mr' ? 'इंटरनेट समस्या • खाली टाईप करा' : language === 'en' ? 'Network error • Use typing' : 'इंटरनेट समस्या • नीचे टाइप करें',
          badge: language === 'mr' ? 'ऑफलाइन' : language === 'en' ? 'Offline' : 'ऑफ़लाइन',
          icon: '⚡',
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
          buttonClass: 'bg-rose-700 hover:bg-rose-600'
        };
      case 'unsupported_feature':
        return {
          title: language === 'mr' ? 'ब्राउझरमध्ये ध्वनी असमर्थित' : language === 'en' ? 'Browser voice unsupported' : 'ब्राउज़र में आवाज़ असमर्थित',
          badge: language === 'mr' ? 'टाईप करा' : language === 'en' ? 'Use Keyboard' : 'कीबोर्ड का उपयोग करें',
          icon: '⌨️',
          badgeClass: 'bg-slate-900 text-slate-300 border-slate-600',
          buttonClass: 'bg-slate-700'
        };
      case 'stopped':
        return {
          title: language === 'mr' ? 'आवाज थांबवला' : language === 'en' ? 'Voice input stopped' : 'आवाज़ रोक दी गई',
          badge: language === 'mr' ? 'थांबवले' : language === 'en' ? 'Stopped' : 'रोका गया',
          icon: '⏹️',
          badgeClass: 'bg-slate-900 text-slate-300 border-slate-600',
          buttonClass: 'bg-slate-700 hover:bg-slate-600'
        };
      case 'ready':
      default:
        return {
          title: language === 'mr' ? 'बोलण्यासाठी माइक दाबा' : language === 'en' ? 'Tap to Speak' : 'बोलने के लिए माइक दबाएं',
          badge: language === 'mr' ? 'सज्ज' : language === 'en' ? 'Ready' : 'तैयार',
          icon: '🎤',
          badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
          buttonClass: 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 hover:scale-105 border border-emerald-300/40 shadow-emerald-950/80'
        };
    }
  };

  const meta = getStateMeta();

  const handleClick = () => {
    if (isProcessing) return;
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  return (
    <section
      aria-label="Voice Assistant Interaction Area"
      className="flex flex-col items-center justify-center my-3 sm:my-4 select-none w-full max-w-md mx-auto"
    >
      {/* Visual State & Language Status Badge */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border backdrop-blur-md shadow-sm transition-all ${meta.badgeClass}`}
        >
          <span>{meta.icon}</span>
          <span>{meta.badge}</span>
          <span className="opacity-60">•</span>
          <span className="uppercase tracking-wider">
            {language === 'mr' ? 'मराठी' : language === 'en' ? 'English' : 'हिन्दी'}
          </span>
        </span>
      </div>

      {/* Prominent Circular Microphone Trigger (Touch Target >= 44x44px; actual 88px-104px) */}
      <div className="relative flex items-center justify-center">
        {/* Animated sound wave rings when actively recording */}
        {isListening && (
          <>
            <span
              aria-hidden="true"
              className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-red-400/25 animate-ping"
            />
            <span
              aria-hidden="true"
              className="absolute -inset-2 rounded-full border-2 border-red-400/60 animate-pulse"
            />
          </>
        )}

        {isSpeaking && (
          <span
            aria-hidden="true"
            className="absolute -inset-2 rounded-full border-2 border-sky-400/60 animate-pulse"
          />
        )}

        <button
          id="btn-voice-push-to-talk"
          type="button"
          onClick={handleClick}
          disabled={isProcessing}
          aria-label={`${meta.title} (${language})`}
          aria-pressed={isListening}
          className={`relative z-10 touch-target-44 flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full shadow-2xl transition-all duration-300 transform active:scale-95 focus-visible:ring-4 focus-visible:ring-emerald-400/60 cursor-pointer ${meta.buttonClass}`}
        >
          {/* Inner Icon — Humzie Symbol */}
          <div className="relative text-white pointer-events-none">
            {isProcessing ? (
              /* Spinning Humzie while processing */
              <div className="animate-spin">
                <HumzieSymbol size={40} variant="amber" />
              </div>
            ) : isListening ? (
              /* Pulsing Humzie while listening */
              <HumzieSymbol size={40} variant="white" animated />
            ) : isSpeaking ? (
              /* Humzie speaking state */
              <HumzieSymbol size={40} variant="white" animated />
            ) : (
              /* Default Humzie ready state */
              <HumzieSymbol size={40} variant="white" />
            )}
          </div>
        </button>
      </div>

      {/* Button Text Label */}
      <p
        aria-live="polite"
        className={`mt-3 font-bold text-xs sm:text-sm md:text-base text-center transition-colors px-2 ${
          isListening ? 'text-red-400' : isProcessing ? 'text-amber-300' : 'text-emerald-100'
        }`}
      >
        {meta.title}
      </p>

      {/* Accessible Secondary Audio Controls (Slow Repeat, Replay, Stop, Keyboard Fallback) */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-2">
        {onRepeatAudio && (
          <button
            type="button"
            id="btn-voice-replay-normal"
            onClick={onRepeatAudio}
            className="touch-target-44 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 rounded-full text-emerald-200 transition-all active:scale-95 shadow-sm inline-flex items-center gap-1.5"
            title="Repeat Question at Normal Speed"
          >
            <span>🔊</span>
            <span>{language === 'mr' ? 'पुन्हा ऐका (Replay)' : language === 'en' ? 'Replay' : 'पुनः सुनें (Replay)'}</span>
          </button>
        )}

        {onSlowRepeatAudio && (
          <button
            type="button"
            id="btn-voice-replay-slow"
            onClick={onSlowRepeatAudio}
            className="touch-target-44 px-3 py-1.5 text-xs font-semibold bg-teal-950/70 hover:bg-teal-900/80 border border-teal-500/30 rounded-full text-teal-200 transition-all active:scale-95 shadow-sm inline-flex items-center gap-1.5"
            title="Hear Question Slower (0.70x Speed)"
          >
            <span>🐢</span>
            <span>{language === 'mr' ? 'हळू ऐका 0.70x' : language === 'en' ? 'Slow 0.70x' : 'धीमे सुनें 0.70x'}</span>
          </button>
        )}

        {onToggleFallbackText && (
          <button
            type="button"
            id="btn-voice-fallback-toggle"
            onClick={onToggleFallbackText}
            className="touch-target-44 px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/15 border border-white/15 rounded-full text-slate-300 transition-all active:scale-95 shadow-sm inline-flex items-center gap-1.5"
            title="Switch to Typing"
          >
            <span>⌨️</span>
            <span>{language === 'mr' ? 'टाईप करा' : language === 'en' ? 'Type Answer' : 'टाइप करें'}</span>
          </button>
        )}
      </div>

      {/* Honest Error Banner if underlying operation failed */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-3 text-xs sm:text-sm text-red-100 bg-red-950/90 px-4 py-2 rounded-2xl border border-red-500/50 backdrop-blur-md shadow-lg max-w-sm text-center font-medium"
        >
          {error}
        </div>
      )}
    </section>
  );
};

export default VoiceButton;
