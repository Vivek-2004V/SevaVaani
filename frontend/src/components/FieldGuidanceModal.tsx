import React, { useState } from 'react';
import { SupportedLanguage } from '../types';
import { ttsAdapter } from '../services/ttsAdapter';

interface FieldGuidanceModalProps {
  fieldName: string;
  fieldLabel: string;
  language: SupportedLanguage;
  isOpen: boolean;
  onClose: () => void;
}

interface GuidanceData {
  title: Record<string, string>;
  explanation: Record<string, string>;
  example: Record<string, string>;
  spokenText: Record<string, string>;
  spellingSensitive?: boolean;
  spellingGuidance?: Record<string, string>;
}

const GUIDANCE_MAP: Record<string, GuidanceData> = {
  full_name: {
    title: {
      hi: 'पूरा नाम (Full Name)',
      mr: 'पूर्ण नाव (Full Name)',
      en: 'Full Name'
    },
    explanation: {
      hi: 'यहाँ आवेदक (जिसके लिए प्रमाण पत्र या फॉर्म है) का वही नाम लिखना है जो आधार कार्ड या स्कूल प्रमाण पत्र में दर्ज है।',
      mr: 'येथे अर्जदाराचे तेच नाव सांगावे जे आधार कार्ड किंवा शाळा सोडल्याच्या दाखल्यावर आहे.',
      en: 'State the applicant\'s official name exactly as shown on their Aadhaar card or educational mark sheet.'
    },
    example: {
      hi: 'उदा. "रमेश कुमार शर्मा" या "पूजा संजय पाटिल"',
      mr: 'उदा. "सचिन बापूराव पाटील" किंवा "अनिता विठ्ठल गायकवाड"',
      en: 'e.g., "Ramesh Kumar Sharma" or "Pooja Sanjay Patil"'
    },
    spokenText: {
      hi: 'पूरा नाम का मतलब है आपका आधिकारिक नाम जैसा आधार कार्ड पर लिखा है। उदाहरण के लिए, रमेश कुमार शर्मा। आवाज़ से बोलने के बाद कृपया स्पेलिंग भी जांच लें।',
      mr: 'पूर्ण नाव म्हणजे आपले आधार कार्डावरील अधिकृत नाव. उदा. सचिन बापूराव पाटील. उच्चारानंतर कृपया स्पेलिंग देखील तपासून घ्या.',
      en: 'Full Name means your official legal name as shown on your Aadhaar card. After confirming by voice, please also verify the spelling character by character.'
    },
    spellingSensitive: true,
    spellingGuidance: {
      hi: '⚠️ सरकारी प्रमाण पत्र में स्पेलिंग बहुत महत्वपूर्ण है। वॉइस पुष्टि के बाद यह जांच लें कि स्पेलिंग आधार कार्ड से मेल खाती है।',
      mr: '⚠️ शासकीय प्रमाणपत्रात स्पेलिंग अत्यंत महत्त्वाची असते. आवाजाच्या पुष्टीनंतर स्पेलिंग आधार कार्डाप्रमाणे असल्याची खात्री करा.',
      en: '⚠️ Official documents require exact character matching. Please verify spelling against your ID after voice confirmation.'
    }
  },
  father_name: {
    title: {
      hi: 'पिता या अभिभावक का नाम',
      mr: 'वडिलांचे किंवा पालकांचे नाव',
      en: 'Father / Guardian Name'
    },
    explanation: {
      hi: 'यहाँ आपके पिता या कानूनी संरक्षक का नाम आएगा। यदि पिता नहीं हैं तो माता या अभिभावक का नाम दें।',
      mr: 'येथे आपल्या वडिलांचे किंवा कायदेशीर पालकांचे नाव सांगावे.',
      en: 'The legal name of your father or legal guardian as shown on official family records.'
    },
    example: {
      hi: 'उदा. "श्री रामप्रसाद शर्मा"',
      mr: 'उदा. "बापूराव दत्तात्रय पाटील"',
      en: 'e.g., "Ramprasad Sharma"'
    },
    spokenText: {
      hi: 'पिता या अभिभावक का नाम का मतलब है आपके पिता या संरक्षक का नाम जैसा राशन कार्ड या आधार में है।',
      mr: 'वडिलांचे किंवा पालकांचे नाव म्हणजे राशन कार्ड किंवा ओळखपत्रावरील अधिकृत नाव.',
      en: 'Father or Guardian Name is the legal name of your parent or legal guardian on official records.'
    },
    spellingSensitive: true,
    spellingGuidance: {
      hi: 'प्रमाण पत्रों में पिता के नाम की स्पेलिंग 10वीं की मार्कशीट या राशन कार्ड के अनुसार होनी चाहिए।',
      mr: 'दाखल्यामध्ये वडिलांच्या नावाची स्पेलिंग १०वीच्या गुणपत्रिकेप्रमाणे असावी.',
      en: 'Ensure father\'s name spelling matches the applicant\'s school mark sheet.'
    }
  },
  dob: {
    title: {
      hi: 'जन्म तिथि (Date of Birth)',
      mr: 'जन्मतारीख (Date of Birth)',
      en: 'Date of Birth'
    },
    explanation: {
      hi: 'आप जिस दिन पैदा हुए थे, वह दिन, महीना और साल। जैसे 15/08/2004।',
      mr: 'आपला जन्म झालेला दिवस, महिना आणि वर्ष. उदा. 14/08/2004.',
      en: 'The day, month, and year you were born, in Day/Month/Year format.'
    },
    example: {
      hi: 'उदा. "15 अगस्त 2004" (15/08/2004)',
      mr: 'उदा. "चौदा ऑगस्ट दोन हजार चार" (14/08/2004)',
      en: 'e.g., "14 August 2004" (14/08/2004)'
    },
    spokenText: {
      hi: 'जन्म तिथि का मतलब है आपका जन्मदिन, महीना और साल। उदाहरण के लिए, पंद्रह अगस्त दो हज़ार चार।',
      mr: 'जन्मतारीख म्हणजे आपला जन्म झालेला दिवस, महिना आणि वर्ष. उदा. चौदा ऑगस्ट दोन हजार चार.',
      en: 'Date of birth means your day, month, and year of birth. For example, fourteenth of August two thousand four.'
    }
  },
  mobile: {
    title: {
      hi: 'मोबाइल नंबर (Mobile Number)',
      mr: 'मोबाईल क्रमांक (Mobile Number)',
      en: 'Mobile Number'
    },
    explanation: {
      hi: 'आपका चालू 10 अंकों का मोबाइल नंबर जिस पर सरकार से ओटीपी (OTP) और आवेदन स्थिति के मैसेज आते हैं।',
      mr: 'आपला चालू १० अंकी मोबाईल नंबर ज्यावर अर्जाची स्थिती आणि ओटीपी मेसेज येतील.',
      en: 'Your active 10-digit phone number that receives application status SMS and OTPs.'
    },
    example: {
      hi: 'उदा. "9876543210"',
      mr: 'उदा. "9876543210"',
      en: 'e.g., "9876543210"'
    },
    spokenText: {
      hi: 'मोबाइल नंबर पूरे दस अंक का होना चाहिए। हम आपको यह नंबर दोहराकर सुनाएंगे ताकि कोई अंक छूटे नहीं।',
      mr: 'मोबाईल नंबर पूर्ण दहा अंकांचा असावा. कोणताही अंक चुकू नये म्हणून आम्ही तो वाचून दाखवू.',
      en: 'Mobile number must be ten digits. We will read back the digits in groups so you can verify them.'
    }
  },
  annual_income: {
    title: {
      hi: 'वार्षिक आय (Annual Income)',
      mr: 'वार्षिक उत्पन्न (Annual Income)',
      en: 'Annual Family Income'
    },
    explanation: {
      hi: 'वार्षिक आय का मतलब है कि आपके पूरे परिवार की एक साल (12 महीने) में सभी स्रोतों (खेती, मजदूरी, नौकरी, दुकान आदि) से कुल कितनी कमाई होती है। यह महीने की कमाई नहीं है।',
      mr: 'वार्षिक उत्पन्न म्हणजे आपल्या संपूर्ण कुटुंबाची एका वर्षात (१२ महिने) सर्व मार्गांनी (शेती, मजुरी, नोकरी, व्यवसाय) झालेली एकूण कमाई. ही महिन्याची नव्हे, तर पूर्ण वर्षाची कमाई असते.',
      en: 'Annual income means total earnings of your whole household from all sources across an entire year (12 months), not monthly income.'
    },
    example: {
      hi: 'उदा. अगर महीने में लगभग ₹16,000 की कमाई है, तो साल की आय लगभग ₹2,00,000 (दो लाख रुपये) होगी।',
      mr: 'उदा. जर महिन्याला सुमारे ₹16,000 मिळत असतील, तर वर्षाचे उत्पन्न ₹2,00,000 (दोन लाख रुपये) होईल.',
      en: 'e.g., If monthly household earnings are ₹16,000, the annual income is approximately ₹2,00,000 (Two Lakh Rupees).'
    },
    spokenText: {
      hi: 'वार्षिक आय का मतलब है पूरे परिवार की एक साल की कुल कमाई। यह महीने की कमाई नहीं है। उदाहरण के लिए, दो लाख रुपये।',
      mr: 'वार्षिक उत्पन्न म्हणजे संपूर्ण कुटुंबाची एका वर्षाची एकूण कमाई. उदा. दोन लाख रुपये.',
      en: 'Annual income means your total family income for the whole year, not just one month. For example, two lakh rupees.'
    }
  },
  category: {
    title: {
      hi: 'सामाजिक श्रेणी / प्रवर्ग (Category)',
      mr: 'सामाजिक प्रवर्ग (Category)',
      en: 'Social Reservation Category'
    },
    explanation: {
      hi: 'आपकी जाति श्रेणी जिसके तहत आप छात्रवृत्ति या सरकारी आरक्षण के पात्र हैं (जैसे ओबीसी, एससी, एसटी या सामान्य)।',
      mr: 'आपला सामाजिक प्रवर्ग ज्यानुसार आपल्याला शासकीय सवलती किंवा शिष्यवृत्ती मिळते (उदा. SC, ST, OBC किंवा खुला प्रवर्ग).',
      en: 'Your reservation category eligible for government welfare schemes (SC, ST, OBC, General, or Other).'
    },
    example: {
      hi: 'उदा. "ओबीसी" (OBC) या "सामान्य" (General)',
      mr: 'उदा. "ओबीसी" किंवा "खुला प्रवर्ग"',
      en: 'e.g., "OBC", "SC", "ST", or "General"'
    },
    spokenText: {
      hi: 'कैटेगरी का मतलब आपकी जाति श्रेणी है, जैसे ओबीसी, एससी, एसटी या सामान्य।',
      mr: 'प्रवर्ग म्हणजे आपली सामाजिक जात श्रेणी, जसे की ओबीसी, एससी, एसटी किंवा खुला प्रवर्ग.',
      en: 'Category means your reservation category such as OBC, SC, ST, or General.'
    }
  },
  district: {
    title: {
      hi: 'गृह जिला (District)',
      mr: 'गृह जिल्हा (District)',
      en: 'Home District'
    },
    explanation: {
      hi: 'वह प्रशासनिक जिला जहाँ आपका स्थायी निवास या गांव स्थित है।',
      mr: 'आपले गाव किंवा मूळ कायमस्वरूपी घर ज्या प्रशासकीय जिल्ह्यात येते.',
      en: 'The administrative district of your permanent legal residence.'
    },
    example: {
      hi: 'उदा. "पुणे", "नागपुर", "भोपाल", "इंदौर"',
      mr: 'उदा. "पुणे", "नागपूर", "सातारा", "छत्रपती संभाजीनगर"',
      en: 'e.g., "Pune", "Nagpur", "Bhopal"'
    },
    spokenText: {
      hi: 'जिला का मतलब आपका गृह जिला जहाँ आपका स्थायी निवास है, जैसे पुणे या नागपुर।',
      mr: 'जिल्हा म्हणजे आपले मूळ गाव ज्या जिल्ह्यात येते, उदा. पुणे किंवा नागपूर.',
      en: 'District means your home administrative district where you permanently reside, such as Pune or Nagpur.'
    }
  }
};

