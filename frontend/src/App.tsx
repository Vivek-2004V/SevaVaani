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

  // Application Flow State
  const [screen, setScreen] = useState<ScreenState>('welcome');
  const [language, setLanguage] = useState<SupportedLanguage>('hi');
  const [serviceId, setServiceId] = useState<string>('scholarship_post_matric');
  const [sessionId, setSessionId] = useState<string>('');
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

  // Custom 404 Route Detection for unrecognized URL navigation
  useEffect(() => {
    const checkHashRoute = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
      const validHashes = ['', 'welcome', 'dashboard', 'language', 'service', 'form', 'review', 'success', 'privacy', 'terms'];
      if (rawHash && !validHashes.includes(rawHash)) {
        setScreen('not-found');
      }
    };
    window.addEventListener('hashchange', checkHashRoute);
    checkHashRoute();
    return () => window.removeEventListener('hashchange', checkHashRoute);
  }, []);

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

  // Security Guard: Enforce Authentication on Protected Views
  useEffect(() => {
    if (authInitialized) {
      const protectedScreens: ScreenState[] = [
        'dashboard',
        'language',
        'service',
        'form',
        'review',
        'success'
      ];
      if (protectedScreens.includes(screen) && !currentUser) {
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
  const handleStartVoiceFromLanding = () => {
    if (!currentUser) {
      setScreen('welcome');
    } else {
      setScreen('dashboard');
    }
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
    <div className="relative min-h-screen w-full font-sans antialiased bg-[#121a13] text-white overflow-x-hidden">
      {/* Session Recovery Modal — shown after login if a saved session is found */}
      {pendingRecovery && currentUser && (
        <SessionRecoveryBanner
          savedSession={pendingRecovery}
          onResume={handleResumeSession}
          onDiscard={handleDiscardSession}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PERSISTENT 3D LIVING WORLD SCENE
          Renders seamlessly behind all screens with continuous WebGL animation.
      ══════════════════════════════════════════════════════════════════ */}
      <SylvaHero
        variant="living-green"
        headingFont="lexend"
        bodyFont="lexend"
        headingWeight="300"
        bodyWeight="300"
        primaryColor="#ffffff"
        headingSize={63}
        bodySize={16.5}
        headingLetterSpacing={-0.006}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: screen === 'welcome' ? 'auto' : 'none'
        }}
      />

      {/* Screen Views Layer (Frosted Glassmorphism above 3D Scene) */}
      <div className="relative z-10 min-h-screen w-full">
        {/* 1. PUBLIC LANDING PAGE (Create Account / Login / Explore) */}
        {screen === 'welcome' && (
          <Welcome
            currentUser={currentUser}
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
        {screen === 'language' && currentUser && (
          <LanguageSelect
            currentLanguage={language}
            onConfirmLanguage={handleConfirmLanguage}
            onBack={() => setScreen('dashboard')}
          />
        )}

        {/* 4. PUBLIC SERVICE SELECTION STEP */}
        {screen === 'service' && currentUser && (
          <ServiceSelect
            language={language}
            onSelectService={handleSelectService}
            onBack={() => setScreen('language')}
          />
        )}

        {/* 5. VOICE ASSISTANT FORM COMPLETION STAGE */}
        {screen === 'form' && currentUser && (
          <ServiceForm
            sessionId={sessionId || `sv-${Date.now()}`}
            fields={fields}
            language={language}
            initialIndex={editIndex}
            onLanguageChange={(newLang) => setLanguage(newLang)}
            onCompleteForm={handleCompleteForm}
            onBack={() => setScreen('service')}
          />
        )}

        {/* 6. FINAL REVIEW AND EXPLICIT CONSENT STAGE */}
        {screen === 'review' && currentUser && (
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
        {screen === 'success' && currentUser && (
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
    </div>
  );
};

export default App;
