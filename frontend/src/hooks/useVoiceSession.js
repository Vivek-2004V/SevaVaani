import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoiceSession(language = 'hi', onTranscriptReceived = () => {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'mr-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        onTranscriptReceived(transcript);
      };
      recognition.onerror = (err) => {
        console.warn("Speech Recognition Error:", err);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, [language, onTranscriptReceived]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Web Speech API is not supported in this browser. Please use text fallback or demo chips.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'mr-IN';
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Recognition already active", e);
      }
    }
  }, [isListening, language]);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'mr-IN';
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [language]);

  return {
    isListening,
    isSpeaking,
    toggleListening,
    speak
  };
}
