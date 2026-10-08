import React, { useState } from 'react';
import { SupportedLanguage, FormField } from './types';
import { SCHOLARSHIP_FIELDS } from './services/schema';
import { createSession } from './services/api';
import Welcome from './pages/Welcome';
import LanguageSelect from './pages/LanguageSelect';
import ServiceSelect from './pages/ServiceSelect';
import ServiceForm from './pages/ServiceForm';
import Review from './pages/Review';
import Success from './pages/Success';
import JudgeMode from './pages/JudgeMode';

export type ScreenState = 'welcome' | 'language' | 'service' | 'form' | 'review' | 'success';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('welcome');
  const [language, setLanguage] = useState<SupportedLanguage>('hi');
  const [serviceId, setServiceId] = useState<string>('scholarship_post_matric');
  const [sessionId, setSessionId] = useState<string>('');
  const [fields, setFields] = useState<FormField[]>(SCHOLARSHIP_FIELDS);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [applicationId, setApplicationId] = useState<string>('');
  const [showJudgeMode, setShowJudgeMode] = useState<boolean>(false);

  // Initialize new session
  const startNewSession = async (lang: SupportedLanguage, svc = 'scholarship_post_matric') => {
    setLanguage(lang);
    setServiceId(svc);
    // Reset schema
    const freshFields = SCHOLARSHIP_FIELDS.map(f => ({ ...f, value: undefined, confirmed: false }));
    setFields(freshFields);

    const res = await createSession(svc, lang);
    setSessionId(res.session_id || `ses_${Date.now()}`);
    setScreen('form');
  };

  // Screen transitions
  const handleStartVoice = () => {
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

  const handleSubmitSuccess = (appId: string) => {
    setApplicationId(appId);
    setScreen('success');
  };

  const handleBackToHome = () => {
    setScreen('welcome');
    setFields(SCHOLARSHIP_FIELDS.map(f => ({ ...f, value: undefined, confirmed: false })));
  };

  const handleLaunchDemoFlow = async (demoLang: SupportedLanguage) => {
    await startNewSession(demoLang);
  };

  return (
    <div className="min-h-screen w-full font-sans antialiased bg-slate-900 text-slate-800">
      {screen === 'welcome' && (
        <Welcome
          onStartVoice={handleStartVoice}
          onOpenJudgeMode={() => setShowJudgeMode(true)}
        />
      )}

      {screen === 'language' && (
        <LanguageSelect
          currentLanguage={language}
          onConfirmLanguage={handleConfirmLanguage}
          onBack={() => setScreen('welcome')}
        />
      )}

      {screen === 'service' && (
        <ServiceSelect
          language={language}
          onSelectService={handleSelectService}
          onBack={() => setScreen('language')}
        />
      )}

      {screen === 'form' && (
        <ServiceForm
          sessionId={sessionId || `ses_${Date.now()}`}
          fields={fields}
          language={language}
          onLanguageChange={(newLang) => setLanguage(newLang)}
          onCompleteForm={handleCompleteForm}
          onBack={() => setScreen('service')}
        />
      )}

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

      {screen === 'success' && (
        <Success
          applicationId={applicationId}
          language={language}
          onHome={handleBackToHome}
          onOpenJudgeMode={() => setShowJudgeMode(true)}
        />
      )}

      {/* Judge Mode Modal */}
      {showJudgeMode && (
        <JudgeMode
          onClose={() => setShowJudgeMode(false)}
          onLaunchDemoFlow={handleLaunchDemoFlow}
        />
      )}
    </div>
  );
};

export default App;