export const FieldGuidanceModal: React.FC<FieldGuidanceModalProps> = ({
  fieldName,
  fieldLabel,
  language,
  isOpen,
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isOpen) return null;

  const data = GUIDANCE_MAP[fieldName] || {
    title: { [language]: fieldLabel },
    explanation: {
      hi: `इस फ़ील्ड में '${fieldLabel}' के लिए अपना विवरण दें।`,
      mr: `या रकान्यात '${fieldLabel}' साठी आपले तपशील द्या.`,
      en: `Please state your information for '${fieldLabel}'.`
    },
    example: {
      hi: 'कृपया अपना सही विवरण बोलें।',
      mr: 'कृपया आपले अचूक तपशील सांगा.',
      en: 'Please state your accurate details.'
    },
    spokenText: {
      hi: `कृपया ${fieldLabel} के लिए अपना विवरण बोलें।`,
      mr: `कृपया ${fieldLabel} साठी आपले तपशील सांगा.`,
      en: `Please state your details for ${fieldLabel}.`
    }
  };

  const title = data.title[language] || data.title.hi || data.title.en || fieldLabel;
  const explanation = data.explanation[language] || data.explanation.hi || data.explanation.en;
  const example = data.example[language] || data.example.hi || data.example.en;
  const spoken = data.spokenText[language] || data.spokenText.hi || data.spokenText.en;
  const spellingGuidance = data.spellingGuidance ? (data.spellingGuidance[language] || data.spellingGuidance.hi) : null;

  const handleReadAloud = () => {
    if (isPlaying) {
      ttsAdapter.stop();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    ttsAdapter.speak(
      spoken,
      language,
      () => setIsPlaying(true),
      () => setIsPlaying(false),
      () => setIsPlaying(false)
    );
  };

  const handleClose = () => {
    ttsAdapter.stop();
    setIsPlaying(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0e1a11] border border-emerald-500/30 rounded-3xl p-4 sm:p-6 md:p-8 max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl text-left relative lang-devanagari">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-emerald-400 font-semibold tracking-wide uppercase">
                {language === 'mr' ? 'सोप्या भाषेत समजावून घ्या' : language === 'en' ? 'Field Comprehension Guide' : 'सरल भाषा में समझें'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Plain Language Meaning Card */}
        <div className="bg-emerald-950/60 border border-emerald-500/20 rounded-2xl p-4 mb-4">
          <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span>📖</span>
            <span>{language === 'mr' ? 'याचा अर्थ काय?' : language === 'en' ? 'What does this mean?' : 'इसका क्या मतलब है?'}</span>
          </h4>
          <p className="text-sm md:text-base text-slate-100 leading-relaxed font-normal">
            {explanation}
          </p>
        </div>

        {/* Concrete Example */}
        {example && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-4">
            <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>🎯</span>
              <span>{language === 'mr' ? 'उदाहरण (Example)' : language === 'en' ? 'Practical Example' : 'उदाहरण (Example)'}</span>
            </h4>
            <p className="text-sm text-slate-200 font-medium">
              {example}
            </p>
          </div>
        )}

        {/* Spelling vs Voice Confirmation Guidance for Sensitive Fields */}
        {spellingGuidance && (
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 mb-5 text-amber-200 text-xs leading-relaxed">
            <p className="font-medium">
              {spellingGuidance}
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {/* Read Aloud Voice Button */}
          <button
            onClick={handleReadAloud}
            className={`w-full sm:w-auto flex-1 px-4 py-3 rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <span>{isPlaying ? '⏹' : '🔊'}</span>
            <span>
              {isPlaying
                ? (language === 'mr' ? 'आवाज थांबवा' : language === 'en' ? 'Stop Audio' : 'आवाज़ रोकें')
                : (language === 'mr' ? 'आवाजात ऐका (Read Aloud)' : language === 'en' ? 'Listen in Voice (Read Aloud)' : 'आवाज़ में सुनें (Read Aloud)')}
            </span>
          </button>

          {/* I Understand Button */}
          <button
            onClick={handleClose}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs md:text-sm font-bold transition-colors"
          >
            {language === 'mr' ? 'समजले (I Understand)' : language === 'en' ? 'I Understand' : 'समझ गया (I Understand)'}
          </button>
        </div>
      </div>
    </div>
  );
};
