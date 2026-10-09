import React, { useState, useEffect } from 'react';
import { SylvaHero } from '../effects/sylva-living-world/SylvaLivingWorldScene';
import logoImg from '../assets/seva-vaani-logo.png';
import { loginUser, registerUser, setAuthToken, AuthUser } from '../services/api';

export interface WelcomeProps {
  currentUser?: AuthUser | null;
  onLoginSuccess: (user: AuthUser, token: string) => void;
  onLogout: () => void;
  onStartVoice: () => void;
  onOpenJudgeMode: () => void;
  onGoToDashboard?: () => void;
}

export type WelcomeTab = 'home' | 'how-it-works' | 'services' | 'stories' | 'help';

export const Welcome: React.FC<WelcomeProps> = ({
  currentUser = null,
  onLoginSuccess,
  onLogout,
  onStartVoice,
  onOpenJudgeMode,
  onGoToDashboard
}) => {
  const [activeTab, setActiveTab] = useState<WelcomeTab>('home');
  const [showOverlay, setShowOverlay] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

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

  const handleHeroStart = () => {
    if (!currentUser) {
      setAuthMode('login');
      setAuthError('');
      setAuthSuccessMsg('कृपया आगे बढ़ने के लिए पहले लॉगिन करें या खाता बनाएं (Please Login or Create Account first).');
      setAuthModalOpen(true);
    } else {
      if (onGoToDashboard) {
        onGoToDashboard();
      } else {
        onStartVoice();
      }
    }
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
      setAuthError(err.message || 'प्रमाणीकरण में त्रुटि हुई');
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

  const navTabs: { id: WelcomeTab; label: string }[] = [
    { id: 'home', label: 'मुख्य पृष्ठ' },
    { id: 'how-it-works', label: 'काम कैसे करता है?' },
    { id: 'services', label: 'सरकारी योजनाएँ' },
    { id: 'stories', label: 'नागरिकों की आवाज़' },
    { id: 'help', label: 'सहायता केंद्र' }
  ];

  const trustCards = [
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

  const citizenStories = [
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

  const howItWorksSteps = [
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

  const publicServices = [
    {
      title: 'पोस्ट-मैट्रिक छात्रवृत्ति (Scholarship)',
      dept: 'उच्च शिक्षा व सामाजिक न्याय विभाग',
      desc: '11वीं, 12वीं, आईटीआई, पॉलिटेक्निक, बीए, बीएससी, बीटेक और मेडिकल विद्यार्थियों के लिए शुल्क प्रतिपूर्ति व भत्ता।',
      status: 'सक्रिय (Live)',
      highlight: true
    },
    {
      title: 'वार्षिक आय प्रमाण पत्र (Income Certificate)',
      dept: 'राजस्व विभाग (तहसीलदार कार्यालय)',
      desc: 'सरकारी योजनाओं, शुल्क छूट और छात्रवृत्ति के लिए आवश्यक पारिवारिक आय का आधिकारिक प्रमाण पत्र।',
      status: 'आगामी सेवा',
      highlight: false
    },
    {
      title: 'जाति व सामाजिक वर्ग प्रमाण पत्र (Caste Certificate)',
      dept: 'सामाजिक कल्याण विभाग',
      desc: 'आरक्षण, छात्रावास और विशेष योजनाओं का लाभ लेने हेतु वैध जाति प्रमाण पत्र।',
      status: 'आगामी सेवा',
      highlight: false
    },
    {
      title: 'मूल निवास प्रमाण पत्र (Domicile Certificate)',
      dept: 'सामान्य प्रशासन विभाग',
      desc: 'राज्य में स्थायी नागरिकता और राज्य-स्तरीय भर्ती/प्रवेश के लिए जरूरी प्रमाण पत्र।',
      status: 'आगामी सेवा',
      highlight: false
    }
  ];

  // Render non-home tabs as an overlay panel
  const showPanel = activeTab !== 'home' || showOverlay;

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100svh' }}>

      {/* ══════════════════════════════════════════════════════════════════
          DESKTOP & TABLET HEADER ARCHITECTURE
          - Floating pill navbar (Centered, NO inner scrollbar)
          - Separate Top-Right Header Area for Auth Actions (Outside navbar)
          - No "बोलकर शुरू करें" in navbar
          - Working "एक्सटेंशन से जोड़ें" preserved
      ══════════════════════════════════════════════════════════════════ */}
      <div className="seva-desktop-layout">
        {/* Top-Right Authentication Area (Outside Navbar) */}
        <div className="seva-auth-desktop-wrapper">
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {onGoToDashboard && (
                <button
                  id="btn-goto-dashboard"
                  type="button"
                  onClick={onGoToDashboard}
                  className="seva-btn-register"
                  style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}
                >
                  डैशबोर्ड (Dashboard) →
                </button>
              )}
              <div className="seva-user-badge" id="auth-user-badge">
                <span style={{ fontSize: 13 }}>👤</span>
                <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.email}
                </span>
                <button
                  id="btn-auth-logout"
                  type="button"
                  onClick={handleLogout}
                  style={{
                    background: 'none', border: 'none', color: '#f87171',
                    cursor: 'pointer', fontSize: 11.5, fontWeight: 600, padding: '2px 4px'
                  }}
                  title="लॉगआउट करें"
                >
                  लॉगआउट
                </button>
              </div>
            </div>
          ) : (
            <div className="seva-auth-area">
              {/* Login — Secondary / Text style button */}
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
                title="नागरिक लॉगिन (Login)"
              >
                लॉगिन
              </button>

              {/* Create Account — Prominent primary emerald button */}
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
                title="नया खाता बनाएं (Create Account)"
              >
                खाता बनाएं
              </button>
            </div>
          )}
        </div>

        {/* Centered Floating Pill Navbar */}
        <div className="seva-nav-desktop-wrapper">
          <nav
            className="seva-pill-navbar"
            aria-label="Seva Vaani Navigation"
            role="navigation"
          >
            {/* Brand: Emerald Gradient App Icon + "Seva Vaani" */}
            <button
              type="button"
              id="nav-brand"
              onClick={() => { setActiveTab('home'); setShowOverlay(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 10px 4px 4px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderRadius: 9999, flexShrink: 0
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(145deg, #34d399 0%, #10b981 50%, #047857 100%)',
                boxShadow: '0 2px 10px rgba(16,185,129,0.45), inset 0 1px 1px rgba(255,255,255,0.38)'
              }}>
                <img src={logoImg} alt="" style={{ width: 16, height: 16, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#f0fdf4', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                Seva Vaani
              </span>
            </button>

            {/* Separator */}
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', flexShrink: 0, margin: '0 3px' }} />

            {/* 5 Preserved Nav Links */}
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-${tab.id}`}
                  type="button"
                  className="seva-nav-tab-btn"
                  onClick={() => { setActiveTab(tab.id); setShowOverlay(tab.id !== 'home'); }}
                  style={{
                    position: 'relative',
                    padding: '6px 12px',
                    background: isActive ? 'rgba(255,255,255,0.11)' : 'transparent',
                    border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                    borderRadius: 9999,
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#f0fdf4' : 'rgba(215,228,215,0.75)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'background 0.15s, color 0.15s, border 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'rgba(215,228,215,0.75)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {tab.label}
                  {isActive && (
                    <span style={{
                      position: 'absolute', bottom: 3, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#4ade80',
                      boxShadow: '0 0 8px rgba(74, 222, 128, 0.9)'
                    }} />
                  )}
                </button>
              );
            })}

            {/* Separator */}
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', flexShrink: 0, margin: '0 3px' }} />

            {/* Preserved Join to Extension Action Button inside Navbar */}
            <button
              id="nav-cta-extension"
              type="button"
              onClick={() => {
                window.postMessage({ type: 'SEVA_VAANI_TOGGLE_PANEL' }, '*');
                setShowExtensionModal(true);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 13px', marginRight: 2,
                background: 'linear-gradient(180deg, rgba(16,185,129,0.24) 0%, rgba(6,78,59,0.4) 100%)',
                color: '#6ee7b7',
                border: '1px solid rgba(52,211,153,0.45)',
                borderRadius: 9999,
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                boxShadow: '0 2px 10px rgba(4,20,10,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
                transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s, color 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.background = 'linear-gradient(180deg, rgba(16,185,129,0.38) 0%, rgba(6,78,59,0.58) 100%)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'linear-gradient(180deg, rgba(16,185,129,0.24) 0%, rgba(6,78,59,0.4) 100%)';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(4,20,10,0.3), inset 0 1px 0 rgba(255,255,255,0.12)';
                e.currentTarget.style.color = '#6ee7b7';
              }}
              title="Chrome Extension से जोड़ें (Join to Extension)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M19 11V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h7" />
                <path d="M15 19l3 3 6-6" />
                <path d="M12 9l3 3-3 3" />
              </svg>
              एक्सटेंशन से जोड़ें
            </button>
          </nav>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE HEADER ARCHITECTURE (< 768px)
          - Top glass bar with Brand on left, Auth + Hamburger on right
          - Dropdown drawer for navigation links
          - Zero horizontal scrolling or overflow
      ══════════════════════════════════════════════════════════════════ */}
      <div className="seva-mobile-layout">
        <header
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(16, 26, 17, 0.88)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxSizing: 'border-box'
          }}
        >
          {/* Brand */}
          <button
            type="button"
            id="nav-brand-mobile"
            onClick={() => { setActiveTab('home'); setShowOverlay(false); setMobileMenuOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0
            }}
          >
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(145deg, #34d399 0%, #10b981 50%, #047857 100%)',
              boxShadow: '0 2px 8px rgba(16,185,129,0.4)'
            }}>
              <img src={logoImg} alt="" style={{ width: 16, height: 16, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f0fdf4' }}>
              Seva Vaani
            </span>
          </button>

          {/* Right Area: Auth Actions + Hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {currentUser ? (
              <div className="seva-user-badge" style={{ padding: '3px 8px', fontSize: 11 }}>
                <span>👤</span>
                <button
                  onClick={handleLogout}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11, padding: 0 }}
                >
                  लॉगआउट
                </button>
              </div>
            ) : (
              <>
                <button
                  id="btn-auth-login-mobile"
                  type="button"
                  className="seva-btn-login"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccessMsg('');
                    setAuthModalOpen(true);
                  }}
                  style={{ padding: '5px 10px', fontSize: 12 }}
                >
                  लॉगिन
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
                  }}
                  style={{ padding: '5px 12px', fontSize: 12 }}
                >
                  खाता बनाएं
                </button>
              </>
            )}

            {/* Hamburger Toggle */}
            <button
              id="btn-mobile-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 9,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#ffffff', fontSize: 16, cursor: 'pointer'
              }}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed', top: 54, left: 10, right: 10, zIndex: 49,
              background: 'linear-gradient(180deg, rgba(16, 28, 18, 0.98) 0%, rgba(10, 18, 12, 0.98) 100%)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              borderRadius: 18,
              padding: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              display: 'flex', flexDirection: 'column', gap: 6,
              boxSizing: 'border-box'
            }}
          >
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
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    borderRadius: 12,
                    background: isActive ? 'rgba(52, 211, 153, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    border: isActive ? '1px solid rgba(52, 211, 153, 0.35)' : '1px solid transparent',
                    color: isActive ? '#6ee7b7' : '#e2e8f0',
                    fontSize: 13.5,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}

            <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />

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
          </div>
        )}
      </div>


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
                ✕ बंद करें / मुख्य पृष्ठ (Close)
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
                    सरल 4 चरणों की यात्रा
                  </span>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 16, color: '#fff' }}>
                    जैसे किसी अपने मददगार से बात कर रहे हों
                  </h2>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
                    सेवा वाणी में कोई रोबोटिक उलझन नहीं है। यह प्रक्रिया पूरी तरह पारदर्शी और आपके नियंत्रण में है।
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
                  }}>अभी बोलकर आज़माएँ →</button>
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
                    नागरिक कल्याण सेवाएं
                  </span>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 16, color: '#fff' }}>
                    हर छात्र और परिवार तक सरकारी मदद
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
                        }}>अभी आवेदन करें →</button>
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
                    सच्चे अनुभव
                  </span>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 16, color: '#fff' }}>
                    "अब मुझे किसी के आगे हाथ जोड़ने की जरूरत नहीं"
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
                    हमेशा आपका साथ
                  </span>
                  <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 16, color: '#fff' }}>
                    तकनीक जहाँ रुकेगी, इंसान वहाँ हाथ थामेगा
                  </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  {[
                    { icon: '✍️', title: 'लिखकर बताने की सुविधा', desc: 'यदि माइक में कोई शोर हो या आवाज़ पकड़ में न आए, तो आप कीबोर्ड से भी उत्तर टाइप कर सकते हैं।' },
                    { icon: '🎫', title: 'तत्काल सहायता टिकट', desc: 'एक क्लिक में सहायता अनुरोध दर्ज होता है। आपका भरा हुआ डेटा पूरी तरह सुरक्षित रहता है।' },
                    { icon: '🧑‍💼', title: 'सीएससी / वीएलई ऑपरेटर', desc: 'गाँव के डिजिटल सेवा केंद्र के ऑपरेटर को आपकी समस्या की सूचना तुरंत भेजी जाती है।' }
                  ].map((item, i) => (
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
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                  <button onClick={handleHeroStart} style={{
                    padding: '12px 30px', borderRadius: 999, background: '#fff', color: '#000',
                    border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                  }}>विश्वास के साथ आवेदन शुरू करें →</button>
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
                  <img src={logoImg} alt="" style={{ width: 19, height: 19, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
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
    </div>

  );
};

export default Welcome;
