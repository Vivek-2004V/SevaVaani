import React, { useState, useEffect } from 'react';
import { SupportedLanguage, FormField } from './types';
import { SCHOLARSHIP_FIELDS } from './services/schema';
import {
  createSession,
  getAuthToken,
  setAuthToken,
  fetchCurrentUser,
  logoutUser,
  AuthUser
} from './services/api';
import { SylvaHero } from './effects/sylva-living-world/SylvaLivingWorldScene';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import LanguageSelect from './pages/LanguageSelect';
import ServiceSelect from './pages/ServiceSelect';
import ServiceForm from './pages/ServiceForm';
import Review from './pages/Review';
import Success from './pages/Success';
import JudgeMode from './pages/JudgeMode';
import NotFound from './pages/NotFound';
import ExtensionModal from './components/ExtensionModal';
import { SessionRecoveryBanner } from './components/SessionRecoveryBanner';
import { useOfflineStore, PersistedSession } from './hooks/useOfflineStore';
import OfflineIndicator from './components/OfflineIndicator';
import PWAInstallPrompt from './components/PWAInstallPrompt';

export type ScreenState =
  | 'welcome'
  | 'dashboard'
  | 'language'
  | 'service'
  | 'form'
  | 'review'
  | 'success'
  | 'not-found';

