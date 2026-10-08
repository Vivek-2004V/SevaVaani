import React from 'react';

export default function ProgressBar({ confirmedCount = 0, totalFields = 10 }) {
  const percentage = Math.round((confirmedCount / totalFields) * 100);

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-saffron-500 to-emerald-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs font-semibold text-slate-500 whitespace-nowrap">
        {confirmedCount} / {totalFields} ({percentage}%)
      </div>
    </div>
  );
}
