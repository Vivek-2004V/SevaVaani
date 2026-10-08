// Minimal reactive state store for React Voice UI
export const initialSessionState = {
  sessionId: null,
  serviceId: "scholarship_application",
  language: "hi",
  status: "welcome", // welcome | collecting | ready_for_review | completed
  currentField: null,
  currentPrompt: "",
  transcript: "",
  pendingCandidate: null,
  values: {},
  attempts: 0,
  progress: { confirmedCount: 0, totalFields: 10, percentage: 0 },
  activeFieldDefinition: null,
  helpTicketId: null,
  applicationId: null,
  networkDelay: 0
};

export const UI_STRINGS = {
  hi: {
    serviceName: "राज्य पोस्ट-मैट्रिक छात्रवृत्ति योजना",
    brandTitle: "सेवा वाणी (SEVA VAANI)",
    brandSub: "डिजिटल सार्वजनिक सेवाओं के लिए बहुभाषी आवाज़ सहायक",
    welcomeTitle: "बोलकर आसानी से छात्रवृत्ति आवेदन भरें",
    welcomeSub: "कोई जटिल फ़ॉर्म नहीं, कोई टाइपिंग नहीं। अपनी भाषा में एक-एक सवाल का जवाब दें, पुष्टि करें और आवेदन पूरा करें।",
    startBtn: "आवेदन शुरू करें",
    micIdle: "बोलने के लिए माइक दबाएं",
    micListening: "सुन रहा हूँ... बोलिए",
    micProcessing: "समझ रहा हूँ...",
    confirmHeader: "कृपया पुष्टि करें (Confirmation Gate)",
    btnConfirmYes: "हाँ, सही है",
    btnConfirmNo: "नहीं, गलत है",
    btnTypeFallback: "लिखकर उत्तर दें (Text Fallback)",
    btnHumanHelp: "सहायता ऑपरेटर (Help)",
    consentLabel: "मैं प्रमाणित करता/करती हूँ कि इस छात्रवृत्ति आवेदन में दी गई सभी जानकारी पूर्ण और सत्य है।",
    btnSubmit: "अंतिम आवेदन जमा करें",
    completedBadge: "सफलतापूर्वक जमा किया गया",
    appIdLabel: "आवेदन क्रमांक (Application ID)",
    btnNewApp: "नया आवेदन शुरू करें",
    reviewTitle: "आवेदन समीक्षा (Review Summary)",
    stepLabel: "चरण"
  },
  mr: {
    serviceName: "राज्य पोस्ट-मॅट्रिक शिष्यवृत्ती योजना",
    brandTitle: "सेवा वाणी (SEVA VAANI)",
    brandSub: "डिजिटल सार्वजनिक सेवांसाठी बहुभाषिक आवाज सहाय्यक",
    welcomeTitle: "बोलून सहजपणे शिष्यवृत्ती अर्ज भरा",
    welcomeSub: "कोणताही क्लिष्ट फॉर्म नाही, टाइपिंग नाही. आपल्या मातृभाषेत एका वेळी एका प्रश्नाचे उत्तर द्या, पडताळणी करा आणि अर्ज पूर्ण करा.",
    startBtn: "अर्ज सुरू करा",
    micIdle: "बोलण्यासाठी माइक दाबा",
    micListening: "ऐकत आहे... बोला",
    micProcessing: "समजून घेत आहे...",
    confirmHeader: "कृपया पुष्टी करा (Confirmation Gate)",
    btnConfirmYes: "होय, बरोबर आहे",
    btnConfirmNo: "नाही, चूक आहे",
    btnTypeFallback: "टाईप करून उत्तर द्या (Text Fallback)",
    btnHumanHelp: "मदत ऑपरेटर (Help)",
    consentLabel: "मी प्रमाणित करतो/करते की या शिष्यवृत्ती अर्जात दिलेली सर्व माहिती खरी आणि अचूक आहे.",
    btnSubmit: "अंतिम अर्ज सादर करा",
    completedBadge: "यशस्वीरित्या सादर केला गेला",
    appIdLabel: "अर्ज क्रमांक (Application ID)",
    btnNewApp: "नवीन अर्ज सुरू करा",
    reviewTitle: "अर्ज पुनरावलोकन (Review Summary)",
    stepLabel: "पायरी"
  }
};
