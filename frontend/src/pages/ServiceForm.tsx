import React, { useState, useEffect, useRef } from 'react';
import { FormField, SupportedLanguage, AssistTurnResponse } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import { VoiceButton } from '../components/VoiceButton';
import { TranscriptCard } from '../components/TranscriptCard';
import { ConfirmationCard } from '../components/ConfirmationCard';
import { FallbackPanel } from '../components/FallbackPanel';
import { processVoiceTurn, confirmField, submitFallbackText, requestHumanHelp } from '../services/api';
import { INDIAN_LANGUAGES } from '../components/LanguageSelector';
import { SevaVaaniLogo } from '../components/SevaVaaniLogo';

export interface ServiceFormProps {
  sessionId: string;
  fields: FormField[];
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onCompleteForm: (fields: FormField[]) => void;
  onBack: () => void;
}

export const ServiceForm: React.FC<ServiceFormProps> = ({
  sessionId,
  fields: initialFields,
  language,
  onLanguageChange,
  onCompleteForm,
  onBack
}) => {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Voice Interaction state
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Confirmation state
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fallback state
  const [showFallback, setShowFallback] = useState(false);
  const [helpTicketId, setHelpTicketId] = useState<string | null>(null);

  // Low Internet Indicator
  const [isLowInternet, setIsLowInternet] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const recognitionRef = useRef<any>(null);

  const currentField = fields[currentIdx];

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

      if (response.decision === 'confirm' && response.candidate_value) {
        setPendingValue(response.candidate_value);
        setPendingMessage(response.assistant_message);
        setShowConfirmation(true);
        setShowFallback(false);
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

    await confirmField(sessionId, currentField.id, true, pendingValue);

    const updated = [...fields];
    updated[currentIdx] = {
      ...currentField,
      value: pendingValue,
      confirmed: true
    };
    setFields(updated);

    setShowConfirmation(false);
    setPendingValue(null);
    setTranscript('');
    setShowFallback(false);
    setHelpTicketId(null);

    if (currentIdx + 1 < fields.length) {
      setCurrentIdx(currentIdx + 1);
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
    const res = await requestHumanHelp(
      sessionId,
      `Difficulty on field ${currentField.id}: ${currentField.label.en}`
    );
    setHelpTicketId(res.ticket_id);
  };

  const currentLangObj = INDIAN_LANGUAGES.find(l => l.id === language) || INDIAN_LANGUAGES[0];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100 flex flex-col justify-between p-4 md:p-6 text-slate-800">
      {/* Top Header with Multilingual Quick Switcher */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200 shadow-sm"
          >
            ← बाहर निकलें (Exit)
          </button>
          <div className="hidden sm:flex items-center gap-2 pl-1">
            <SevaVaaniLogo size={30} showWordmark={false} />
            <span className="text-xs font-black text-slate-800 tracking-tight">SEVA VAANI</span>
          </div>
        </div>

        {/* Language switch & Low Internet indicator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLowInternet(!isLowInternet)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              isLowInternet
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isLowInternet ? '⚡ Low Net' : '📶 Online'}
          </button>

          {/* Quick Pan-India Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/95 border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-blue-700 hover:bg-blue-50"
            >
              <span>🌐 {currentLangObj.native}</span>
              <span className="text-[9px] text-slate-400">▼</span>
            </button>

            {showLanguageDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 max-h-64 overflow-y-auto">
                {INDIAN_LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      onLanguageChange(l.id);
                      setShowLanguageDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      language === l.id ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
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
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xl text-center relative overflow-hidden mt-3">
          <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold mb-3">
            प्रश्न {currentIdx + 1} / {fields.length}: {currentField.label[language] || currentField.label.hi || currentField.label.en}
          </div>

          <h3 className="text-xl md:text-2xl font-bold text-slate-800 leading-snug">
            {currentField.prompt[language] || currentField.prompt.hi || currentField.prompt.en}
          </h3>

          <p className="text-xs text-slate-400 mt-2 font-medium">
            माइक दबाकर बोलें। आपके उत्तर की तुरंत पुष्टि की जाएगी।
          </p>

          {/* Assistant Voice Accent wave */}
          <div className="flex items-center justify-center gap-1.5 my-3 h-5">
            <span className={`w-1 bg-blue-500 rounded-full transition-all duration-300 ${isListening ? 'h-5 animate-pulse' : 'h-1.5'}`} />
            <span className={`w-1 bg-blue-400 rounded-full transition-all duration-300 ${isListening ? 'h-4 animate-bounce' : 'h-2'}`} />
            <span className={`w-1 bg-blue-600 rounded-full transition-all duration-300 ${isListening ? 'h-5 animate-pulse' : 'h-3'}`} />
            <span className={`w-1 bg-blue-400 rounded-full transition-all duration-300 ${isListening ? 'h-3 animate-bounce' : 'h-2'}`} />
            <span className={`w-1 bg-blue-500 rounded-full transition-all duration-300 ${isListening ? 'h-4 animate-pulse' : 'h-1.5'}`} />
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
          />
        )}

        {/* Push-to-Talk Voice Button */}
        {!showConfirmation && (
          <VoiceButton
            isListening={isListening}
            isProcessing={isProcessing}
            error={voiceError}
            onStartListening={startListening}
            onStopListening={stopListening}
            language={language}
          />
        )}

        {/* Clickable Quick Sample Utterances (Hackathon Demo Helpers) */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 text-center">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
            त्वरित उदाहरण (Quick Samples):
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
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-full shadow-2xs transition-colors"
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
    </div>
  );
};

export default ServiceForm;