export const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

  // Application Flow State — default to 'form' so the actual voice assistant opens immediately!
  const [screen, setScreen] = useState<ScreenState>('form');
  const [language, setLanguage] = useState<SupportedLanguage>('hi');
  const [serviceId, setServiceId] = useState<string>('scholarship_post_matric');
  const [sessionId, setSessionId] = useState<string>(() => `sv-${Date.now()}`);
  const [fields, setFields] = useState<FormField[]>(SCHOLARSHIP_FIELDS);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [applicationId, setApplicationId] = useState<string>('');
  const [submissionScope, setSubmissionScope] = useState<string>('saved_in_backend');
  const [governmentPortalSubmitted, setGovernmentPortalSubmitted] = useState<boolean>(false);
  const [showJudgeMode, setShowJudgeMode] = useState<boolean>(false);
  const [showExtensionModal, setShowExtensionModal] = useState<boolean>(false);

  // Session Recovery State
  const [pendingRecovery, setPendingRecovery] = useState<PersistedSession | null>(null);
  const { getLatestSession, clearSession } = useOfflineStore();

  // Initialize session and verify token on load
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchCurrentUser(token)
        .then((user) => {
          if (user) {
            setCurrentUser(user);
          } else {
            setAuthToken(null);
            setCurrentUser(null);
          }
        })
        .finally(() => {
          setAuthInitialized(true);
        });
    } else {
      setAuthInitialized(true);
    }
  }, []);

  // Listen for global postMessage actions from extension or demo triggers
  useEffect(() => {
    const handleGlobalAction = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SEVA_ACTION') {
        if (e.data.action === 'open_extension_dialog') {
          setShowExtensionModal(true);
        } else if (e.data.action === 'open_judge_mode') {
          setShowJudgeMode(true);
        }
      }
    };
    window.addEventListener('message', handleGlobalAction);
    return () => window.removeEventListener('message', handleGlobalAction);
  }, []);

  // Custom Route Detection for hash navigation (#form, #welcome, #dashboard, etc.)
  useEffect(() => {
    const checkHashRoute = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
      if (rawHash === 'welcome') setScreen('welcome');
      else if (rawHash === 'form') setScreen('form');
      else if (rawHash === 'service') setScreen('service');
      else if (rawHash === 'language') setScreen('language');
      else if (rawHash === 'dashboard' && currentUser) setScreen('dashboard');
    };
    window.addEventListener('hashchange', checkHashRoute);
    return () => window.removeEventListener('hashchange', checkHashRoute);
  }, [currentUser]);

  // Check for saved incomplete session on auth initialization
  useEffect(() => {
    if (authInitialized && currentUser) {
      getLatestSession().then((saved) => {
        if (saved && saved.confirmedFields.length > 0) {
          setPendingRecovery(saved);
        }
      });
    }
  }, [authInitialized, currentUser]);

  // Security Guard: Only protect private citizen dashboard
  useEffect(() => {
    if (authInitialized) {
      if (screen === 'dashboard' && !currentUser) {
        setScreen('welcome');
      }
    }
  }, [screen, currentUser, authInitialized]);

  // Authentication Handlers
  const handleLoginSuccess = (user: AuthUser, token: string) => {
    setAuthToken(token);
    setCurrentUser(user);
    setScreen('dashboard');
  };

  const handleLogout = async () => {
    // Clear saved session on explicit logout
    if (sessionId) await clearSession(sessionId);
    await logoutUser();
    setCurrentUser(null);
    setPendingRecovery(null);
    setScreen('welcome');
  };

  // Handle session recovery choice
  const handleResumeSession = (saved: PersistedSession) => {
    const restoredFields = SCHOLARSHIP_FIELDS.map((f) => {
      const confirmed = saved.confirmedFields.find((c) => c.fieldId === f.id);
      return confirmed
        ? { ...f, value: confirmed.value, confirmed: true }
        : { ...f, value: undefined, confirmed: false };
    });
    setFields(restoredFields);
    setSessionId(saved.id);
    setLanguage(saved.language);
    setServiceId(saved.serviceId);
    setEditIndex(saved.currentFieldIndex);
    setPendingRecovery(null);
    setScreen('form');
  };

  const handleDiscardSession = async () => {
    if (pendingRecovery) await clearSession(pendingRecovery.id);
    setPendingRecovery(null);
  };

  // Service Session Launcher
  const startNewSession = async (lang: SupportedLanguage, svc = 'scholarship_post_matric') => {
    setLanguage(lang);
    setServiceId(svc);
    const freshFields = SCHOLARSHIP_FIELDS.map((f) => ({
      ...f,
      value: undefined,
      confirmed: false
    }));
    setFields(freshFields);

    const res = await createSession(svc, lang);
    setSessionId(res.session_id || `sv-${Date.now()}`);
    setScreen('form');
  };

  // Screen Navigation Handlers
  const handleStartVoiceFromLanding = async () => {
    await startNewSession(language);
  };

  const handleStartVoiceFromDashboard = (
    lang: SupportedLanguage,
    svc = 'scholarship_post_matric'
  ) => {
    setLanguage(lang);
    setServiceId(svc);
    setScreen('language');
  };

  const handleConfirmLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setScreen('service');
  };

  const handleSelectService = async (svcId: string) => {
    setServiceId(svcId);
    await startNewSession(language, svcId);
  };

  const handleCompleteForm = (completedFields: FormField[]) => {
    setFields(completedFields);
    setScreen('review');
  };

  const handleEditField = (index: number) => {
    setEditIndex(index);
    setScreen('form');
  };

  const handleSubmitSuccess = (appId: string, persistenceScope?: string, govSubmitted?: boolean) => {
    setApplicationId(appId);
    if (persistenceScope) setSubmissionScope(persistenceScope);
    setGovernmentPortalSubmitted(Boolean(govSubmitted));
    setScreen('success');
  };

  const handleBackToHome = () => {
    if (currentUser) {
      setScreen('dashboard');
    } else {
      setScreen('welcome');
    }
    setFields(SCHOLARSHIP_FIELDS.map((f) => ({ ...f, value: undefined, confirmed: false })));
  };

  const handleLaunchDemoFlow = async (demoLang: SupportedLanguage) => {
    await startNewSession(demoLang);
  };

  return (
    <div className="relative min-h-screen w-full font-sans antialiased bg-[#0f172a] text-white overflow-x-hidden">
      {/* Session Recovery Modal — shown after login if a saved session is found */}
      {pendingRecovery && currentUser && (
        <SessionRecoveryBanner
          savedSession={pendingRecovery}
          onResume={handleResumeSession}
          onDiscard={handleDiscardSession}
        />
      )}

      {/* Top Quick Navigation Bar across all views */}
      <nav className="sticky top-0 z-50 w-full bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 py-2 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setScreen('welcome')}
            className="flex items-center gap-2 text-white hover:text-emerald-400 font-extrabold text-sm tracking-tight transition-colors"
          >
            <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-900 font-black flex items-center justify-center text-sm shadow">
              स
            </span>
            <span>SEVA VAANI <span className="text-xs text-emerald-300 font-normal">सेवा वाणी</span></span>
          </button>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => {
              if (screen !== 'form') {
                if (!sessionId) startNewSession(language);
                else setScreen('form');
              }
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              screen === 'form'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white/10 hover:bg-white/20 text-emerald-200 border border-emerald-500/30'
            }`}
          >
            <span>🎙️</span>
            <span>वॉइस फॉर्म (Voice Assistant)</span>
          </button>

          <button
            onClick={() => setScreen('service')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all hidden sm:flex items-center gap-1 ${
              screen === 'service'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10'
            }`}
          >
            <span>📋</span>
            <span>सेवाएं</span>
          </button>

          <button
            onClick={() => setScreen('language')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all hidden sm:flex items-center gap-1 ${
              screen === 'language'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10'
            }`}
          >
            <span>🌐</span>
            <span>भाषा</span>
          </button>

          <button
            onClick={() => setScreen('welcome')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
              screen === 'welcome'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10'
            }`}
          >
            <span>🏠</span>
            <span className="hidden xs:inline">होम</span>
          </button>

          <button
            onClick={() => setShowJudgeMode(true)}
            className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-amber-200 border border-amber-400/40 transition-all flex items-center gap-1 ml-1"
            title="Judge Metrics & Evaluation"
          >
            <span>⚖️</span>
            <span className="hidden md:inline">Judge</span>
          </button>
        </div>
      </nav>

      {/* Screen Views Layer */}
      <div className="relative z-10 min-h-[calc(100vh-50px)] w-full">
        {/* 1. PUBLIC LANDING PAGE (Create Account / Login / Explore) */}
        {screen === 'welcome' && (
          <Welcome
            currentUser={currentUser}
            language={language}
            onLanguageChange={(newLang) => setLanguage(newLang)}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            onStartVoice={handleStartVoiceFromLanding}
            onOpenJudgeMode={() => setShowJudgeMode(true)}
            onGoToDashboard={() => setScreen('dashboard')}
          />
        )}

        {/* 2. PROTECTED DASHBOARD (Accessible only after Login) */}
        {screen === 'dashboard' && currentUser && (
          <Dashboard
            user={currentUser}
            onStartVoice={handleStartVoiceFromDashboard}
            onLogout={handleLogout}
            onOpenExtensionModal={() => setShowExtensionModal(true)}
            onOpenJudgeMode={() => setShowJudgeMode(true)}
          />
        )}

        {/* 3. LANGUAGE SELECTION STEP */}
        {screen === 'language' && (
          <LanguageSelect
            currentLanguage={language}
            onConfirmLanguage={handleConfirmLanguage}
            onBack={() => setScreen('welcome')}
          />
        )}

        {/* 4. PUBLIC SERVICE SELECTION STEP */}
        {screen === 'service' && (
          <ServiceSelect
            language={language}
            onSelectService={handleSelectService}
            onBack={() => setScreen('language')}
          />
        )}

        {/* 5. VOICE ASSISTANT FORM COMPLETION STAGE */}
        {screen === 'form' && (
          <ServiceForm
            sessionId={sessionId || `sv-${Date.now()}`}
            fields={fields}
            language={language}
            initialIndex={editIndex ?? 0}
            onLanguageChange={(newLang) => setLanguage(newLang)}
            onCompleteForm={handleCompleteForm}
            onBack={() => setScreen('welcome')}
          />
        )}

        {/* 6. FINAL REVIEW AND EXPLICIT CONSENT STAGE */}
        {screen === 'review' && (
          <Review
            sessionId={sessionId}
            fields={fields}
            language={language}
            onEditField={handleEditField}
            onSubmitSuccess={handleSubmitSuccess}
            onBack={() => setScreen('form')}
          />
        )}

        {/* 7. SUBMISSION SUCCESS & RECEIPT */}
        {screen === 'success' && (
          <Success
            applicationId={applicationId}
            language={language}
            persistenceScope={submissionScope}
            governmentPortalSubmitted={governmentPortalSubmitted}
            onHome={handleBackToHome}
            onOpenJudgeMode={() => setShowJudgeMode(true)}
          />
        )}

        {/* 8. NOT FOUND (404) FALLBACK */}
        {screen === 'not-found' && (
          <NotFound
            onGoHome={() => {
              window.location.hash = '';
              setScreen(currentUser ? 'dashboard' : 'welcome');
            }}
          />
        )}

        {/* Shared Modals */}
        {showJudgeMode && (
          <JudgeMode
            onClose={() => setShowJudgeMode(false)}
            onLaunchDemoFlow={handleLaunchDemoFlow}
          />
        )}

        {showExtensionModal && (
          <ExtensionModal
            onClose={() => setShowExtensionModal(false)}
            onContinueInWebApp={() => {
              setShowExtensionModal(false);
              if (currentUser) {
                setScreen('dashboard');
              } else {
                setScreen('welcome');
              }
            }}
          />
        )}
      </div>

      {/* Global PWA components — rendered outside the main scroll container */}
      <OfflineIndicator />
      <PWAInstallPrompt />
    </div>
  );
};

export default App;
