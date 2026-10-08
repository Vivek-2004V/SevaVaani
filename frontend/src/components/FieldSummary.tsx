import React from 'react';
import { FormField } from '../types';

export interface FieldSummaryProps {
  fields: FormField[];
  language: 'hi' | 'mr' | 'en';
  onEditField?: (index: number) => void;
}

export const FieldSummary: React.FC<FieldSummaryProps> = ({
  fields,
  language,
  onEditField
}) => {
  return (
    <div className="w-full bg-white/95 rounded-3xl border border-slate-200/90 shadow-lg divide-y divide-slate-100 overflow-hidden">
      {fields.map((f, idx) => (
        <div
          key={f.id}
          className="flex items-center justify-between p-3.5 md:p-4 hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex-1 pr-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {f.label[language] || f.label.en}
            </span>
            <span className="text-sm md:text-base font-medium text-slate-800 break-words mt-0.5 block">
              {f.value || <span className="text-slate-400 italic">दर्ज नहीं किया गया (Not set)</span>}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {f.confirmed && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <span>✓</span> पुष्टि
              </span>
            )}
            {onEditField && (
              <button
                type="button"
                onClick={() => onEditField(idx)}
                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
              >
                बदलें (Edit)
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FieldSummary;
