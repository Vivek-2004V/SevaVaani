import React from 'react';
import SevaVaaniLogo from '../components/SevaVaaniLogo';

interface NotFoundProps {
  onGoHome: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onGoHome }) => {
  return (
    <div
      role="main"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
        color: '#ffffff',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <SevaVaaniLogo size={72} />
      </div>

      <div
        style={{
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: 999,
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#fca5a5',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 16
        }}
      >
        त्रुटि 404 • Error 404
      </div>

      <h1
        style={{
          fontSize: 'clamp(28px, 5vw, 42px)',
          fontWeight: 800,
          margin: '0 0 12px',
          background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        पृष्ठ नहीं मिला (Page Not Found)
      </h1>

      <p
        style={{
          maxWidth: 520,
          fontSize: 'clamp(14px, 2.5vw, 16px)',
          color: 'rgba(203, 213, 225, 0.8)',
          lineHeight: 1.6,
          margin: '0 0 32px'
        }}
      >
        आप जिस पृष्ठ या सेवा की तलाश कर रहे हैं, वह स्थानांतरित हो गई है या उपलब्ध नहीं है।
        कृपया मुख्य पृष्ठ पर लौटकर अपनी सार्वजनिक सेवा चुनें।
      </p>

      <button
        type="button"
        id="btn-not-found-home"
        onClick={onGoHome}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 32px',
          borderRadius: 999,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          fontSize: 15,
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.45)',
          transition: 'transform 0.15s ease'
        }}
      >
        <span>🏠</span>
        <span>मुख्य पृष्ठ पर वापस जाएं (Return Home)</span>
      </button>

      <div
        style={{
          marginTop: 48,
          fontSize: 12,
          color: 'rgba(148, 163, 184, 0.5)'
        }}
      >
        SEVA VAANI • बहुभाषी आवाज़ सार्वजनिक सेवा सहायक
      </div>
    </div>
  );
};

export default NotFound;
