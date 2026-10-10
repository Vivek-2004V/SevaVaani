import React, { useState, useEffect } from 'react';
import { SupportedLanguage } from '../types';
import { SylvaHero } from '../effects/sylva-living-world/SylvaLivingWorldScene';
import logoImg from '../assets/seva-vaani-logo.png';
import { loginUser, registerUser, setAuthToken, AuthUser } from '../services/api';
import { LegalModal, LegalModalTab } from '../components/LegalModal';
import { HumanHelpModal } from '../components/HumanHelpModal';

export interface WelcomeProps {
  currentUser?: AuthUser | null;
  language?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  onLoginSuccess: (user: AuthUser, token: string) => void;
  onLogout: () => void;
  onStartVoice: () => void;
  onOpenJudgeMode: () => void;
  onGoToDashboard?: () => void;
}

export type WelcomeTab = 'home' | 'how-it-works' | 'services' | 'stories' | 'help';

export const Welcome: React.FC<WelcomeProps> = ({
  currentUser = null,
  language = 'hi',
  onLanguageChange,
  onLoginSuccess,
  onLogout,
  onStartVoice,
  onOpenJudgeMode,
  onGoToDashboard
}) => {
  const [activeTab, setActiveTab] = useState<WelcomeTab>('home');
  const [showOverlay, setShowOverlay] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Authentication Dialog & Session State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Legal Modal (Privacy Policy & Terms of Use)
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalModalTab>('privacy');

  const handleHeroStart = () => {
    onStartVoice();
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');
    setAuthLoading(true);

    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPassword = authPassword;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setAuthError('कृपया एक मान्य ईमेल पता दर्ज करें (Please enter a valid email address)');
      setAuthLoading(false);
      return;
    }

    // Validate password
    if (cleanPassword.length < 8) {
      setAuthError('सुरक्षा के लिए पासवर्ड कम से कम 8 वर्णों का होना चाहिए (Password must be at least 8 characters)');
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === 'login') {
        const res = await loginUser(cleanEmail, cleanPassword);
        setAuthToken(res.token);
        setAuthSuccessMsg('✅ लॉगिन सफल! डैशबोर्ड पर भेजा जा रहा है...');
        setTimeout(() => {
          setAuthModalOpen(false);
          setAuthSuccessMsg('');
          setAuthEmail('');
          setAuthPassword('');
          onLoginSuccess(res.user, res.token);
        }, 500);
      } else {
        // Step 3 & 4: Register account -> Redirect to Login with success message
        await registerUser(cleanEmail, cleanPassword);
        setAuthMode('login');
        setAuthPassword(''); // Clear password field for security
        setAuthSuccessMsg('✅ खाता सफलतापूर्वक बन गया! कृपया लॉगिन करने के लिए अपना पासवर्ड दर्ज करें। (Account created! Please login)');
      }
    } catch (err: any) {
      const rawMsg = err.message || '';
      if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('fetch')) {
        setAuthError('सर्वर से संपर्क नहीं हो पा रहा है। कृपया सुनिश्चित करें कि बैकएंड सर्वर (Port 8000) चालू है।');
      } else {
        setAuthError(rawMsg || 'प्रमाणीकरण में त्रुटि हुई');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SEVA_ACTION') {
        if (event.data.action === 'start_voice') {
          handleHeroStart();
        } else if (event.data.action === 'services') {
          setActiveTab('services');
        } else if (event.data.action === 'how_it_works') {
          setActiveTab('how-it-works');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser, onGoToDashboard, onStartVoice]);

  const navTabs: { id: WelcomeTab; label: string }[] = language === 'en' ? [
    { id: 'home', label: 'Home' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'services', label: 'Public Services' },
    { id: 'stories', label: 'Citizen Stories' },
    { id: 'help', label: 'Help Center' }
  ] : language === 'mr' ? [
    { id: 'home', label: 'मुख्य पृष्ठ' },
    { id: 'how-it-works', label: 'कसे काम करते?' },
    { id: 'services', label: 'शासकीय योजना' },
    { id: 'stories', label: 'नागरिकांचा आवाज' },
    { id: 'help', label: 'मदत केंद्र' }
  ] : [
    { id: 'home', label: 'मुख्य पृष्ठ' },
    { id: 'how-it-works', label: 'काम कैसे करता है?' },
    { id: 'services', label: 'सरकारी योजनाएँ' },
    { id: 'stories', label: 'नागरिकों की आवाज़' },
    { id: 'help', label: 'सहायता केंद्र' }
  ];

  const trustCards = language === 'en' ? [
    {
      title: 'Comfort in 11 Mother Tongues',
      desc: 'Speak naturally in Hindi, Marathi, Bengali, Tamil, Telugu and more — zero English compulsion.',
      icon: '🗣️'
    },
    {
      title: 'One Simple Question at a Time',
      desc: 'No confusing forms, no eye strain. Only one straightforward question is asked per step.',
      icon: '📋'
    },
    {
      title: 'Proceeds Only on Your "Yes"',
      desc: 'What you say is read back clearly. Nothing is saved until you explicitly verify and confirm.',
      icon: '🛡️'
    },
    {
      title: 'Real Support When Stuck',
      desc: 'Facing voice issues? Type your answer or connect directly with local Seva operators.',
      icon: '🤝'
    },
    {
      title: 'Reliable on 2G/3G Networks',
      desc: 'Works offline & on weak internet. Your entered application data stays 100% safe.',
      icon: '⚡'
    }
  ] : language === 'mr' ? [
    {
      title: '११ मातृभाषांमध्ये संवाद',
      desc: 'मराठी, हिंदी, बंगाली, तमिळ, तेलगू यासह आपल्या स्वतःच्या भाषेत बोला — कोणतीही सक्ती नाही.',
      icon: '🗣️'
    },
    {
      title: 'एका वेळी एक सोपा प्रश्न',
      desc: 'कोणताही गुंतागुंतीचा अर्ज नाही. एका वेळी फक्त एकच साधा आणि स्पष्ट प्रश्न विचारला जातो.',
      icon: '📋'
    },
    {
      title: 'तुमच्या संमतीनेच पुढे',
      desc: 'तुम्ही जे बोललात ते पुन्हा वाचून दाखवले जाते. तुम्ही हो म्हणेपर्यंत काहीही नोंदवले जात नाही.',
      icon: '🛡️'
    },
    {
      title: 'अडचण आल्यास पूर्ण मदत',
      desc: 'आवाजात अडचण असल्यास टाईप करा किंवा स्थानिक सेवा ऑपरेटरकडून त्वरित मदत मिळवा.',
      icon: '🤝'
    },
    {
      title: 'कमकुवत २G/३G नेटवर्कवरही सुरक्षित',
      desc: 'धीम्या इंटरनेटमध्येही तुमची माहिती नष्ट होणार नाही. सर्व नोंद पूर्ण सुरक्षित राहते.',
      icon: '⚡'
    }
  ] : [
    {
      title: '11 मातृभाषाओं में अपनापन',
      desc: 'हिन्दी, मराठी, বাংলা, தமிழ், తెలుగు सहित अपनी बोली में बात करें — कोई अंग्रेजी की मजबूरी नहीं।',
      icon: '🗣️'
    },
    {
      title: 'एक समय में एक सरल बात',
      desc: 'न कोई उलझाऊ फॉर्म, न आँखों पर जोर। एक समय में सिर्फ एक सीधा सवाल पूछा जाता है।',
      icon: '📋'
    },
    {
      title: 'आपकी "हाँ" पर ही आगे बढ़ेगा',
      desc: 'जो आपने कहा, वही दोहराया जाएगा। जब तक आप पुष्टि न करें, कुछ भी दर्ज नहीं होगा।',
      icon: '🛡️'
    },
    {
      title: 'अटकने पर सच्चा सहारा',
      desc: 'आवाज़ में दिक्कत हो तो लिखकर बताएं या गाँव के सेवा ऑपरेटर से तुरंत मदद पाएं।',
      icon: '🤝'
    },
    {
      title: 'धीमे 2G/3G नेटवर्क पर भी पक्का',
      desc: 'कमजोर इंटरनेट में भी आपकी मेहनत व्यर्थ नहीं जाएगी। हर दर्ज जानकारी पूरी तरह सुरक्षित।',
      icon: '⚡'
    }
  ];

  const citizenStories = language === 'en' ? [
    {
      name: 'Anjali Patil',
      location: 'Kolhapur, Maharashtra',
      role: '1st Year B.Sc Student',
      quote: 'First person in our family to attend college. Cyber cafes asked for ₹300 per form. On Seva Vaani, I completed the entire application simply by speaking — without spending a single rupee!',
      service: 'Post-Matric Scholarship Scheme'
    },
    {
      name: 'Ramesh Vishwakarma',
      location: 'Satna, Madhya Pradesh',
      role: 'Artisan & Parent',
      quote: 'I cannot read or write English fluently. On Seva Vaani, when the mic was pressed and it asked me "What is the son\'s name?", it felt like an empathetic neighborhood friend helping me fill the form.',
      service: 'Family Income & Welfare Aid'
    },
    {
      name: 'Sunil Murmu',
      location: 'Bankura, West Bengal',
      role: 'Polytechnic Student',
      quote: 'Village mobile network is slow. Earlier, online forms used to crash mid-way. Here, nothing progresses until I hear it and confirm "Yes, correct". Zero fear of any errors.',
      service: 'Technical Education Scholarship'
    }
  ] : [
    {
      name: 'अंजलि पाटिल',
      location: 'कोल्हापुर, महाराष्ट्र',
      role: 'प्रथम वर्ष बी.एससी छात्रा',
      quote: 'हमारे परिवार में पहली बार कोई डिग्री कॉलेज जा रहा है। साइबर कैफ़े वाले फॉर्म भरने के 300 रुपये मांगते थे। सेवा वाणी पर मैंने सिर्फ मराठी में बोलकर पूरा फॉर्म भर लिया — एक भी रुपया खर्च नहीं हुआ!',
      service: 'पोस्ट-मैट्रिक छात्रवृत्ति योजना'
    },
    {
      name: 'रमेश विश्वकर्मा',
      location: 'सतना, मध्य प्रदेश',
      role: 'कारीगर व अभिभावक',
      quote: 'मुझे अंग्रेजी पढ़ना-लिखना नहीं आता। सेवा वाणी पर जब माइक दबाया और उसने हिन्दी में पूछा "बेटे का नाम क्या है", तो लगा जैसे गाँव का कोई समझदार साथी सामने बैठकर फॉर्म भरवा रहा है।',
      service: 'कौटुंबिक आय व शिक्षा सहायता'
    },
    {
      name: 'सुनील मुर्मू',
      location: 'बांकुड़ा, पश्चिम बंगाल',
      role: 'पॉलिटेक्निक छात्र',
      quote: 'गाँव में नेटवर्क बहुत धीमा रहता है। पहले ऑनलाइन फॉर्म बार-बार क्रैश हो जाता था। यहाँ जब तक मैंने खुद सुनकर "हाँ, सही है" नहीं कहा, तब तक कुछ भी आगे नहीं बढ़ा। कोई गलती होने का डर ही नहीं रहा।',
      service: 'तकनीकी शिक्षा छात्रवृत्ति'
    }
  ];

  const howItWorksSteps = language === 'en' ? [
    {
      step: '01',
      title: 'Choose Your Preferred Language',
      desc: 'Hindi, Marathi, Bengali, Tamil, Telugu, English or your regional language — speak freely in your own voice.'
    },
    {
      step: '02',
      title: 'Tap the Mic & Speak Naturally',
      desc: 'Just like speaking with an assistant at a citizen service center. Provide your name, college, year, or phone.'
    },
    {
      step: '03',
      title: 'Listen and Confirm with Confidence',
      desc: 'The assistant reads back your answer. Say "Yes, correct" or speak again to correct it instantly.'
    },
    {
      step: '04',
      title: 'Final Consent & Official Receipt',
      desc: 'Review your complete form at a glance, give final consent, and get your Application ID immediately.'
    }
  ] : language === 'mr' ? [
    {
      step: '01',
      title: 'आपली पसंतीची भाषा निवडा',
      desc: 'मराठी, हिंदी, बंगाली किंवा इतर कोणतीही भाषा — स्वतःच्या भाषेत सहज बोला.'
    },
    {
      step: '02',
      title: 'माइक दाबून सहज बोला',
      desc: 'सेवा केंद्रातील साहाय्यकाशी बोलल्याप्रमाणे नाव, कॉलेज, वर्ग किंवा मोबाइल नंबर सांगा.'
    },
    {
      step: '03',
      title: 'ऐका आणि तपासून खात्री करा',
      desc: 'साहाय्यक आपले उत्तर पुन्हा उच्चारेल. बरोबर असल्यास "होय" म्हणा किंवा त्वरित दुरुस्त करा.'
    },
    {
      step: '04',
      title: 'अंतिम संमती आणि अधिकृत पावती',
      desc: 'पूर्ण अर्ज एका दृष्टीक्षेपात तपासा, संमती द्या आणि त्वरित अर्ज क्रमांक मिळवा.'
    }
  ] : [
    {
      step: '01',
      title: 'अपनी पसंदीदा भाषा चुनें',
      desc: 'हिन्दी, मराठी, बंगाली, तमिल, तेलुगु या जिस भी भाषा में आप घर पर बात करते हैं — उसी में बातचीत शुरू करें।'
    },
    {
      step: '02',
      title: 'माइक दबाकर सीधे बोलें',
      desc: 'जैसे किसी सेवा केंद्र के सहायक से बात कर रहे हों। नाम, कॉलेज, कक्षा या मोबाइल नंबर बिना झिझक के बताएं।'
    },
    {
      step: '03',
      title: 'सुनें और तसल्ली से पुष्टि करें',
      desc: 'सहायक आपके उत्तर को दोहराएगा। यदि सही है तो "हाँ, सही है" कहें। यदि कोई सुधार है, तो तुरंत दोबारा बोलें।'
    },
    {
      step: '04',
      title: 'अंतिम सहमति और सरकारी रसीद',
      desc: 'पूरा फॉर्म एक नजर में देखें, अपनी स्वीकृति दें और तुरंत आधिकारिक आवेदन क्रमांक (Application ID) पाएं।'
    }
  ];

  const publicServices = language === 'en' ? [
    {
      title: 'Post-Matric Scholarship Scheme',
      dept: 'Higher Education & Social Justice Dept.',
      desc: 'Tuition reimbursement and maintenance allowance for 11th, 12th, ITI, Diploma, BE/BTech and Medical students.',
      status: 'Live (In-App Mode)',
      highlight: true
    },
    {
      title: 'National Scholarship Portal (NSP)',
      dept: 'Ministry of Electronics & IT / Central Portals',
      desc: 'Central scholarship schemes on scholarships.gov.in filled directly through SevaVaani voice extension.',
      status: 'Extension Live',
      highlight: true
    },
    {
      title: 'MahaDBT State Welfare Schemes',
      dept: 'Maharashtra State Government',
      desc: 'Direct voice assistance and auto-mapping on mahadbt.maharashtra.gov.in with zero unconfirmed commits.',
      status: 'Extension Live',
      highlight: true
    },
    {
      title: 'Aaple Sarkar / e-District Public Services',
      dept: 'Revenue & General Administration Dept.',
      desc: 'Income, Caste, and Domicile certificates on state portals filled through conversational voice guidance.',
      status: 'Extension Live',
      highlight: true
    }
  ] : [
    {
      title: 'पोस्ट-मैट्रिक छात्रवृत्ति (Scholarship)',
      dept: 'उच्च शिक्षा व सामाजिक न्याय विभाग',
      desc: '11वीं, 12वीं, आईटीआई, पॉलिटेक्निक, बीए, बीएससी, बीटेक और मेडिकल विद्यार्थियों के लिए शुल्क प्रतिपूर्ति व भत्ता।',
      status: 'सक्रिय (इन-ऐप मोड)',
      highlight: true
    },
    {
      title: 'राष्ट्रीय छात्रवृत्ति पोर्टल (NSP — scholarships.gov.in)',
      dept: 'इलेक्ट्रॉनिक्स व आईटी मंत्रालय / केंद्र सरकार',
      desc: 'केंद्र सरकार के आधिकारिक छात्रवृत्ति पोर्टल पर सेवा वाणी एक्सटेंशन के जरिए सीधे बोलकर फॉर्म भरें।',
      status: 'एक्सटेंशन सक्रिय (Live)',
      highlight: true
    },
    {
      title: 'महाडीबीटी (MahaDBT — mahadbt.maharashtra.gov.in)',
      dept: 'महाराष्ट्र राज्य शासन',
      desc: 'महाराष्ट्र सरकार की आधिकारिक छात्रवृत्ति व कल्याणकारी योजनाओं के फॉर्म पर वॉइस ऑटो-डिटेक्ट।',
      status: 'एक्सटेंशन सक्रिय (Live)',
      highlight: true
    },
    {
      title: 'आपले सरकार / ई-डिस्ट्रिक्ट (e-District Portals)',
      dept: 'राजस्व व सामाजिक कल्याण विभाग',
      desc: 'आय, जाति व मूल निवास प्रमाण पत्र के सरकारी फॉर्म पर एक्सटेंशन द्वारा सुरक्षित फील्ड मैपिंग।',
      status: 'एक्सटेंशन सक्रिय (Live)',
      highlight: true
    }
  ];

  // Render non-home tabs as an overlay panel
  const showPanel = activeTab !== 'home' || showOverlay;

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100svh' }}>

      {/* ══════════════════════════════════════════════════════════════════
          UNIFIED RESPONSIVE HEADER ARCHITECTURE
          - Single cohesive top bar across all screen sizes
          - Zero element collisions (flexbox justify-between)
          - Desktop (>= 1140px): Brand (Left) | Nav Tabs Pill (Center) | Actions (Right)
          - Tablet & Mobile (< 1140px): Brand (Left) | Language + Auth + Hamburger (Right)
          - Slide-down glass drawer for full navigation on smaller screens
      ══════════════════════════════════════════════════════════════════ */}
      <header className="seva-unified-header">
        <div className="seva-unified-header-container">
          {/* 1. Brand: Emerald Gradient Icon + "Seva Vaani" */}
          <div className="seva-header-brand-cluster">
            <button
              type="button"
              id="nav-brand"
              onClick={() => { setActiveTab('home'); setShowOverlay(false); setMobileMenuOpen(false); }}
              className="seva-brand-button"
            >
              <span className="seva-brand-icon-box">
                <img src={logoImg} alt="" aria-hidden="true" />
              </span>
              <span className="seva-brand-text">
                Seva Vaani
              </span>
            </button>
          </div>

          {/* 2. Desktop Navigation Capsule (Center - Visible >= 1140px) */}
          <nav className="seva-header-nav-tabs" aria-label="Seva Vaani Navigation">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-${tab.id}`}
                  type="button"
                  className={`seva-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => { setActiveTab(tab.id); setShowOverlay(tab.id !== 'home'); }}
                >
                  {tab.label}
                  {isActive && <span className="seva-tab-dot" />}
                </button>
              );
            })}
          </nav>

          {/* 3. Right Action Cluster: Extension CTA + Language + Auth + Hamburger */}
          <div className="seva-header-right-cluster">
            {/* Join to Extension CTA Button */}
            <button
              id="nav-cta-extension"
              type="button"
              className="seva-nav-extension-btn"
              onClick={() => {
                window.postMessage({ type: 'SEVA_VAANI_TOGGLE_PANEL' }, '*');
                setShowExtensionModal(true);
              }}
              title="Chrome Extension से जोड़ें (Join to Extension)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M19 11V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h7" />
                <path d="M15 19l3 3 6-6" />
                <path d="M12 9l3 3-3 3" />
              </svg>
              <span>एक्सटेंशन से जोड़ें</span>
            </button>

            {/* Language Switcher Pill */}
            {onLanguageChange && (
              <div className="seva-lang-pill-unified">
                {([
                  { id: 'hi', label: 'हिन्दी', short: 'हि' },
                  { id: 'mr', label: 'मराठी', short: 'म' },
                  { id: 'en', label: 'English', short: 'EN' }
                ] as const).map((l) => (
                  <button
                    key={l.id}
                    id={`btn-lang-desktop-${l.id}`}
                    type="button"
                    onClick={() => onLanguageChange(l.id as SupportedLanguage)}
                    className={language === l.id ? 'active' : ''}
                  >
                    <span className="lang-full">{l.label}</span>
                    <span className="lang-short">{l.short}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Authentication Area */}
            {currentUser ? (
              <div className="seva-header-user-badge">
                {onGoToDashboard && (
                  <button
                    id="btn-goto-dashboard"
                    type="button"
                    className="seva-btn-register"
                    onClick={onGoToDashboard}
                  >
                    {language === 'en' ? 'Dashboard →' : language === 'mr' ? 'डॅशबोर्ड →' : 'डैशबोर्ड →'}
                  </button>
                )}
                <div className="seva-user-badge-inner" id="auth-user-badge">
                  <span>👤</span>
                  <span className="seva-user-email-text" title={currentUser.email}>
                    {currentUser.email}
                  </span>
                  <button
                    id="btn-auth-logout"
                    type="button"
                    onClick={handleLogout}
                    className="seva-logout-link"
                    title={language === 'en' ? 'Logout' : 'लॉगआउट करें'}
                  >
                    {language === 'en' ? 'Logout' : 'लॉगआउट'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="seva-header-auth-buttons">
                {/* Login Button */}
                <button
                  id="btn-auth-login"
                  type="button"
                  className="seva-btn-login"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccessMsg('');
                    setAuthModalOpen(true);
                  }}
                  title={language === 'en' ? 'Citizen Login' : 'नागरिक लॉगिन (Login)'}
                >
                  {language === 'en' ? 'Login' : 'लॉगिन'}
                </button>

                {/* Create Account Button */}
                <button
                  id="btn-auth-register"
                  type="button"
                  className="seva-btn-register"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                    setAuthSuccessMsg('');
                    setAuthModalOpen(true);
                  }}
                  title={language === 'en' ? 'Create New Account' : 'नया खाता बनाएं (Create Account)'}
                >
                  {language === 'en' ? 'Sign Up' : 'खाता बनाएं'}
                </button>
              </div>
            )}

            {/* Responsive Hamburger Toggle (< 1140px) */}
            <button
              id="btn-mobile-menu-toggle"
              type="button"
              className="seva-header-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SLIDE-DOWN GLASS DRAWER (< 1140px)
        ══════════════════════════════════════════════════════════════════ */}
        {mobileMenuOpen && (
          <div className="seva-mobile-drawer">
            {/* Language Selection inside drawer */}
            {onLanguageChange && (
              <div style={{ padding: '4px 2px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {language === 'en' ? 'Select Language' : 'भाषा निवडा / भाषा चुनें'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { id: 'hi', label: 'हिन्दी' },
                    { id: 'mr', label: 'मराठी' },
                    { id: 'en', label: 'English' }
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => onLanguageChange(l.id as SupportedLanguage)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 10,
                        border: '1px solid',
                        borderColor: language === l.id ? '#34d399' : 'rgba(255,255,255,0.12)',
                        background: language === l.id ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)',
                        color: language === l.id ? '#6ee7b7' : '#e2e8f0',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.1)', margin: '2px 0' }} />

            {/* Navigation Links inside Drawer */}
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-mobile-${tab.id}`}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setShowOverlay(tab.id !== 'home');
                    setMobileMenuOpen(false);
                  }}
                  className="touch-target-44"
                  style={{
                    padding: '12px 14px',
                    minHeight: 44,
                    textAlign: 'left',
                    borderRadius: 12,
                    background: isActive ? 'rgba(52, 211, 153, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    border: isActive ? '1px solid rgba(52, 211, 153, 0.35)' : '1px solid transparent',
                    color: isActive ? '#6ee7b7' : '#e2e8f0',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}

            <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />

            {/* Extension Link inside Drawer */}
            <button
              id="nav-cta-extension-mobile"
              type="button"
              onClick={() => {
                window.postMessage({ type: 'SEVA_VAANI_TOGGLE_PANEL' }, '*');
                setShowExtensionModal(true);
                setMobileMenuOpen(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.28) 0%, rgba(6, 78, 59, 0.45) 100%)',
                color: '#6ee7b7',
                border: '1px solid rgba(52, 211, 153, 0.45)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 11V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h7" />
                <path d="M15 19l3 3 6-6" />
                <path d="M12 9l3 3-3 3" />
              </svg>
              एक्सटेंशन से जोड़ें
            </button>

            {/* Mobile Auth Buttons inside Drawer */}
            {!currentUser ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                <button
                  id="btn-auth-login-mobile"
                  type="button"
                  className="seva-btn-login"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccessMsg('');
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  style={{ padding: '10px', textAlign: 'center', fontSize: 13 }}
                >
                  {language === 'en' ? 'Login' : 'लॉगिन'}
                </button>
                <button
                  id="btn-auth-register-mobile"
                  type="button"
                  className="seva-btn-register"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                    setAuthSuccessMsg('');
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  style={{ padding: '10px', textAlign: 'center', fontSize: 13 }}
                >
                  {language === 'en' ? 'Sign Up' : 'खाता बनाएं'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: 12, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: '#6ee7b7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                  👤 {currentUser.email}
                </span>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {language === 'en' ? 'Logout' : 'लॉगआउट'}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          HOME PAGE CONTENT (Rendered when activeTab === 'home' and no overlay)
          ══════════════════════════════════════════════════════════════════ */}
      {!showPanel && (
        <main className="relative z-10 w-full min-h-screen pt-24 pb-24 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center">
          {/* Hero Section */}
          <section className="w-full text-center max-w-4xl mx-auto pt-6 pb-12 flex flex-col items-center">
            {/* National Initiative Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold backdrop-blur-md mb-6 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>🇮🇳 डिजिटल भारत • MeitY समर्थित जनसेवा नवाचार (Digital Public Good)</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.18] mb-6">
              {language === 'mr' ? (
                <>
                  बोलून शासकीय योजनांचे <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                    अर्ज सहज पूर्ण करा
                  </span>
                </>
              ) : language === 'en' ? (
                <>
                  Complete Digital Public Services <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                    Simply by Speaking
                  </span>
                </>
              ) : (
                <>
                  बोलकर सरकारी योजनाओं के <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                    आवेदन आसानी से भरें
                  </span>
                </>
              )}
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed mb-8">
              {language === 'mr'
                ? '११ भारतीय भाषांमध्ये संवादात्मक ध्वनी सहाय्य. एक वेळी एक साधा प्रश्न, १००% आपली संमती आणि शून्य चुकांची हमी.'
                : language === 'en'
                ? 'Conversational voice guidance in 11 Indian languages. One simple question at a time, verified strictly with your verbal consent.'
                : '11 भारतीय भाषाओं में संवादात्मक आवाज़ सहायता। एक बार में एक सरल सवाल, 100% आपकी मौखिक सहमति और साइबर कैफ़े के चक्करों से मुक्ति।'}
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10">
              <button
                type="button"
                id="btn-hero-start-voice"
                onClick={handleHeroStart}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/30 flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>🎙️</span>
                <span>
                  {language === 'mr'
                    ? 'आत्ताच अर्ज सुरू करा (Start Application)'
                    : language === 'en'
                    ? 'Start Voice Application Now'
                    : 'अभी बोलकर आवेदन शुरू करें'}
                </span>
              </button>

              <button
                type="button"
                id="btn-hero-open-extension"
                onClick={() => setShowExtensionModal(true)}
                className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 border border-emerald-400/40 font-bold text-sm backdrop-blur-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <span>🧩</span>
                <span>
                  {language === 'mr'
                    ? 'Chrome एक्सटेंशन जोडा'
                    : language === 'en'
                    ? 'Get Chrome Extension'
                    : 'Chrome एक्सटेंशन जोड़ें'}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenJudgeMode}
                className="px-5 py-3.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/40 font-bold text-sm backdrop-blur-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <span>⚖️</span>
                <span>Judge & Evaluation</span>
              </button>
            </div>

            {/* Interactive Live Voice Assistant Preview Box */}
            <div className="w-full max-w-2xl bg-gradient-to-b from-white/12 to-white/5 border border-white/20 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-2xl text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
                    स
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-white leading-tight">सेवा वाणी लाइव सहायक (Live Voice Assistant)</h2>
                    <span className="text-[11px] text-emerald-300">सक्रिय सत्र • पोस्ट-मैट्रिक छात्रवृत्ति</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>लाइव आवाज़ चालू</span>
                </span>
              </div>

              {/* Sample Speech Bubble */}
              <div className="space-y-3 mb-5">
                <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl text-sm text-emerald-100 flex items-start gap-2.5">
                  <span className="text-base mt-0.5">🔊</span>
                  <div>
                    <p className="font-semibold text-emerald-300 text-xs mb-0.5">सहायक ने पूछा (Assistant Prompt):</p>
                    <p className="text-sm font-medium">
                      {language === 'mr'
                        ? '"कृपया आपले संपूर्ण नाव सांगा, जसे आधार कार्डावर आहे."'
                        : language === 'en'
                        ? '"Please tell your full name as printed on your Aadhaar card."'
                        : '"कृपया अपना पूरा नाम बताएं, जैसा आपके आधार कार्ड पर लिखा है।"'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎙️</span>
                    <span>
                      {language === 'mr' ? 'नागरिक उत्तर (उदा.): "माझे नाव विवेक विश्वकर्मा आहे"' : 'नागरिक उत्तर (उदा.): "मेरा नाम विवेक विश्वकर्मा है"'}
                    </span>
                  </div>
                  <span className="text-emerald-400 text-[11px] font-bold">जांचें ✓</span>
                </div>
              </div>

              {/* Action trigger button */}
              <button
                type="button"
                onClick={handleHeroStart}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>बोलकर पूरा फॉर्म भरें (Start Voice Form)</span>
                <span>→</span>
              </button>
            </div>
          </section>

          {/* 4 Pillars of Trust Section */}
          <section className="w-full max-w-6xl mx-auto py-10 border-t border-white/10">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
                सार्वजनिक विश्वास के आधार • Pillars of Public Trust
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                हर नागरिक के लिए सुरक्षित, पारदर्शी और सहज
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trustCards.map((card, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/40 transition-all text-left backdrop-blur-md shadow-md"
                >
                  <div className="text-3xl mb-3">{card.icon}</div>
                  <h3 className="font-bold text-base text-emerald-300 mb-2 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Core Government Schemes Available */}
          <section className="w-full max-w-6xl mx-auto py-10 border-t border-white/10">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
                सरकारी योजनाएं • Active Schemes & Services
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                इन सेवाओं के लिए सीधे बोलकर आवेदन करें
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publicServices.map((svc, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/50 transition-all backdrop-blur-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                        {svc.status}
                      </span>
                      <span className="text-xs text-slate-400">{svc.dept}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{svc.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">{svc.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleHeroStart}
                    className="self-start px-4 py-1.5 rounded-full bg-emerald-600/40 hover:bg-emerald-500 hover:text-slate-950 text-emerald-200 border border-emerald-400/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>आवेदन शुरू करें (Apply via Voice)</span>
                    <span>→</span>
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works (4 Steps) */}
          <section className="w-full max-w-6xl mx-auto py-10 border-t border-white/10">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
                सरल प्रक्रिया • 4 Simple Steps
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                बिना साइबर कैफ़े के 3 मिनट में आवेदन पूरा
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {howItWorksSteps.map((step, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 text-left relative overflow-hidden backdrop-blur-md"
                >
                  <span className="text-4xl font-black text-emerald-500/20 absolute top-2 right-3">
                    {step.step}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-extrabold mb-3">
                    चरण {step.step}
                  </span>
                  <h3 className="font-bold text-sm sm:text-base text-white mb-2 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Citizen Stories */}
          <section className="w-full max-w-6xl mx-auto py-10 border-t border-white/10">
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
                नागरिकों का अनुभव • Real Citizen Stories
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                दूरदराज के गाँवों से सफलता की आवाज़ें
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {citizenStories.map((story, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 text-left flex flex-col justify-between backdrop-blur-md"
                >
                  <p className="text-xs sm:text-sm text-slate-200 italic leading-relaxed mb-4">
                    "{story.quote}"
                  </p>
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-sm font-bold text-white">{story.name}</p>
                    <p className="text-xs text-emerald-400">{story.role} • {story.location}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{story.service}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Final Call to Action Banner */}
          <section className="w-full max-w-4xl mx-auto mt-6 p-8 rounded-3xl bg-gradient-to-r from-emerald-900/60 via-teal-900/60 to-slate-900/80 border border-emerald-500/40 text-center backdrop-blur-xl shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
              अपनी भाषा में बेझिझक आवेदन करें
            </h2>
            <p className="text-sm text-emerald-100/90 max-w-xl mx-auto mb-6">
              कोई जटिल फॉर्म नहीं, कोई गलतियों का डर नहीं। सहायक से बात करें और सरकारी योजनाओं का सीधा लाभ उठाएं।
            </p>
            <button
              type="button"
              onClick={handleHeroStart}
              className="px-8 py-3.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-base shadow-xl transition-all transform hover:scale-105 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
            >
              <span>🎙️</span>
              <span>आवेदन शुरू करें (Start Application)</span>
            </button>
          </section>
        </main>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CONTENT OVERLAY PANELS
          Shown when a non-home tab is active, slides in over the SylvaHero.
          The SylvaHero stays rendered and animated below.
      ══════════════════════════════════════════════════════════════════ */}
      {showPanel && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-start', alignItems: 'center',
            padding: '88px 16px 36px',
            background: 'rgba(10,14,8,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            overflowY: 'auto'
          }}
        >
          <div style={{ maxWidth: 860, width: '100%', position: 'relative' }}>
            {/* Overlay Close / Back Button for mobile & desktop */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => { setActiveTab('home'); setShowOverlay(false); }}
                style={{
                  padding: '6px 14px', borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#e2e8f0', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  backdropFilter: 'blur(8px)'
                }}
              >
                {language === 'en' ? '✕ Close / Back to Home' : '✕ बंद करें / मुख्य पृष्ठ (Close)'}
              </button>
            </div>

            {/* HOW IT WORKS */}
            {activeTab === 'how-it-works' && (
              <div style={{ color: '#fff' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 14px',
                    borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: 'rgba(96,165,250,0.18)', color: '#93c5fd',
                    border: '1px solid rgba(96,165,250,0.32)',
                    textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>
                    {language === 'en' ? 'Simple 4-Step Journey' : 'सरल 4 चरणों की यात्रा'}
                  </span>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 16, color: '#fff' }}>
                    {language === 'en' ? 'Like Talking to a Friendly Neighbor' : 'जैसे किसी अपने मददगार से बात कर रहे हों'}
                  </h2>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
                    {language === 'en'
                      ? 'No robotic confusion. The entire process is transparent, secure, and under your control.'
                      : 'सेवा वाणी में कोई रोबोटिक उलझन नहीं है। यह प्रक्रिया पूरी तरह पारदर्शी और आपके नियंत्रण में है।'}
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {howItWorksSteps.map((step) => (
                    <div key={step.step} style={{
                      padding: 20, borderRadius: 20, display: 'flex', gap: 16,
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)'
                    }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 16,
                        background: 'rgba(96,165,250,0.22)', border: '1px solid rgba(96,165,250,0.38)',
                        color: '#93c5fd'
                      }}>{step.step}</div>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{step.title}</h3>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', marginTop: 6, lineHeight: 1.6 }}>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                  <button onClick={handleHeroStart} style={{
                    padding: '12px 30px', borderRadius: 999, background: '#fff', color: '#000',
                    border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                  }}>
                    {language === 'en' ? 'Try Voice Now →' : 'अभी बोलकर आज़माएँ →'}
                  </button>
                </div>
              </div>
            )}

            {/* SERVICES */}
            {activeTab === 'services' && (
              <div style={{ color: '#fff' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 14px',
                    borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: 'rgba(96,165,250,0.18)', color: '#93c5fd',
                    border: '1px solid rgba(96,165,250,0.32)',
                    textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>
                    {language === 'en' ? 'Citizen Welfare Services' : 'नागरिक कल्याण सेवाएं'}
                  </span>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 16, color: '#fff' }}>
                    {language === 'en' ? 'Government Assistance for Every Citizen' : 'हर छात्र और परिवार तक सरकारी मदद'}
                  </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {publicServices.map((svc, i) => (
                    <div key={i} style={{
                      padding: 20, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 8,
                      background: svc.highlight ? 'rgba(37,99,235,0.22)' : 'rgba(255,255,255,0.07)',
                      border: svc.highlight ? '1px solid rgba(96,165,250,0.42)' : '1px solid rgba(255,255,255,0.13)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{svc.dept}</span>
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 999,
                          background: svc.highlight ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.1)',
                          color: svc.highlight ? '#6ee7b7' : 'rgba(255,255,255,0.45)'
                        }}>{svc.status}</span>
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{svc.title}</h3>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{svc.desc}</p>
                      {svc.highlight && (
                        <button onClick={handleHeroStart} style={{
                          marginTop: 8, padding: '8px 18px', borderRadius: 999, background: '#fff', color: '#000',
                          border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start'
                        }}>
                          {language === 'en' ? 'Apply Now →' : 'अभी आवेदन करें →'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CITIZEN STORIES */}
            {activeTab === 'stories' && (
              <div style={{ color: '#fff' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 14px',
                    borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: 'rgba(96,165,250,0.18)', color: '#93c5fd',
                    border: '1px solid rgba(96,165,250,0.32)',
                    textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>
                    {language === 'en' ? 'Real Citizen Stories' : 'सच्चे अनुभव'}
                  </span>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 16, color: '#fff' }}>
                    {language === 'en' ? '"No More Depending on Middlemen"' : '"अब मुझे किसी के आगे हाथ जोड़ने की जरूरत नहीं"'}
                  </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  {citizenStories.map((story, i) => (
                    <div key={i} style={{
                      padding: 20, borderRadius: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)'
                    }}>
                      <div>
                        <div style={{ fontSize: 32, color: '#93c5fd', fontFamily: 'Georgia, serif', marginBottom: 12 }}>"</div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontStyle: 'italic', lineHeight: 1.7 }}>{story.quote}</p>
                      </div>
                      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.13)' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{story.name}</p>
                        <p style={{ fontSize: 11, color: '#93c5fd', marginTop: 2 }}>{story.role}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{story.location} • {story.service}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HELP */}
            {activeTab === 'help' && (
              <div style={{ color: '#fff' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 14px',
                    borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: 'rgba(251,191,36,0.15)', color: '#fcd34d',
                    border: '1px solid rgba(251,191,36,0.3)',
                    textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>
                    {language === 'en' ? 'Always With You' : 'हमेशा आपका साथ'}
                  </span>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 16, color: '#fff' }}>
                    {language === 'en' ? 'When Tech Falters, Human Help Steps In' : 'तकनीक जहाँ रुकेगी, इंसान वहाँ हाथ थामेगा'}
                  </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  {(language === 'en' ? [
                    { icon: '✍️', title: 'Text Fallback Mode', desc: 'If there is background noise or microphone issues, simply type your answer.' },
                    { icon: '🎫', title: 'Instant Support Tickets', desc: 'One click submits a help request. All your entered data remains safely preserved.' },
                    { icon: '🧑‍💼', title: 'CSC / VLE Operator Connect', desc: 'Direct alerts sent to local village service operators for human assistance.' }
                  ] : [
                    { icon: '✍️', title: 'लिखकर बताने की सुविधा', desc: 'यदि माइक में कोई शोर हो या आवाज़ पकड़ में न आए, तो आप कीबोर्ड से भी उत्तर टाइप कर सकते हैं।' },
                    { icon: '🎫', title: 'तत्काल सहायता टिकट', desc: 'एक क्लिक में सहायता अनुरोध दर्ज होता है। आपका भरा हुआ डेटा पूरी तरह सुरक्षित रहता है।' },
                    { icon: '🧑‍💼', title: 'सीएससी / वीएलई ऑपरेटर', desc: 'गाँव के डिजिटल सेवा केंद्र के ऑपरेटर को आपकी समस्या की सूचना तुरंत भेजी जाती है।' }
                  ]).map((item, i) => (
                    <div key={i} style={{
                      padding: 20, borderRadius: 20,
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)'
                    }}>
                      <div style={{ fontSize: 26, marginBottom: 12 }}>{item.icon}</div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{item.title}</h3>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 8, lineHeight: 1.6 }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 32, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={() => setShowHelpModal(true)} style={{
                    padding: '12px 24px', borderRadius: 999,
                    background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff',
                    border: '1px solid rgba(52,211,153,0.4)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5,150,105,0.3)'
                  }}>
                    🆘 {language === 'mr' ? 'इन्सानी मदत केंद्र उघडा' : language === 'en' ? 'Open Human Helpdesk' : 'इंसानी सहायता केंद्र खोलें'}
                  </button>
                  <button onClick={handleHeroStart} style={{
                    padding: '12px 24px', borderRadius: 999, background: '#fff', color: '#000',
                    border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                  }}>
                    {language === 'en' ? 'Start Application with Confidence →' : 'विश्वास के साथ आवेदन शुरू करें →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CHROME EXTENSION BRIDGE MODAL (Join to Extension)
          Interactive bridge for connecting the voice assistant with
          external government portals or testing on test-portal.html.
      ══════════════════════════════════════════════════════════════════ */}
      {showExtensionModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px 14px',
            background: 'rgba(5, 12, 7, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            overflowY: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExtensionModal(false);
          }}
        >
          <div
            style={{
              maxWidth: 620, width: '100%',
              background: 'linear-gradient(180deg, rgba(16, 28, 18, 0.95) 0%, rgba(8, 16, 10, 0.98) 100%)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              borderRadius: 24,
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.2)',
              padding: '24px 18px',
              color: '#ffffff',
              position: 'relative',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
                }}>
                  🧩
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 8 }}>
                    SEVA VAANI Extension Bridge
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(52, 211, 153, 0.2)', color: '#6ee7b7', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                      v1.0.0
                    </span>
                  </h2>
                  <p style={{ fontSize: 12.5, color: 'rgba(215, 228, 215, 0.75)', margin: '4px 0 0' }}>
                    सरकारी पोर्टल पर सीधे बोलकर फॉर्म भरें • Zero Auto-Submit Safety
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowExtensionModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#e2e8f0', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              >
                ✕
              </button>
            </div>

            {/* Status pills */}
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20,
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#86efac' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></span>
                Backend: 127.0.0.1:8000
              </div>
              <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#93c5fd' }}>
                <span>🛡️</span> Conservative Fill Guard
              </div>
              <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fde047' }}>
                <span>🗣️</span> 11 Languages Supported
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: 20 }}>
              {/* Action 1: Open Test Portal */}
              <div style={{
                padding: '16px', borderRadius: 16,
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(52, 211, 153, 0.25)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🖥️</span> सरकारी टेस्ट पोर्टल
                  </div>
                  <p style={{ fontSize: 11.5, color: 'rgba(220, 240, 220, 0.7)', lineHeight: 1.5, margin: 0 }}>
                    10-फ़ील्ड वाले मॉक सरकारी पोर्टल पर एक्सटेंशन के ऑटो-फिल का सीधा परीक्षण करें।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.open('/test-portal.html', '_blank');
                  }}
                  style={{
                    marginTop: 12, padding: '8px 14px', borderRadius: 999,
                    background: '#10b981', color: '#064e3b',
                    fontWeight: 700, fontSize: 12, border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  पोर्टल खोलें ↗
                </button>
              </div>

              {/* Action 2: Trigger Extension Panel on this page */}
              <div style={{
                padding: '16px', borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f0fdf4', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>⚡</span> एक्सटेंशन पैनल चालू करें
                  </div>
                  <p style={{ fontSize: 11.5, color: 'rgba(220, 240, 220, 0.7)', lineHeight: 1.5, margin: 0 }}>
                    यदि एक्सटेंशन लोड है, तो इसी पेज पर तुरंत फ्लोटिंग वॉइस असिस्टेंट ओपन करें।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.postMessage({ type: 'SEVA_VAANI_TOGGLE_PANEL' }, '*');
                  }}
                  style={{
                    marginTop: 12, padding: '8px 14px', borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.12)', color: '#ffffff',
                    fontWeight: 600, fontSize: 12, border: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  टॉगल करें 🎙️
                </button>
              </div>
            </div>

            {/* Quick 3-Step Setup Instructions */}
            <div style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 16
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📥</span> Chrome में एक्सटेंशन कैसे लोड करें (3 सरल कदम):
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: 'rgba(200, 215, 200, 0.8)', lineHeight: 1.6 }}>
                <li>Chrome में नया टैब खोलें और <code style={{ color: '#6ee7b7', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>chrome://extensions</code> पर जाएं।</li>
                <li>ऊपर दाईं ओर <strong>Developer mode</strong> चालू (ON) करें।</li>
                <li><strong>Load unpacked</strong> बटन दबाएं और इस प्रोजेक्ट का <strong>extension</strong> फ़ोल्डर चुनें।</li>
              </ol>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)' }}>
                Seva Vaani • Team Arise HACK-1014
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowExtensionModal(false);
                  handleHeroStart();
                }}
                style={{
                  padding: '9px 20px', borderRadius: 999,
                  background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)',
                  color: '#064e3b', fontWeight: 700, fontSize: 12.5,
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                }}
              >
                वेब ऐप में आगे बढ़ें →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          AUTHENTICATION MODAL DIALOG (Login & Create Account)
          Directly connects to FastAPI backend:
          - POST /api/auth/login
          - POST /api/auth/register
      ══════════════════════════════════════════════════════════════════ */}
      {authModalOpen && (
        <div
          id="modal-auth-dialog"
          style={{
            position: 'fixed', inset: 0, zIndex: 70,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px 14px',
            background: 'rgba(5, 12, 7, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            overflowY: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAuthModalOpen(false);
              setAuthError('');
              setAuthSuccessMsg('');
            }
          }}
        >
          <div
            style={{
              maxWidth: 440, width: '100%',
              background: 'linear-gradient(180deg, rgba(16, 28, 18, 0.96) 0%, rgba(8, 16, 10, 0.98) 100%)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              borderRadius: 24,
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.2)',
              padding: '24px 20px',
              color: '#ffffff',
              position: 'relative',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 10,
                  background: 'linear-gradient(145deg, #34d399 0%, #10b981 50%, #047857 100%)',
                  boxShadow: '0 2px 10px rgba(16,185,129,0.45)'
                }}>
                  <img src={logoImg} alt="" aria-hidden="true" style={{ width: 19, height: 19, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                </span>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#f0fdf4' }}>
                    {authMode === 'login' ? 'नागरिक लॉगिन' : 'नया खाता बनाएं'}
                  </h3>
                  <p style={{ fontSize: 11.5, color: 'rgba(215, 228, 215, 0.7)', margin: 0 }}>
                    SEVA VAANI सुरक्षित नागरिक खाता
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-auth-close"
                onClick={() => {
                  setAuthModalOpen(false);
                  setAuthError('');
                  setAuthSuccessMsg('');
                }}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#e2e8f0', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div style={{
              display: 'flex', gap: 4, padding: 4, borderRadius: 12,
              background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 20
            }}>
              <button
                type="button"
                id="tab-login"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 9,
                  background: authMode === 'login' ? 'rgba(52, 211, 153, 0.2)' : 'transparent',
                  border: authMode === 'login' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid transparent',
                  color: authMode === 'login' ? '#6ee7b7' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: 13, fontWeight: authMode === 'login' ? 600 : 400, cursor: 'pointer'
                }}
              >
                लॉगिन (Login)
              </button>
              <button
                type="button"
                id="tab-register"
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 9,
                  background: authMode === 'register' ? 'rgba(52, 211, 153, 0.2)' : 'transparent',
                  border: authMode === 'register' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid transparent',
                  color: authMode === 'register' ? '#6ee7b7' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: 13, fontWeight: authMode === 'register' ? 600 : 400, cursor: 'pointer'
                }}
              >
                खाता बनाएं (Register)
              </button>
            </div>

            {/* Error & Success Messages */}
            {authError && (
              <div
                id="auth-error-msg"
                style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5', fontSize: 12.5, marginBottom: 16
                }}
              >
                {authError}
              </div>
            )}
            {authSuccessMsg && (
              <div
                id="auth-success-msg"
                style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.35)',
                  color: '#86efac', fontSize: 12.5, marginBottom: 16
                }}
              >
                {authSuccessMsg}
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 6 }}>
                  ईमेल पता (Email)
                </label>
                <input
                  id="input-auth-email"
                  type="email"
                  required
                  placeholder="apna-email@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff', fontSize: 13, boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 6 }}>
                  पासवर्ड (Password)
                </label>
                <input
                  id="input-auth-password"
                  type="password"
                  required
                  minLength={4}
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff', fontSize: 13, boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                id="btn-auth-submit"
                disabled={authLoading}
                style={{
                  marginTop: 6, padding: '12px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff', fontSize: 13.5, fontWeight: 700,
                  border: 'none', cursor: authLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  opacity: authLoading ? 0.7 : 1
                }}
              >
                {authLoading ? 'कृपया प्रतीक्षा करें...' : (authMode === 'login' ? 'लॉगिन करें →' : 'नया खाता बनाएं →')}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11.5, color: 'rgba(255, 255, 255, 0.45)' }}>
              सरकारी डेटा सुरक्षा मानक • Argon2id एन्क्रिप्शन
            </div>
          </div>
        </div>
      )}

      {/* Transparent Privacy & Legal Footer */}
      <footer
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 14,
          padding: '8px 16px',
          background: 'rgba(5, 12, 8, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: 11.5,
          color: 'rgba(203, 213, 225, 0.75)'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#86efac' }}>
          <span>🛡️</span> शून्य ट्रैकिंग कुकीज़ • स्थानीय सत्र केवल
        </span>
        <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
        <button
          type="button"
          id="link-privacy-policy"
          onClick={() => {
            setLegalTab('privacy');
            setLegalModalOpen(true);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#a7f3d0',
            cursor: 'pointer',
            padding: 0,
            fontSize: 11.5,
            textDecoration: 'underline'
          }}
        >
          गोपनीयता नीति (Privacy Policy)
        </button>
        <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
        <button
          type="button"
          id="link-terms-of-use"
          onClick={() => {
            setLegalTab('terms');
            setLegalModalOpen(true);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#93c5fd',
            cursor: 'pointer',
            padding: 0,
            fontSize: 11.5,
            textDecoration: 'underline'
          }}
        >
          सेवा की शर्तें (Terms of Use)
        </button>
      </footer>

      {/* Legal Modal Dialog */}
      <LegalModal
        isOpen={legalModalOpen}
        activeTab={legalTab}
        onClose={() => setLegalModalOpen(false)}
        onTabChange={(tab) => setLegalTab(tab)}
      />

      {/* Human Help Modal Dialog */}
      <HumanHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        language={language || 'hi'}
      />
    </div>

  );
};

export default Welcome;
