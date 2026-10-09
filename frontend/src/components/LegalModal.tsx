import React from 'react';

export type LegalModalTab = 'privacy' | 'terms';

interface LegalModalProps {
  isOpen: boolean;
  activeTab: LegalModalTab;
  onClose: () => void;
  onTabChange: (tab: LegalModalTab) => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  activeTab,
  onClose,
  onTabChange
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-legal-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px 14px',
        background: 'rgba(5, 12, 7, 0.88)',
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
          maxWidth: 680,
          width: '100%',
          background: 'linear-gradient(180deg, rgba(16, 28, 18, 0.98) 0%, rgba(8, 16, 10, 0.99) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.35)',
          borderRadius: 24,
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(16, 185, 129, 0.2)',
          padding: '24px 22px',
          color: '#ffffff',
          position: 'relative',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📜</span>
            <div>
              <h2 id="legal-modal-title" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#f0fdf4' }}>
                {activeTab === 'privacy' ? 'गोपनीयता नीति (Privacy Policy)' : 'सेवा की शर्तें (Terms of Use)'}
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(215, 228, 215, 0.75)', margin: '2px 0 0' }}>
                SEVA VAANI • पारदर्शी एवं सुरक्षित नागरिक सेवा
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal modal"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#e2e8f0',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: 4,
            borderRadius: 12,
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: 16
          }}
        >
          <button
            type="button"
            onClick={() => onTabChange('privacy')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: activeTab === 'privacy' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
              color: activeTab === 'privacy' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            🔒 गोपनीयता नीति (Privacy)
          </button>
          <button
            type="button"
            onClick={() => onTabChange('terms')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: activeTab === 'terms' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
              color: activeTab === 'terms' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            📋 सेवा की शर्तें (Terms)
          </button>
        </div>

        {/* Scrollable Policy Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: 6,
            fontSize: 13,
            lineHeight: 1.65,
            color: '#cbd5e1'
          }}
        >
          {activeTab === 'privacy' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#34d399', margin: '0 0 4px' }}>
                  1. वास्तविक डेटा प्रवाह एवं स्थानीय भंडारण (Data Flows & Local Storage)
                </h3>
                <p style={{ margin: 0 }}>
                  SEVA VAANI में नागरिक का भरा हुआ फॉर्म डेटा, ड्राफ्ट और उपयोगकर्ता विवरण आपके स्थानीय सिस्टम पर चल रहे सुरक्षित FastAPI बैकएंड (127.0.0.1:8000) एवं SQLite डेटाबेस में संग्रहीत किया जाता है। कोई भी फ़ॉर्म डेटा बिना आपकी अनुमति के किसी तीसरे पक्ष को नहीं भेजा जाता है।
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#34d399', margin: '0 0 4px' }}>
                  2. वाक् पहचान एवं ऑडियो प्रसंस्करण (Voice Speech Recognition)
                </h3>
                <p style={{ margin: 0 }}>
                  ब्राउज़र में वॉइस इनपुट Chrome के <code>webkitSpeechRecognition</code> इंजन द्वारा प्रोसेस किया जाता है, जो ऑडियो को भाषण सर्वर पर भेजता है। यदि आप बिना किसी बाहरी ट्रांसमिशन के काम करना चाहते हैं, तो 100% ऑफ़लाइन <strong>कीबोर्ड टाइपिंग विकल्प</strong> हमेशा उपलब्ध है।
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#34d399', margin: '0 0 4px' }}>
                  3. प्राइवेसी फ़ायरवॉल एवं PII सुरक्षा (Privacy Firewall & PII Protection)
                </h3>
                <p style={{ margin: 0 }}>
                  SEVA VAANI प्राइवेसी फ़ायरवॉल संवेदनशील नागरिक पहचान डेटा (जैसे आधार नंबर, पैन कार्ड, बैंक खाता संख्या या पासवर्ड) को पहचानता है और उन्हें किसी भी बाहरी क्लाउड एआई मॉडल पर जाने से स्वचालित रूप से रोकता है। ऐसे मामलों में केवल सुरक्षित स्थानीय नियमों का उपयोग होता है।
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#34d399', margin: '0 0 4px' }}>
                  4. ट्रैकिंग कुकीज़ का पूर्ण अभाव (Zero Tracking Cookies)
                </h3>
                <p style={{ margin: 0 }}>
                  हम किसी भी विज्ञापन, मार्केटिंग या क्रॉस-साइट ट्रैकिंग कुकी का उपयोग नहीं करते हैं। केवल उपयोगकर्ता लॉगिन सत्र के प्रबंधन हेतु सुरक्षित <code>sessionStorage</code> तथा एक्सटेंशन में <code>chrome.storage.local</code> का उपयोग होता है।
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#34d399', margin: '0 0 4px' }}>
                  5. खाता एवं डेटा विलोपन अधिकार (Right to Erasure)
                </h3>
                <p style={{ margin: 0 }}>
                  नागरिक किसी भी समय अपने प्रोफ़ाइल से खाता और उससे जुड़े सभी सत्र रिकॉर्ड स्थायी रूप से मिटा सकते हैं (डेटा मिनिमाइज़ेशन मानक)।
                </p>
              </section>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', margin: '0 0 4px' }}>
                  1. सेवा का उद्देश्य एवं प्रकृति (Nature of Service)
                </h3>
                <p style={{ margin: 0 }}>
                  SEVA VAANI एक बहुभाषी आवाज़-आधारित नागरिक सहायता सहायक (Voice Assistant) है, जिसका उद्देश्य सार्वजनिक सेवाओं के डिजिटल फॉर्म भरने में नागरिकों की सहायता करना है।
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', margin: '0 0 4px' }}>
                  2. सरकारी पोर्टल एकीकरण अस्वीकरण (Government Portal Disclaimer)
                </h3>
                <p style={{ margin: 0 }}>
                  जब तक किसी विशिष्ट सरकारी पोर्टल (जैसे NSP या MahaDBT) के साथ प्रत्यक्ष अधिकृत एकीकरण की पुष्टि न हो, SEVA VAANI पर दर्ज किया गया आवेदन केवल आंतरिक बैकएंड में एक सुरक्षित स्थानीय रिकॉर्ड के रूप में सुरक्षित रहता है। यह आधिकारिक सरकारी पोर्टल पर सीधा सबमिशन नहीं माना जाता जब तक स्पष्ट पुष्टि न दी जाए।
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', margin: '0 0 4px' }}>
                  3. नागरिक पुष्टि एवं शून्य स्वचालित सबमिशन (Zero Auto-Submit)
                </h3>
                <p style={{ margin: 0 }}>
                  प्रत्येक फ़ील्ड का उत्तर नागरिक द्वारा स्पष्ट रूप से जांचा और पुष्ट किया जाना अनिवार्य है। कोई भी जानकारी बिना नागरिक की स्पष्ट सहमति के स्वचालित रूप से जमा (Auto-Submit) नहीं की जाती है।
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', margin: '0 0 4px' }}>
                  4. दायित्व की सीमा (Limitation of Liability)
                </h3>
                <p style={{ margin: 0 }}>
                  सहायक द्वारा निकाले गए फ़ील्ड मानों की सत्यता की अंतिम ज़िम्मेदारी नागरिक/आवेदक की है। आवेदन को अंतिम रूप देने से पहले हमेशा समीक्षा स्क्रीन पर विवरण सत्यापित करें।
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11.5,
            color: 'rgba(255, 255, 255, 0.5)'
          }}
        >
          <span>SEVA VAANI • डिजिटल नागरिक सुरक्षा मानक</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            समझ लिया (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
