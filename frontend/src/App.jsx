import React, { useState, useEffect } from 'react';

export default function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error('API health check error:', err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-lg w-full shadow-sm text-center">
        <div className="text-4xl mb-4">🎙️</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          SEVA VAANI
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Frontend UI has been reset for a fresh start. Backend API is active and ready.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs font-mono">
          <div className="font-bold text-slate-700 mb-1">Backend Status:</div>
          {health ? (
            <pre className="text-emerald-600">{JSON.stringify(health, null, 2)}</pre>
          ) : (
            <span className="text-slate-400">Connecting to API...</span>
          )}
        </div>
      </div>
    </div>
  );
}
