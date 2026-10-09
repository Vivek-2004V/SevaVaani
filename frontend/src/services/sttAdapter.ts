import { SupportedLanguage } from '../types';

export type STTState = 'idle' | 'listening' | 'processing' | 'ready' | 'error' | 'unsupported';

export interface STTEventCallbacks {
  onStateChange: (state: STTState) => void;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (errorMessage: string, errorCode?: string) => void;
}

export class BrowserSTTAdapter {
  private recognition: any = null;
  private isListening: boolean = false;
  private currentLanguage: SupportedLanguage = 'hi';
  private callbacks: STTEventCallbacks | null = null;

  constructor() {
    this.initRecognition();
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  private getLocale(lang: SupportedLanguage): string {
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

  private initRecognition() {
    if (!this.isSupported()) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
  }

  public start(lang: SupportedLanguage, callbacks: STTEventCallbacks) {
    this.callbacks = callbacks;
    this.currentLanguage = lang;

    if (!this.isSupported()) {
      callbacks.onStateChange('unsupported');
      callbacks.onError('Browser speech recognition is not supported on this browser. Please use keyboard text entry.', 'UNSUPPORTED');
      return;
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    try {
      this.recognition.lang = this.getLocale(lang);

      this.recognition.onstart = () => {
        this.isListening = true;
        callbacks.onStateChange('listening');
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        if (text) {
          callbacks.onTranscript(text.trim(), !!finalTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        const err = event.error || 'unknown_error';
        let userMessage = 'आवाज़ पहचानने में त्रुटि हुई। कृपया दोबारा बोलें या नीचे टाइप करें।';

        if (err === 'not-allowed') {
          userMessage = lang === 'en'
            ? 'Microphone permission was denied. Please allow microphone access or type your answer.'
            : lang === 'mr'
            ? 'मायक्रोफोन परवानगी नाकारली गेली. कृपया परवानगी द्या किंवा मजकूर टाईप करा.'
            : 'माइक्रोफ़ोन की अनुमति अस्वीकृत हुई। कृपया अनुमति दें या नीचे टाइप करें।';
        } else if (err === 'no-speech') {
          userMessage = lang === 'en'
            ? 'No speech detected. Please speak closer to the microphone.'
            : lang === 'mr'
            ? 'कोणताही आवाज आढळला नाही. कृपया पुन्हा बोला.'
            : 'कोई आवाज़ सुनाई नहीं दी। कृपया माइक के पास होकर दोबारा बोलें।';
        } else if (err === 'network') {
          userMessage = lang === 'en'
            ? 'Network issue with speech recognition service. Please use text entry.'
            : lang === 'mr'
            ? 'नेटवर्क समस्या. कृपया मजकूर टाईप करा.'
            : 'नेटवर्क समस्या। कृपया टेक्स्ट बॉक्स में टाइप करके उत्तर दर्ज करें।';
        }

        callbacks.onStateChange('error');
        callbacks.onError(userMessage, err);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        callbacks.onStateChange('ready');
      };

      this.recognition.start();
    } catch (e: any) {
      this.isListening = false;
      callbacks.onStateChange('error');
      callbacks.onError(e.message || 'Failed to start speech recognition');
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore already stopped
      }
      this.isListening = false;
    }
  }

  public abort() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
    }
  }
}

export const sttAdapter = new BrowserSTTAdapter();
