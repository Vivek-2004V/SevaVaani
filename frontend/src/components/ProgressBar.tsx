import React from 'react';
import { FormField } from '../types';

export interface ProgressBarProps {
  fields: FormField[];
  currentIndex: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ fields, currentIndex }) => {
  const confirmedCount = fields.filter(f => f.confirmed).length;
  const totalCount = fields.length;
  const percentage = Math.round((confirmedCount / totalCount) * 100);

  return (
    <div className="w-full max-w-xl mx-auto my-3 px-2">
      <div className="flex items-center justify-between text-xs font-semibold text-emerald-200/90 mb-1.5">
        <span>प्रगति (Progress): {confirmedCount} of {totalCount} पूर्ण</span>
        <span className="text-emerald-400 font-bold">{percentage}%</span>
      </div>

      {/* Progress track */}
      <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between mt-2 overflow-x-auto py-1 px-0.5">
        {fields.map((f, idx) => {
          const isDone = f.confirmed;
          const isCurrent = idx === currentIndex && !isDone;

          return (
            <div
              key={f.id}
              className="flex flex-col items-center flex-1 min-w-[20px]"
              title={f.label.en}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500 text-black shadow-sm font-black'
                    : isCurrent
                    ? 'bg-emerald-400 text-black ring-4 ring-emerald-400/30 scale-110 font-black'
                    : 'bg-white/20 text-slate-400'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
