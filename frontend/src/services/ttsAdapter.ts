import { SupportedLanguage } from '../types';

export class BrowserTTSAdapter {
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechRate: number = 0.92; // Calmer rate for clear public service communication
  private lastSpokenText: string = '';
  private lastSpokenLang: SupportedLanguage = 'hi';

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  public setRate(rate: number) {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
  }

  public getRate(): number {
    return this.speechRate;
  }

  public getLastSpokenText(): string {
    return this.lastSpokenText;
  }

  private getLangCode(lang: SupportedLanguage): string {
    const map: Record<string, string> = {
      hi: 'hi-IN',
      mr: 'mr-IN',
      en: 'en-IN',
      bn: 'bn-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      gu: 'gu-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      pa: 'pa-IN',
      or: 'or-IN'
    };
    return map[lang] || 'hi-IN';
  }

  private getBestVoice(langCode: string): SpeechSynthesisVoice | null {
    if (!this.isSupported()) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Exact match (e.g. "hi-IN" or "mr-IN")
    const exact = voices.find(v => v.lang.toLowerCase() === langCode.toLowerCase());
    if (exact) return exact;

    // 2. Strict Prefix match (e.g. "hi", "mr", "en") - NEVER cross into unrelated languages!
    const prefix = langCode.split('-')[0].toLowerCase();
    const matchedPrefix = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (matchedPrefix) return matchedPrefix;

    // Requirement 2: Avoid switching to an unrelated language voice unexpectedly
    return null;
  }

  public speak(
    text: string,
    language: SupportedLanguage,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    if (!this.isSupported()) {
      if (onError) onError(new Error('SpeechSynthesis not supported'));
      return;
    }

    if (!text || text.trim().length === 0) return;

    this.stop();
    this.lastSpokenText = text;
    this.lastSpokenLang = language;

    const langCode = this.getLangCode(language);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = this.speechRate;
    utterance.pitch = 1.0;

    const voice = this.getBestVoice(langCode);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onError) onError(e);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public replay(onStart?: () => void, onEnd?: () => void, onError?: (err: any) => void) {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText, this.lastSpokenLang, onStart, onEnd, onError);
    }
  }

  public stop() {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  public pause() {
    if (this.isSupported() && this.isSpeaking) {
      window.speechSynthesis.pause();
    }
  }

  public resume() {
    if (this.isSupported()) {
      window.speechSynthesis.resume();
    }
  }
}

export const ttsAdapter = new BrowserTTSAdapter();
