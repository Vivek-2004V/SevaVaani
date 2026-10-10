import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormField, SupportedLanguage, AssistTurnResponse } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import { VoiceButton } from '../components/VoiceButton';
import { TranscriptCard } from '../components/TranscriptCard';
import { ConfirmationCard } from '../components/ConfirmationCard';
import { FallbackPanel } from '../components/FallbackPanel';
import { FieldGuidanceModal } from '../components/FieldGuidanceModal';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { processVoiceTurn, confirmField, submitFallbackText, requestHumanHelp } from '../services/api';
import { ttsAdapter } from '../services/ttsAdapter';
import { INDIAN_LANGUAGES } from '../components/LanguageSelector';
import { SevaVaaniLogo } from '../components/SevaVaaniLogo';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { useOfflineSyncRunner } from '../hooks/useOfflineSyncRunner';
import { HumanHelpModal } from '../components/HumanHelpModal';

export interface ServiceFormProps {
  sessionId: string;
  fields: FormField[];
  language: SupportedLanguage;
  initialIndex?: number;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onCompleteForm: (fields: FormField[]) => void;
  onBack: () => void;
}

export const ServiceForm: React.FC<ServiceFormProps> = ({
  sessionId,
  fields: initialFields,
  language,
  initialIndex = 0,
  onLanguageChange,
  onCompleteForm,
  onBack
}) => {
  const safeInitialIndex = typeof initialIndex === 'number' && initialIndex >= 0 ? initialIndex : 0;
  const [fields, setFields] = useState<FormField[]>(initialFields || []);
  const [currentIdx, setCurrentIdx] = useState<number>(safeInitialIndex);

  useEffect(() => {
    if (typeof initialIndex === 'number' && initialIndex >= 0 && initialIndex < fields.length) {
      setCurrentIdx(initialIndex);
    }
  }, [initialIndex, fields.length]);

  // Voice Interaction state
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Confirmation state
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fallback state
  const [showFallback, setShowFallback] = useState(false);
  const [helpTicketId, setHelpTicketId] = useState<string | null>(null);
  const [helpError, setHelpError] = useState<string | null>(null);
  const [showGuidance, setShowGuidance] = useState(false);
  const [showHumanHelpModal, setShowHumanHelpModal] = useState(false);

  // Trial-limit tracking (backend returns attempts, max_trials, trials_remaining)
  const MAX_VOICE_TRIALS = 3;
  const [voiceAttempts, setVoiceAttempts] = useState(0);

  // ── Offline / Network ─────────────────────────────────────────────────────
  const networkStatus = useNetworkStatus();
  const { saveSession, enqueueSyncItem } = useOfflineStore();
  const { isSyncing, pendingCount } = useOfflineSyncRunner(networkStatus);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // When we go offline, automatically show the text fallback
  useEffect(() => {
    if (networkStatus.isOffline && !showFallback && !showConfirmation) {
      setShowFallback(true);
      setVoiceError(
        language === 'mr'
          ? 'इंटरनेट बंद आहे. कृपया खाली टाईप करा.'
          : language === 'en'
          ? 'You are offline. Please type your answer below.'
          : 'इंटरनेट बंद है। कृपया नीचे टाइप करके उत्तर दें।'
      );
    }
  }, [networkStatus.isOffline]);

  const recognitionRef = useRef<any>(null);

  const currentField = fields[currentIdx] || fields[0] || {
    id: 'full_name',
    label: { hi: 'पूरा नाम', mr: 'पूर्ण नाव', en: 'Full Name' },
    prompt: { hi: 'कृपया अपना पूरा नाम बताएं।', mr: 'कृपया आपले संपूर्ण नाव सांगा.', en: 'Please tell me your full name.' },
    confirmPrompt: { hi: 'आपका नाम {val} है?', mr: 'आपले नाव {val} आहे?', en: 'Your name is {val}?' },
    type: 'text',
    required: true,
    confirmed: false
  };

  // Helper suggested answers for quick demo across all languages
  const demoSamples: Record<string, Record<string, string[]>> = {
    full_name: {
      hi: ['मेरा नाम विवेक विश्वकर्मा है', 'विवेक कुमार', 'अमित शर्मा'],
      mr: ['माझे नाव विवेक विश्वकर्मा आहे', 'विवेक कुमार', 'सचिन पवार'],
      bn: ['আমার নাম বিবেক বিশ্বকর্মা', 'রাহুল সেন'],
      te: ['నా పేరు వివేక్ విశ్వకర్మ', 'అనిల్ కుమార్'],
      ta: ['என் பெயர் விவேக் விஸ்வகர்மா', 'சுரேஷ் குமார்'],
      gu: ['મારું નામ વિવેક વિશ્વકર્મા છે', 'રોહિત પટેલ'],
      kn: ['ನನ್ನ ಹೆಸರು ವಿವೇಕ್ ವಿಶ್ವಕರ್ಮ', 'ಪ್ರವೀಣ್ ಕುಮಾರ್'],
      ml: ['എന്റെ പേര് വിവേക് വിശ്വകർമ്മ', 'രാഹുൽ നായർ'],
      pa: ['ਮੇਰਾ ਨਾਮ ਵਿਵੇਕ ਵਿਸ਼ਵਕਰਮਾ ਹੈ', 'ਅਮਨਦੀਪ ਸਿੰਘ'],
      or: ['ମୋର ନାମ ବିବେକ ବିଶ୍ୱକର୍ମା', 'ଦୀପକ ସାହୁ'],
      en: ['My name is Vivek Vishwakarma', 'Vivek Kumar', 'Rahul Verma']
    },
    dob: {
      hi: ['15 अगस्त 2003', '12/04/2002', '1 जनवरी 2004'],
      mr: ['15 ऑगस्ट 2003', '12/04/2002', '1 जानेवारी 2004'],
      bn: ['১৫ আগস্ট ২০০৩', '15/08/2003'],
      te: ['15 ఆగస్టు 2003', '15/08/2003'],
      ta: ['15 ஆகஸ்ட் 2003', '15/08/2003'],
      gu: ['15 ઓગસ્ટ 2003', '15/08/2003'],
      kn: ['15 ಆಗಸ್ಟ್ 2003', '15/08/2003'],
      ml: ['15 ആഗസ്റ്റ് 2003', '15/08/2003'],
      pa: ['15 ਅਗਸਤ 2003', '15/08/2003'],
      or: ['୧୫ ଅଗଷ୍ଟ ୨୦୦୩', '15/08/2003'],
      en: ['15 August 2003', '12/04/2002', '1 January 2004']
    },
    mobile: {
      hi: ['9876543210', 'नंबर 9812345678', '9988776655'],
      mr: ['9876543210', 'क्रमांक 9812345678', '9988776655'],
      bn: ['9876543210', '9812345678'],
      te: ['9876543210', '9812345678'],
      ta: ['9876543210', '9812345678'],
      gu: ['9876543210', '9812345678'],
      kn: ['9876543210', '9812345678'],
      ml: ['9876543210', '9812345678'],
      pa: ['9876543210', '9812345678'],
      or: ['9876543210', '9812345678'],
      en: ['9876543210', 'My number is 9812345678', '9988776655']
    },
    college: {
      hi: ['राजकीय इंजीनियरिंग कॉलेज', 'आईआईटी मुंबई', 'डीवाई पाटिल कॉलेज'],
      mr: ['शासकीय अभियांत्रिकी महाविद्यालय', 'आयआयटी मुंबई', 'डीवाय पाटील कॉलेज'],
      bn: ['সরকারি ইঞ্জিনিয়ারিং কলেজ', 'কলকাতা বিশ্ববিদ্যালয়'],
      te: ['ప్రభుత్వ ఇంజనీరింగ్ కళాశాల', 'ఆంధ్రా యూనివర్సిటీ'],
      ta: ['அரசு பொறியியல் கல்லூரி', 'அண்ணா பல்கலைக்கழகம்'],
      gu: ['સરકારી એન્જિનિયરિંગ કૉલેજ', 'ગુજરાત યુનિવર્સિટી'],
      kn: ['ಸರ್ಕಾರಿ ಇಂಜಿನಿಯರಿಂಗ್ ಕಾಲೇಜು', 'ಬೆಂಗಳೂರು ವಿಶ್ವವಿದ್ಯಾಲಯ'],
      ml: ['സർക്കാർ എഞ്ചിനീയറിംഗ് കോളേജ്'],
      pa: ['ਸਰਕਾਰੀ ਇੰਜੀਨੀਅਰਿੰਗ ਕਾਲਜ'],
      or: ['ସରକାରୀ ଇଞ୍ଜିନିୟରିଂ କଲେଜ'],
      en: ['Government Engineering College', 'IIT Bombay', 'DY Patil College']
    },
    course: {
      hi: ['बी.टेक (B.Tech)', 'बी.एससी (B.Sc)', 'डिप्लोमा'],
      mr: ['बी.टेक (B.Tech)', 'बी.एस्सी (B.Sc)', 'डिप्लोमा'],
      bn: ['বি.টেক (B.Tech)', 'বি.এসসি'],
      te: ['బి.టెక్ (B.Tech)', 'బి.ఎస్సీ'],
      ta: ['பி.டெக் (B.Tech)', 'பி.எஸ்சி'],
      gu: ['બી.ટેક (B.Tech)', 'બી.એસસી'],
      kn: ['ಬಿ.ಟೆಕ್ (B.Tech)', 'ಬಿ.ಎಸ್ಸಿ'],
      ml: ['ബി.ടെക് (B.Tech)', 'ബി.എസ്സി'],
      pa: ['ਬੀ.ਟੈਕ (B.Tech)', 'ਬੀ.ਐਸਸੀ'],
      or: ['ବି.ଟେକ୍ (B.Tech)', 'ବି.ଏସସି'],
      en: ['B.Tech', 'B.Sc', 'Diploma']
    },
    academic_year: {
      hi: ['द्वितीय वर्ष (Second Year)', 'तृतीय वर्ष', 'प्रथम वर्ष'],
      mr: ['द्वितीय वर्ष (Second Year)', 'तृतीय वर्ष', 'प्रथम वर्ष'],
      bn: ['দ্বিতীয় বর্ষ (Second Year)', 'প্রথম বর্ষ'],
      te: ['రెండవ సంవత్సరం (Second Year)', 'మొదటి సంవత్సరం'],
      ta: ['இரண்டாம் ஆண்டு (Second Year)', 'முதலாம் ஆண்டு'],
      gu: ['દ્વિતીય વર્ષ (Second Year)', 'પ્રથમ વર્ષ'],
      kn: ['ಎರಡನೇ ವರ್ಷ (Second Year)', 'ಮೊದಲ ವರ್ಷ'],
      ml: ['രണ്ടാം വർഷം (Second Year)'],
      pa: ['ਦੂਜਾ ਸਾਲ (Second Year)', 'ਪਹਿਲਾ ਸਾਲ'],
      or: ['ଦ୍ୱିତୀୟ ବର୍ଷ (Second Year)'],
      en: ['Second Year', 'Third Year', 'First Year']
    },
    annual_income: {
      hi: ['डेढ़ लाख रुपये (150000)', 'एक लाख बीस हजार', '85000'],
      mr: ['दीड लाख रुपये (150000)', 'एक लाख वीस हजार', '85000'],
      bn: ['দেড় লক্ষ টাকা (150000)', '৮৫০০০'],
      te: ['లక్షన్నర రూపాయలు (150000)', '85000'],
      ta: ['ஒன்றரை லட்சம் (150000)', '85000'],
      gu: ['દોઢ લાખ રૂપિયા (150000)', '85000'],
      kn: ['ಒಂದೂವರೆ ಲಕ್ಷ (150000)', '85000'],
      ml: ['ഒന്നര ലക്ഷം രൂപ (150000)', '85000'],
      pa: ['ਡੇਢ ਲੱਖ ਰੁਪਏ (150000)', '85000'],
      or: ['ଦେଢ଼ ଲକ୍ଷ ଟଙ୍କା (150000)', '85000'],
      en: ['150000 rupees', '120000', '85000']
    },
    category: {
      hi: ['ओबीसी (OBC)', 'सामान्य (General)', 'एससी (SC)'],
      mr: ['ओबीसी (OBC)', 'खुला प्रवर्ग (Open)', 'एससी (SC)'],
      bn: ['ওবিসি (OBC)', 'জেনারেল', 'এসসি'],
      te: ['ఓబీసీ (OBC)', 'జనరల్', 'ఎస్సీ'],
      ta: ['ஓபிசி (OBC)', 'பொது', 'எஸ்சி'],
      gu: ['ઓબીસી (OBC)', 'જનરલ', 'એસસી'],
      kn: ['ಒಬಿಸಿ (OBC)', 'ಜನರಲ್', 'ಎಸ್ಸಿ'],
      ml: ['ഒബിസി (OBC)', 'ജനറൽ', 'എസ്സി'],
      pa: ['ਓਬੀਸੀ (OBC)', 'ਜਨਰਲ', 'ਐਸਸੀ'],
      or: ['ଓବିସି (OBC)', 'ଜେନେରାଲ', 'ଏସସି'],
      en: ['OBC', 'General', 'SC']
    },
    district: {
      hi: ['पुणे', 'नागपुर', 'लखनऊ'],
      mr: ['पुणे', 'नागपूर', 'सातारा'],
      bn: ['কলকাতা', 'হাওড়া'],
      te: ['హైదరాబాద్', 'విశాఖపట్నం'],
      ta: ['சென்னை', 'மதுரை'],
      gu: ['અમદાવાદ', 'સુરત'],
      kn: ['ಬೆಂಗಳೂರು', 'ಮೈಸೂರು'],
      ml: ['തിരുവനന്തപുരം', 'കൊച്ചി'],
      pa: ['ਅੰਮ੍ਰਿਤਸਰ', 'ਲੁਧਿਆਣਾ'],
      or: ['ଭୁବନେଶ୍ୱର', 'କଟକ'],
      en: ['Pune', 'Nagpur', 'Lucknow']
    },
    document_status: {
      hi: ['हाँ, सभी दस्तावेज उपलब्ध हैं', 'हाँ, तैयार हैं'],
      mr: ['होय, सर्व कागदपत्रे उपलब्ध आहेत', 'होय, तयार आहेत'],
      bn: ['হ্যাঁ, সমস্ত নথি প্রস্তুত', 'হ্যাঁ'],
      te: ['అవును, అన్ని పత్రాలు సిద్ధంగా ఉన్నాయి'],
      ta: ['ஆம், அனைத்து ஆவணங்களும் தயாராக உள்ளன'],
      gu: ['હા, બધા દસ્તાવેજો તૈયાર છે'],
      kn: ['ಹೌದು, ಎಲ್ಲಾ ದಾಖಲೆಗಳು ಲಭ್ಯವಿದೆ'],
      ml: ['അതെ, എല്ലാ രേഖകളും ലഭ്യമാണ്'],
      pa: ['ਹਾਂ, ਸਾਰੇ ਦਸਤਾਵੇਜ਼ ਤਿਆਰ ਹਨ'],
      or: ['ହଁ, ସମସ୍ତ ଦଲିଲ ପ୍ରସ୍ତୁତ ଅଛି'],
      en: ['Yes, documents ready', 'Yes, all available']
    }
  };

  // Browser Web Speech API setup
  const startListening = () => {
    // Prevent mic and audio playback conflict
    ttsAdapter.stop();
    setIsSpeaking(false);

    // Block voice when offline — STT uses cloud APIs (webkitSpeechRecognition → Google)
    if (networkStatus.isOffline) {
      setVoiceError(
        language === 'mr'
          ? 'इंटरनेट बंद असताना आवाज काम करत नाही. कृपया टाईप करा.'
          : language === 'en'
          ? 'Voice recognition requires an internet connection. Please type your answer.'
          : 'इंटरनेट बंद है — आवाज़ काम नहीं करेगी। कृपया नीचे टाइप करें।'
      );
      setShowFallback(true);
      return;
    }

    setVoiceError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const speechLangMap: Record<SupportedLanguage, string> = {
      hi: 'hi-IN',
      mr: 'mr-IN',
      bn: 'bn-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      gu: 'gu-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      pa: 'pa-IN',
      or: 'hi-IN',
      en: 'en-IN'
    };

    if (!SpeechRecognition) {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const samples = demoSamples[currentField.id]?.[language] || demoSamples[currentField.id]?.en || ['Sample answer'];
        handleUtterance(samples[0]);
      }, 1400);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = speechLangMap[language] || 'hi-IN';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const resultTranscript = event.results[current][0].transcript;
        setTranscript(resultTranscript);
        if (event.results[current].isFinal) {
          recognition.stop();
          handleUtterance(resultTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission denied. Click below sample to test or type.');
        } else {
          setVoiceError('आवाज़ साफ़ सुनाई नहीं दी. कृपया दोबारा बोलें.');
          setShowFallback(true);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
      setShowFallback(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Replay question audio at normal (0.92x) or slow (0.70x) speed
  const handleRepeatAudio = (slow: boolean = false) => {
    stopListening();
    const promptText = currentField.prompt[language] || currentField.prompt.hi || currentField.prompt.en;
    if (!promptText) return;

    ttsAdapter.setRate(slow ? 0.70 : 0.92);
    setIsSpeaking(true);
    ttsAdapter.speak(
      promptText,
      language,
      () => setIsSpeaking(true),
      () => {
        setIsSpeaking(false);
        ttsAdapter.setRate(0.92);
      },
      () => {
        setIsSpeaking(false);
        ttsAdapter.setRate(0.92);
      }
    );
  };

  // Automatically halt speech on step progression or unmount
  useEffect(() => {
    ttsAdapter.stop();
    setIsSpeaking(false);
    return () => {
      ttsAdapter.stop();
    };
  }, [currentIdx]);

  // Send speech utterance to backend NLU / Extractor
  const handleUtterance = async (utteranceText: string) => {
    if (!utteranceText.trim()) return;
    setIsProcessing(true);
    setVoiceError(null);

    try {
      const response: AssistTurnResponse = await processVoiceTurn(
        sessionId,
        currentField.id,
        utteranceText,
        language
      );

      setIsProcessing(false);

      // Track trial count from backend metadata if available
      const respData = response as any;
      if (typeof respData.attempts === 'number') {
        setVoiceAttempts(respData.attempts);
      } else {
        setVoiceAttempts(prev => prev + 1);
      }

      if (response.decision === 'confirm' && response.candidate_value) {
        setPendingValue(response.candidate_value);
        setPendingMessage(response.assistant_message);
        setShowConfirmation(true);
        setShowFallback(false);
        setVoiceAttempts(0); // reset on successful confirm
      } else if (response.decision === 'retry') {
        setVoiceError('मान्य उत्तर नहीं मिला (Uncertain value). कृपया स्पष्ट बोलें.');
        setShowFallback(true);
      } else {
        setShowFallback(true);
      }
    } catch (err) {
      setIsProcessing(false);
      setVoiceError('Network timeout or parsing error. Data preserved.');
      setShowFallback(true);
    }
  };

  // Confirm gate (Explicit confirmation!)
  const handleConfirm = async () => {
    if (!pendingValue) return;

    const updated = [...fields];
    updated[currentIdx] = {
      ...currentField,
      value: pendingValue,
      confirmed: true
    };
    setFields(updated);

    // ── Persist to IndexedDB immediately (offline-safe) ───────────────────
    const nextIdx = currentIdx + 1;
    await saveSession(sessionId, 'scholarship_post_matric', language, nextIdx, updated);

    // ── Sync to backend: queue if offline, call directly if online ────────
    if (networkStatus.isOffline) {
      await enqueueSyncItem({
        sessionId,
        type: 'confirm_field',
        payload: { sessionId, fieldId: currentField.id, confirmed: true, candidateValue: pendingValue },
      });
    } else {
      // Fire-and-forget — answer is already saved locally
      confirmField(sessionId, currentField.id, true, pendingValue).catch(
        (err) => console.warn('[ServiceForm] confirmField backend error (non-critical):', err)
      );
    }

    setShowConfirmation(false);
    setPendingValue(null);
    setTranscript('');
    setShowFallback(false);
    setHelpTicketId(null);
    setVoiceAttempts(0); // reset on field advance

    if (currentIdx + 1 < fields.length) {
      setCurrentIdx(nextIdx);
    } else {
      onCompleteForm(updated);
    }
  };

  const handleChange = () => {
    setShowConfirmation(false);
    setPendingValue(null);
    setShowFallback(true);
  };

  const handleRetry = () => {
    setShowConfirmation(false);
    setPendingValue(null);
    setTranscript('');
    setShowFallback(false);
    startListening();
  };

  const handleFallbackText = async (text: string) => {
    setIsProcessing(true);
    const res = await submitFallbackText(sessionId, currentField.id, text);
    setIsProcessing(false);
    setPendingValue(res.candidate_value || text);
    setPendingMessage(`क्या "${res.candidate_value || text}" सही है?`);
    setShowConfirmation(true);
    setShowFallback(false);
  };

  const handleRequestHelp = async () => {
    setShowHumanHelpModal(true);
  };

  const currentLangObj = INDIAN_LANGUAGES.find(l => l.id === language) || INDIAN_LANGUAGES[0];

  return (
    <div className="min-h-screen w-full bg-black/45 backdrop-blur-md flex flex-col justify-between p-3.5 sm:p-6 text-white">

      {/* ── Real-time Connection Banner ────────────────────────────────── */}
      <ConnectionBanner
        status={networkStatus}
        pendingSyncCount={pendingCount}
        isSyncing={isSyncing}
      />

      {/* Top Header with Multilingual Quick Switcher */}
      <header className={`max-w-2xl mx-auto w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 ${networkStatus.isOffline ? 'mt-16' : ''}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-emerald-100 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-lg shadow-sm transition-all shrink-0 active:scale-95"
          >
            {language === 'mr' ? '← बाहेर पडा (Exit)' : language === 'en' ? '← Exit' : '← बाहर निकलें (Exit)'}
          </button>
          <div className="hidden sm:flex items-center gap-2 pl-1">
            <SevaVaaniLogo size={30} showWordmark={false} />
            <span className="text-xs font-black text-white tracking-tight">SEVA VAANI</span>
          </div>
        </div>

        {/* Language switch, Help trigger & Live Network Status pill */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Human Help Access */}
          <button
            type="button"
            id="btn-form-human-help"
            onClick={() => setShowHumanHelpModal(true)}
            className="touch-target-44 min-h-[32px] flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-900/90 to-teal-900/90 hover:from-emerald-800 hover:to-teal-800 border border-emerald-400/50 rounded-full shadow-sm text-xs font-bold text-emerald-100 backdrop-blur-md transition-all active:scale-95"
            title="इंसानी सहायता / Human Help"
          >
            <span>🆘</span>
            <span>{language === 'mr' ? 'मदत' : language === 'en' ? 'Help' : 'सहायता'}</span>
          </button>

          {/* Live read-only network pill */}
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors backdrop-blur-md ${
              networkStatus.isOffline
                ? 'bg-amber-950/70 text-amber-200 border-amber-500/40'
                : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {networkStatus.isOffline ? '⚡ Offline' : '📶 Online'}
          </span>

          {/* Quick Pan-India Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full shadow-sm text-xs font-bold text-emerald-200 backdrop-blur-md transition-all"
            >
              <span>🌐 {currentLangObj.native}</span>
              <span className="text-[9px] text-emerald-400">▼</span>
            </button>

            {showLanguageDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-[#111e14]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 z-50 p-2 max-h-64 overflow-y-auto">
                {INDIAN_LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      onLanguageChange(l.id);
                      setShowLanguageDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      language === l.id ? 'bg-emerald-600 text-white' : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span>{l.native}</span>
                    <span className="text-[10px] opacity-75">{l.english}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Conversation Stage */}
      <main className="max-w-xl mx-auto w-full my-auto py-2">
        {/* Progress Bar */}
        <ProgressBar fields={fields} currentIndex={currentIdx} />

        {/* Active Question Card */}
        <div className="bg-[#121f15]/85 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 md:p-6 border border-white/15 shadow-2xl text-center relative overflow-hidden mt-3 lang-devanagari">
          <div className="inline-block px-3 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold mb-2.5 shadow-inner">
            {language === 'mr'
              ? `प्रश्न ${currentIdx + 1} / ${fields.length}: ${currentField.label.mr || currentField.label.en}`
              : language === 'en'
              ? `Question ${currentIdx + 1} of ${fields.length}: ${currentField.label.en || currentField.label.hi}`
              : `प्रश्न ${currentIdx + 1} / ${fields.length}: ${currentField.label.hi || currentField.label.en}`}
          </div>

          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-normal">
            {currentField.prompt[language] || currentField.prompt.hi || currentField.prompt.en}
          </h3>

          <p className="text-xs text-emerald-200/70 mt-2 font-medium">
            {language === 'mr'
              ? 'माइक दाबून बोला. आपल्या उत्तराची लगेच पुष्टी केली जाईल.'
              : language === 'en'
              ? 'Tap microphone and speak. Your answer will be verified instantly.'
              : 'माइक दबाकर बोलें। आपके उत्तर की तुरंत पुष्टि की जाएगी।'}
          </p>

          {/* Trial Limit Indicator */}
          {voiceAttempts > 0 && (
            <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              voiceAttempts >= MAX_VOICE_TRIALS
                ? 'bg-red-950/70 text-red-300 border-red-500/50'
                : voiceAttempts === 2
                ? 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                : 'bg-slate-900/70 text-slate-300 border-slate-600/40'
            }`}>
              <span>{voiceAttempts >= MAX_VOICE_TRIALS ? '🚨' : '🎙️'}</span>
              <span>
                {language === 'en'
                  ? `Voice Attempt ${voiceAttempts}/${MAX_VOICE_TRIALS}`
                  : language === 'mr'
                  ? `प्रयत्न ${voiceAttempts}/${MAX_VOICE_TRIALS}`
                  : `प्रयास ${voiceAttempts}/${MAX_VOICE_TRIALS}`}
              </span>
              {voiceAttempts >= MAX_VOICE_TRIALS && (
                <span>
                  {language === 'en' ? '— Help Ticket Created' : language === 'mr' ? '— मदत तिकीट तयार' : '— सहायता टिकट बनाया'}
                </span>
              )}
            </div>
          )}

          {/* Explain This Field Context Guidance Trigger */}
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => setShowGuidance(true)}
              className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm group"
            >
              <span className="text-sm group-hover:scale-110 transition-transform">💡</span>
              <span>
                {language === 'mr'
                  ? 'हा रकाना समजून घ्या (Explain This Field)'
                  : language === 'en'
                  ? 'Explain This Field'
                  : 'इस फ़ील्ड को समझें (Explain This Field)'}
              </span>
            </button>
          </div>

          {/* Assistant Voice Accent wave */}
          <div className="flex items-center justify-center gap-1.5 my-3 h-5">
            <span className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isListening ? 'h-5 animate-pulse' : 'h-1.5'}`} />
            <span className={`w-1 bg-teal-300 rounded-full transition-all duration-300 ${isListening ? 'h-4 animate-bounce' : 'h-2'}`} />
            <span className={`w-1 bg-emerald-500 rounded-full transition-all duration-300 ${isListening ? 'h-5 animate-pulse' : 'h-3'}`} />
            <span className={`w-1 bg-teal-300 rounded-full transition-all duration-300 ${isListening ? 'h-3 animate-bounce' : 'h-2'}`} />
            <span className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isListening ? 'h-4 animate-pulse' : 'h-1.5'}`} />
          </div>
        </div>

        {/* Live / Last recognized Transcript */}
        <TranscriptCard
          transcript={transcript}
          isLive={isListening}
          language={language}
        />

        {/* Explicit Confirmation Card */}
        {showConfirmation && pendingValue && (
          <ConfirmationCard
            fieldName={currentField.id}
            fieldLabel={currentField.label[language] || currentField.label.hi || currentField.label.en}
            candidateValue={pendingValue}
            confirmMessage={pendingMessage || undefined}
            language={language}
            onConfirm={handleConfirm}
            onChange={handleChange}
            onRetry={handleRetry}
          />
        )}

        {/* Fallback Panel (When uncertain, retry or type) */}
        {showFallback && (
          <FallbackPanel
            fieldName={currentField.id}
            fieldLabel={currentField.label[language] || currentField.label.hi || currentField.label.en}
            language={language}
            onRetryVoice={startListening}
            onSubmitText={handleFallbackText}
            onRequestHelp={handleRequestHelp}
            helpTicketId={helpTicketId}
            helpError={helpError}
          />
        )}

        {/* Push-to-Talk Voice Button */}
        {!showConfirmation && (
          <VoiceButton
            isListening={isListening}
            isProcessing={isProcessing}
            isSpeaking={isSpeaking}
            error={voiceError}
            onStartListening={startListening}
            onStopListening={stopListening}
            onRepeatAudio={() => handleRepeatAudio(false)}
            onSlowRepeatAudio={() => handleRepeatAudio(true)}
            onToggleFallbackText={() => setShowFallback(!showFallback)}
            language={language}
          />
        )}

        {/* Clickable Quick Sample Utterances (Hackathon Demo Helpers) */}
        <div className="mt-4 pt-3 border-t border-white/10 text-center">
          <span className="text-[11px] font-semibold text-emerald-300/80 block mb-1.5 uppercase tracking-wider">
            {language === 'mr' ? 'त्वरित उदाहरणे (Quick Samples):' : language === 'en' ? 'Quick Sample Answers:' : 'त्वरित उदाहरण (Quick Samples):'}
          </span>
          <div className="flex flex-wrap justify-center gap-1.5">
            {(demoSamples[currentField.id]?.[language] || demoSamples[currentField.id]?.hi || demoSamples[currentField.id]?.en || []).map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setTranscript(sample);
                  handleUtterance(sample);
                }}
                className="px-3 py-1 text-xs bg-white/10 hover:bg-emerald-600/30 text-emerald-100 hover:text-white border border-white/15 hover:border-emerald-400/50 rounded-full backdrop-blur-md shadow-sm transition-all"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-1">
        🔒 बिना सहमति और पुष्टि के कोई भी डेटा जमा नहीं किया जाता है (Zero Unconfirmed Submissions)
      </footer>

      {/* Context-Aware Field Guidance Modal */}
      <FieldGuidanceModal
        fieldName={currentField.id}
        fieldLabel={currentField.label[language] || currentField.label.hi || currentField.label.en}
        language={language}
        isOpen={showGuidance}
        onClose={() => setShowGuidance(false)}
      />

      {/* Citizen-Facing Human Help Modal */}
      <HumanHelpModal
        isOpen={showHumanHelpModal}
        onClose={() => setShowHumanHelpModal(false)}
        language={language}
        sessionId={sessionId}
        currentFieldName={currentField.id}
        initialCategory={showFallback ? 'voice_not_understood' : 'other'}
      />
    </div>
  );
};

export default ServiceForm;
