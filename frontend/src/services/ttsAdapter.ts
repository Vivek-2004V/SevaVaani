import { SupportedLanguage } from '../types';

export class BrowserTTSAdapter {
  private isSpeakingState: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechRate: number = 0.92; // Calmer rate for clear public service communication
  private lastSpokenText: string = '';
  private lastSpokenLang: SupportedLanguage = 'hi';
  private voicesCache: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (!this.isSupported()) return;
    this.voicesCache = window.speechSynthesis.getVoices() || [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          this.voicesCache = window.speechSynthesis.getVoices() || [];
        } catch {
          // Ignore voiceschanged error
        }
      };
    }
  }

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

  public isBusy(): boolean {
    return this.isSpeakingState || (this.isSupported() && window.speechSynthesis.speaking);
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
    const voices = this.voicesCache.length > 0 ? this.voicesCache : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Exact match (e.g. "hi-IN" or "mr-IN")
    const exact = voices.find(v => v.lang.toLowerCase() === langCode.toLowerCase());
    if (exact) return exact;

    // 2. Strict Prefix match (e.g. "hi", "mr", "en")
    const prefix = langCode.split('-')[0].toLowerCase();
    const matchedPrefix = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (matchedPrefix) return matchedPrefix;

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
      if (onError) onError(new Error('SpeechSynthesis not supported on this device'));
      if (onEnd) onEnd();
      return;
    }

    const cleanText = (text || '')
      .replace(/[*_#`~]/g, '') // remove markdown artifacts
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    this.stop();
    this.lastSpokenText = cleanText;
    this.lastSpokenLang = language;

    try {
      // Unfreeze paused browser audio engine (Chromium macOS fix)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const langCode = this.getLangCode(language);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = langCode;
      utterance.rate = this.speechRate;
      utterance.pitch = 1.0;

      const voice = this.getBestVoice(langCode);
      if (voice) {
        utterance.voice = voice;
      }

      let hasFinished = false;
      const finish = () => {
        if (!hasFinished) {
          hasFinished = true;
          this.isSpeakingState = false;
          this.currentUtterance = null;
          if (onEnd) onEnd();
        }
      };

      utterance.onstart = () => {
        this.isSpeakingState = true;
        if (onStart) onStart();
      };

      utterance.onend = () => {
        finish();
      };

      utterance.onerror = (e) => {
        // e.error === 'canceled' or 'interrupted' is normal when stop() is called
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('[BrowserTTSAdapter] Speech synthesis notice:', e.error);
          if (onError) onError(e);
        }
        finish();
      };

      // Safety watchdog: if speech doesn't complete within proportional max duration, release state
      const wordsCount = cleanText.split(/\s+/).length;
      const maxMs = Math.max(4000, wordsCount * 700 + 3000);
      const safetyTimer = setTimeout(() => {
        if (!hasFinished && this.isSpeakingState) {
          console.warn('[BrowserTTSAdapter] Safety timeout elapsed for utterance');
          finish();
        }
      }, maxMs);

      this.currentUtterance = utterance;
      this.isSpeakingState = true;
      window.speechSynthesis.speak(utterance);

      // Clean up timer when done
      const origOnEnd = utterance.onend;
      utterance.onend = (e) => {
        clearTimeout(safetyTimer);
        if (origOnEnd) origOnEnd.call(utterance, e);
      };
    } catch (err) {
      this.isSpeakingState = false;
      this.currentUtterance = null;
      console.warn('[BrowserTTSAdapter] speak() exception:', err);
      if (onError) onError(err);
      if (onEnd) onEnd();
    }
  }

  public replay(onStart?: () => void, onEnd?: () => void, onError?: (err: any) => void) {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText, this.lastSpokenLang, onStart, onEnd, onError);
    }
  }

  public stop() {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
      this.isSpeakingState = false;
      this.currentUtterance = null;
    }
  }

  public pause() {
    if (this.isSupported() && this.isSpeakingState) {
      try {
        window.speechSynthesis.pause();
      } catch {}
    }
  }

  public resume() {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.resume();
      } catch {}
    }
  }
}

export const ttsAdapter = new BrowserTTSAdapter();
