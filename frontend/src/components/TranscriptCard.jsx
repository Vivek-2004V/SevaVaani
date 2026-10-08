import React from 'react';

export default function TranscriptCard({ transcript, language = 'hi' }) {
  const title = language === 'hi' ? 'पहचाना गया स्वर (Live Transcript):' : 'ओळखलेला आवाज (Live Transcript):';

  return (
    <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 my-2 text-left">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        {title}
      </div>
      <div className="text-base text-slate-800 italic min-h-[24px]">
        {transcript ? `"${transcript}"` : '...'}
      </div>
    </div>
  );
}
