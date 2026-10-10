import React from 'react';
import { FormField, SupportedLanguage } from '../types';

export interface FieldSummaryProps {
  fields: FormField[];
  language: SupportedLanguage;
  onEditField?: (index: number) => void;
}

export const FieldSummary: React.FC<FieldSummaryProps> = ({
  fields,
  language,
  onEditField
}) => {
  const getEditLabel = () => {
    const msgs: Record<SupportedLanguage, string> = {
      hi: 'बदलें (Edit)',
      mr: 'बदला (Edit)',
      bn: 'সম্পাদনা (Edit)',
      te: 'మార్చండి (Edit)',
      ta: 'திருத்து (Edit)',
      gu: 'બદલો (Edit)',
      kn: 'ಬದಲಾಯಿಸಿ (Edit)',
      ml: 'മാറ്റുക (Edit)',
      pa: 'ਬਦਲੋ (Edit)',
      or: 'ସଂଶୋଧନ (Edit)',
      en: 'Edit'
    };
    return msgs[language] || msgs.en;
  };

  const getConfirmedLabel = () => {
    const msgs: Record<SupportedLanguage, string> = {
      hi: 'पुष्टि (Confirmed)',
      mr: 'पुष्टी (Confirmed)',
      bn: 'নিশ্চিত (Confirmed)',
      te: 'నిర్ధారించబడింది',
      ta: 'உறுதிப்படுத்தப்பட்டது',
      gu: 'પુષ્ટિ (Confirmed)',
      kn: 'ದೃಢಪಡಿಸಲಾಗಿದೆ',
      ml: 'സ്ഥിരീകരിച്ചു',
      pa: 'ਪੁਸ਼ਟੀ ਹੋਈ',
      or: 'ନିଶ୍ଚିତ (Confirmed)',
      en: 'Confirmed'
    };
    return msgs[language] || msgs.en;
  };

  return (
    <div className="w-full bg-[#121f15]/85 backdrop-blur-2xl rounded-3xl border border-white/15 shadow-2xl divide-y divide-white/10 overflow-hidden text-white">
      {fields.map((f, idx) => (
        <div
          key={f.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 md:p-4 hover:bg-white/5 transition-colors gap-2 sm:gap-4"
        >
          <div className="flex-1 min-w-0 pr-1 sm:pr-3">
            <span className="text-xs font-semibold text-emerald-300/80 uppercase tracking-wider block">
              {f.label[language] || f.label.en}
            </span>
            <span className="text-sm md:text-base font-medium text-white break-words mt-0.5 block">
              {f.value || <span className="text-slate-400 italic">दर्ज नहीं किया गया (Not set)</span>}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            {f.confirmed && (
              <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/70 px-2.5 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                <span>✓</span> {language === 'mr' ? 'आवाज पुष्टी (Voice Confirmed)' : language === 'en' ? 'Voice Confirmed' : 'आवाज़ पुष्टि (Voice Confirmed)'}
              </span>
            )}
            {(f.id === 'full_name' || f.id === 'father_name') && (
              <span
                className="text-[11px] font-medium text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1"
                title={
                  language === 'mr'
                    ? 'शासकीय प्रमाणपत्रात स्पेलिंग अत्यंत महत्त्वाची असते. आधार कार्डाप्रमाणे तपासा.'
                    : language === 'en'
                    ? 'Official IDs require exact spelling verification character by character.'
                    : 'सरकारी प्रमाण पत्र में नाम की स्पेलिंग आधार कार्ड से मेल खानी चाहिए।'
                }
              >
                <span>🔤</span> {language === 'mr' ? 'स्पेलिंग तपासा' : language === 'en' ? 'Verify Spelling' : 'वर्तनी जांचें'}
              </span>
            )}
            {onEditField && (
              <button
                type="button"
                id={`btn-edit-field-${f.id}`}
                onClick={() => onEditField(idx)}
                className="touch-target-44 min-h-[40px] px-3 py-1.5 text-xs font-bold text-emerald-200 hover:text-white bg-white/5 hover:bg-emerald-600/30 rounded-xl transition-all border border-emerald-400/40 active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                {getEditLabel()}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FieldSummary;
