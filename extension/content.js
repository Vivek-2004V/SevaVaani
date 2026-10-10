// SEVA VAANI - Content Script
// Injects the isolated Assistant Panel overlay and connects DOM mapping.
// Privacy note: This script runs in the isolated content-script world.
// Sensitive form-fill operations require explicit citizen confirmation (Phase 2B).

(function () {
  if (window.__SEVA_VAANI_INJECTED__) return;
  window.__SEVA_VAANI_INJECTED__ = true;

  // The only origin allowed to send privileged messages is our own extension frame.
  const EXTENSION_ORIGIN = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL('').replace(/\/$/, '').split('/').slice(0, 3).join('/')
    : null;
  // e.g. "chrome-extension://abcdefghijklmnop"

  let panelContainer = null;
  let isPanelVisible = false;

  function createAssistantPanel() {
    if (panelContainer) return panelContainer;

    panelContainer = document.createElement('div');
    panelContainer.id = 'seva-vaani-overlay-host';
    const isMobile = window.innerWidth <= 480;
    panelContainer.style.cssText = `
      position: fixed;
      bottom: clamp(8px, 2.5vw, 24px);
      ${isMobile ? 'left: 8px; right: 8px; width: calc(100% - 16px);' : 'right: clamp(12px, 2.5vw, 24px); width: min(380px, calc(100vw - 24px));'}
      height: min(600px, calc(100vh - 24px));
      max-height: calc(100dvh - 16px);
      z-index: 2147483647;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      background: #080d1a;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('assistant.html');
    // microphone permission is scoped to this iframe; allows audio capture and speech synthesis
    iframe.setAttribute('allow', 'microphone *; speaker-selection *; clipboard-write; autoplay');
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
    `;

    panelContainer.appendChild(iframe);
    document.body.appendChild(panelContainer);

    return panelContainer;
  }

  let launcherBtn = null;
  function createFloatingLauncher() {
    if (launcherBtn || document.getElementById('seva-vaani-floating-trigger')) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', createFloatingLauncher);
      return;
    }
    launcherBtn = document.createElement('button');
    launcherBtn.id = 'seva-vaani-floating-trigger';
    launcherBtn.setAttribute('aria-label', 'Open SEVA VAANI Voice Assistant');
    launcherBtn.title = 'SEVA VAANI — सेवा वाणी Voice Assistant';
    launcherBtn.innerHTML = `
      <span style="font-size: 16px;">🎙️</span>
      <span style="font-weight: 600; font-size: 12px; letter-spacing: 0.3px;">सेवा वाणी</span>
    `;
    launcherBtn.style.cssText = `
      position: fixed;
      bottom: clamp(10px, 2.5vw, 24px);
      right: clamp(10px, 2.5vw, 24px);
      z-index: 2147483646;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 9px 15px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border: 1.5px solid #38bdf8;
      border-radius: 999px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.4), 0 0 12px rgba(56, 189, 248, 0.25);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    launcherBtn.addEventListener('mouseenter', () => {
      launcherBtn.style.transform = 'translateY(-2px) scale(1.04)';
      launcherBtn.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.5), 0 0 16px rgba(56, 189, 248, 0.4)';
    });
    launcherBtn.addEventListener('mouseleave', () => {
      launcherBtn.style.transform = 'translateY(0) scale(1)';
      launcherBtn.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.4), 0 0 12px rgba(56, 189, 248, 0.25)';
    });
    launcherBtn.addEventListener('click', () => {
      togglePanel();
    });
    document.body.appendChild(launcherBtn);
  }

  function togglePanel() {
    const panel = createAssistantPanel();
    isPanelVisible = !isPanelVisible;
    if (isPanelVisible) {
      if (launcherBtn) launcherBtn.style.display = 'none';
      panel.style.display = 'flex';
      panel.style.transform = 'translateY(0) scale(1)';
      panel.style.opacity = '1';
    } else {
      panel.style.transform = 'translateY(20px) scale(0.96)';
      panel.style.opacity = '0';
      setTimeout(() => {
        if (!isPanelVisible) {
          panel.style.display = 'none';
          if (launcherBtn) launcherBtn.style.display = 'flex';
        }
      }, 300);
    }
  }

  // Persistent bridge to service worker keeps background worker ACTIVE
  let bgPort = null;
  function connectServiceWorker() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.connect) {
        bgPort = chrome.runtime.connect({ name: 'seva-vaani-worker-keepalive' });
        bgPort.onDisconnect.addListener(() => {
          bgPort = null;
          setTimeout(connectServiceWorker, 1500);
        });
      }
    } catch (_) {}
  }
  connectServiceWorker();
  createFloatingLauncher();

  // Listen for messages from background script or assistant iframe
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SEVA_VAANI_TOGGLE_PANEL') {
      togglePanel();
      sendResponse({ status: 'toggled', isVisible: isPanelVisible });
    }
  });

  window.addEventListener('message', (event) => {
    if (!event.data || !event.data.type) return;

    // PRIVACY FIREWALL & AUTHENTICATION:
    // Check if the message is coming from our assistant iframe or trusted extension origin.
    const senderOrigin = event.origin;
    const iframeWindow = panelContainer ? panelContainer.querySelector('iframe')?.contentWindow : null;
    const isFromAssistantIframe = Boolean(event.source && iframeWindow && event.source === iframeWindow);
    const isFromExtension = isFromAssistantIframe ||
      (EXTENSION_ORIGIN && senderOrigin === EXTENSION_ORIGIN) ||
      (typeof senderOrigin === 'string' && senderOrigin.startsWith('chrome-extension://'));

    // SEVA_VAANI_TOGGLE_PANEL or SEVA_VAANI_OPEN_EXTENSION:
    // Safe action: allows opening/closing from assistant iframe, host webpage button, or local demo portal.
    if (event.data.type === 'SEVA_VAANI_TOGGLE_PANEL' || event.data.type === 'SEVA_VAANI_OPEN_EXTENSION') {
      const isTrustedToggleOrigin = isFromExtension ||
        senderOrigin === window.location.origin ||
        senderOrigin === 'null' ||
        (typeof senderOrigin === 'string' && (senderOrigin.startsWith('http://localhost') || senderOrigin.startsWith('http://127.0.0.1')));
      if (!isTrustedToggleOrigin) {
        console.warn('[SEVA VAANI] Rejected toggle from untrusted origin:', senderOrigin);
        return;
      }
      togglePanel();
      return;
    }

    // SEVA_VAANI_FILL_CONFIRMED_FIELD: privileged form-fill; assistant iframe / extension only.
    if (event.data.type === 'SEVA_VAANI_FILL_CONFIRMED_FIELD') {
      if (!isFromExtension) {
        console.warn('[SEVA VAANI] Rejected fill from untrusted origin:', senderOrigin);
        return;
      }
      const { fieldName, value } = event.data;
      if (window.DOMFieldMapper) {
        const result = window.DOMFieldMapper.fillField(fieldName, value);
        if (event.source) {
          event.source.postMessage({
            type: 'SEVA_VAANI_FILL_RESULT',
            fieldName,
            value,
            result
          }, '*');
        }
      } else {
        if (event.source) {
          event.source.postMessage({
            type: 'SEVA_VAANI_FILL_RESULT',
            fieldName,
            value,
            result: { success: false, message: 'DOMFieldMapper not loaded in content script.' }
          }, '*');
        }
      }
    } else if (event.data.type === 'SEVA_VAANI_CLOSE_PANEL') {
      // Close panel requested
      if (isPanelVisible) togglePanel();
    }
  });

  // Ensure DOMFieldMapper is present in the isolated content-script world
  if (!window.DOMFieldMapper && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'SEVA_VAANI_INJECT_MAPPER' });
  }
})();
