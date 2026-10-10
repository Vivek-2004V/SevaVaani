import React from 'react';

export interface ExtensionModalProps {
  onClose: () => void;
  onContinueInWebApp?: () => void;
}

export const ExtensionModal: React.FC<ExtensionModalProps> = ({
  onClose,
  onContinueInWebApp
}) => {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '20px 14px',
        background: 'rgba(5, 12, 7, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          maxWidth: 'min(620px, calc(100vw - 20px))', width: '100%',
          background: 'linear-gradient(180deg, rgba(16, 28, 18, 0.95) 0%, rgba(8, 16, 10, 0.98) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.35)',
          borderRadius: 24,
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.2)',
          padding: 'clamp(14px, 3.5vw, 24px)',
          color: '#ffffff',
          position: 'relative',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
            }}>
              🧩
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 8 }}>
                SEVA VAANI Extension Bridge
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(52, 211, 153, 0.2)', color: '#6ee7b7', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                  v1.0.0 (वैकल्पिक)
                </span>
              </h2>
              <p style={{ fontSize: 12.5, color: 'rgba(215, 228, 215, 0.75)', margin: '4px 0 0' }}>
                सरकारी पोर्टल पर सीधे बोलकर फॉर्म भरें • Zero Auto-Submit Safety
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#e2e8f0', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Status pills */}
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20,
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#86efac' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></span>
            Backend: 127.0.0.1:8000
          </div>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#93c5fd' }}>
            <span>🛡️</span> Conservative Fill Guard
          </div>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fde047' }}>
            <span>🗣️</span> 11 Languages Supported
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: 20 }}>
          {/* Action 1: Open Test Portal */}
          <div style={{
            padding: '16px', borderRadius: 16,
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(52, 211, 153, 0.25)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🖥️</span> सरकारी टेस्ट पोर्टल
              </div>
              <p style={{ fontSize: 11.5, color: 'rgba(220, 240, 220, 0.7)', lineHeight: 1.5, margin: 0 }}>
                10-फ़ील्ड वाले मॉक सरकारी पोर्टल पर एक्सटेंशन के ऑटो-फिल का सीधा परीक्षण करें।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.open('/test-portal.html', '_blank');
              }}
              style={{
                marginTop: 12, padding: '8px 14px', borderRadius: 999,
                background: '#10b981', color: '#064e3b',
                fontWeight: 700, fontSize: 12, border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
              }}
            >
              पोर्टल खोलें ↗
            </button>
          </div>

          {/* Action 2: Trigger Extension Panel on this page */}
          <div style={{
            padding: '16px', borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0fdf4', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚡</span> एक्सटेंशन पैनल चालू करें
              </div>
              <p style={{ fontSize: 11.5, color: 'rgba(220, 240, 220, 0.7)', lineHeight: 1.5, margin: 0 }}>
                यदि एक्सटेंशन लोड है, तो इसी पेज पर तुरंत फ्लोटिंग वॉइस असिस्टेंट ओपन करें।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.postMessage({ type: 'SEVA_VAANI_TOGGLE_PANEL' }, '*');
              }}
              style={{
                marginTop: 12, padding: '8px 14px', borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.12)', color: '#ffffff',
                fontWeight: 600, fontSize: 12, border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              टॉगल करें 🎙️
            </button>
          </div>
        </div>

        {/* Quick 3-Step Setup Instructions */}
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 16
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📥</span> Chrome में एक्सटेंशन कैसे लोड करें (वैकल्पिक):
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: 'rgba(200, 215, 200, 0.8)', lineHeight: 1.6 }}>
            <li>Chrome में <code style={{ color: '#6ee7b7', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>chrome://extensions</code> खोलें।</li>
            <li>ऊपर दाईं ओर <strong>Developer mode</strong> चालू (ON) करें।</li>
            <li><strong>Load unpacked</strong> दबाएं और <strong>extension</strong> फ़ोल्डर चुनें।</li>
          </ol>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)' }}>
            Seva Vaani • Team Arise HACK-1014
          </span>
          {onContinueInWebApp && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onContinueInWebApp();
              }}
              style={{
                padding: '9px 20px', borderRadius: 999,
                background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)',
                color: '#064e3b', fontWeight: 700, fontSize: 12.5,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              वेब ऐप में आगे बढ़ें →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtensionModal;
