import React, { useState } from 'react';
import VoiceButton from '../components/VoiceButton';
import TranscriptCard from '../components/TranscriptCard';
import ConfirmationCard from '../components/ConfirmationCard';
import FallbackPanel from '../components/FallbackPanel';
import FieldSummary from '../components/FieldSummary';
import { UI_STRINGS } from '../state/sessionStore';

export default function ServiceForm({
  sessionState,
  isListening,
  isProcessing,
  onToggleMic,
  onSendTranscript,
  onConfirmCandidate,
  onRejectCandidate,
  onSubmitFallbackText,
  onRequestHelp,
  onSpeakPrompt,
  onSimulateUtterance
}) {
  const [showFallback, setShowFallback] = useState(false);
  const lang = sessionState.language;
  const t = UI_STRINGS[lang] || UI_STRINGS.hi;
  const fieldDef = sessionState.activeFieldDefinition;
  const currentStep = sessionState.progress.confirmedCount + 1;
  const totalSteps = sessionState.progress.totalFields;

  const sampleChips = getSampleChips(fieldDef?.name, lang);

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl flex flex-col gap-5 max-w-2xl mx-auto">
      {/* Active Question Display */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300 rounded-xl p-5 text-left relative">
        <div className="inline-block bg-navy-900 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
          {t.stepLabel} {currentStep} / {totalSteps}: {fieldDef?.[`label_${lang}`]}
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-navy-900 leading-snug mb-3">
          {sessionState.currentPrompt}
        </h3>
        <button
          type="button"
          onClick={() => onSpeakPrompt(sessionState.currentPrompt)}
          className="bg-white hover:bg-sky-50 text-sky-600 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm inline-flex items-center gap-1.5 transition"
        >
          <span>🔊</span> {lang === 'hi' ? 'सवाल दोबारा सुनें' : 'प्रश्न पुन्हा ऐका'}
        </button>
      </div>

      {/* Confirmation Gate Card (FR-007, FR-008, TC03) */}
      {sessionState.pendingCandidate && (
        <ConfirmationCard
          candidateValue={sessionState.pendingCandidate.value}
          prompt={sessionState.pendingCandidatePrompt}
          onConfirm={onConfirmCandidate}
          onReject={onRejectCandidate}
          language={lang}
        />
      )}

      {/* Voice Interaction Mic Area */}
      <div className="flex flex-col items-center">
        <VoiceButton
          isListening={isListening}
          isProcessing={isProcessing}
          onClick={onToggleMic}
          language={lang}
        />

        <TranscriptCard
          transcript={sessionState.transcript}
          language={lang}
        />

        {/* Demo Test Chips for Quick Evaluation */}
        <div className="w-full mt-2 text-left">
          <div className="text-[11px] font-bold text-slate-500 mb-1.5">
            ⚡ {lang === 'hi' ? 'डेमो त्वरित विकल्प (परीक्षण हेतु):' : 'डेमो त्वरित पर्याय (चाचणीसाठी):'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sampleChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSimulateUtterance(chip)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-300 transition"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Text Fallback Panel */}
      <FallbackPanel
        isOpen={showFallback || sessionState.attempts >= 2}
        onClose={() => setShowFallback(false)}
        onSubmitText={onSubmitFallbackText}
        onRequestHelp={onRequestHelp}
        language={lang}
        fieldExample={fieldDef?.example}
      />

      {/* Bottom Action Bar */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setShowFallback(!showFallback)}
          className="text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
        >
          <span>⌨️</span> {t.btnTypeFallback}
        </button>
        <button
          type="button"
          onClick={onRequestHelp}
          className="text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition"
        >
          <span>🆘</span> {t.btnHumanHelp}
        </button>
      </div>

      {/* Confirmed Fields Overview */}
      <div className="pt-2">
        <div className="text-xs font-bold text-slate-500 text-left mb-1">
          {lang === 'hi' ? 'स्वीकृत फ़ील्ड्स:' : 'स्वीकारलेली माहिती:'}
        </div>
        <FieldSummary
          confirmedFields={sessionState.values}
          language={lang}
        />
      </div>
    </div>
  );
}

function getSampleChips(fieldName, lang) {
  const isHi = lang === 'hi';
  if (fieldName === 'full_name') {
    return isHi
      ? ['मेरा नाम रमेश कुमार है', 'रमेश कुमार', 'अस्पष्ट ध्वनि [unclear]']
      : ['माझं नाव राहुल देशमुख आहे', 'राहुल देशमुख', 'अस्पष्ट आवाज'];
  } else if (fieldName === 'dob') {
    return isHi
      ? ['14/08/2004', 'चौदह अगस्त दो हज़ार चार']
      : ['14/08/2004', 'चौदा ऑगस्ट दोन हजार चार'];
  } else if (fieldName === 'mobile') {
    return isHi
      ? ['9876543210', '987654321 (अमान्य 9 अंक)']
      : ['9876543210', '987654321 (अवैध ९ अंक)'];
  } else if (fieldName === 'college') {
    return ['PIEMR', isHi ? 'आईआईटी बॉम्बे' : 'सीओईपी पुणे'];
  } else if (fieldName === 'course') {
    return ['B.Tech CSE', isHi ? 'बीटेक कंप्यूटर साइंस' : 'एम.बी.ए'];
  } else if (fieldName === 'academic_year') {
    return isHi ? ['चौथा वर्ष', '4', 'पहला'] : ['चौथे वर्ष', '4', 'दुसरे'];
  } else if (fieldName === 'annual_income') {
    return isHi
      ? ['एक लाख अस्सी हज़ार', '180000']
      : ['एक लाख ऐंशी हजार', '180000'];
  } else if (fieldName === 'category') {
    return ['OBC', 'SC', 'General', isHi ? 'अमान्य (VIP श्रेणी)' : 'अवैध प्रवर्ग'];
  } else if (fieldName === 'district') {
    return isHi ? ['Indore', 'भोपाल'] : ['पुणे', 'नागपूर'];
  } else if (fieldName === 'document_status') {
    return isHi
      ? ['उपलब्ध (Available)', 'लंबित (Pending)']
      : ['उपलब्ध (Available)', 'प्रलंबित (Pending)'];
  }
  return [];
}
