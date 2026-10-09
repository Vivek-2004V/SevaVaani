// SEVA VAANI - Content Script
// Injects the isolated Assistant Panel overlay and connects DOM mapping.
// Privacy note: This script runs in the isolated content-script world.
// Sensitive form-fill operations require explicit citizen confirmation (Phase 2B).

(function () {
  if (window.__SEVA_VAANI_INJECTED__) return;
  window.__SEVA_VAANI_INJECTED__ = true;

  // The only origin allowed to send privileged messages is our own extension frame.
  // Derived at runtime; never hard-coded.
  const EXTENSION_ORIGIN = chrome.runtime.getURL('').replace(/\/$/, '').split('/').slice(0, 3).join('/');
  // e.g. "chrome-extension://abcdefghijklmnop"

  let panelContainer = null;
  let isPanelVisible = false;

  function createAssistantPanel() {
    if (panelContainer) return panelContainer;

    panelContainer = document.createElement('div');
    panelContainer.id = 'seva-vaani-overlay-host';
    panelContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 380px;
      height: 600px;
      max-height: 85vh;
      z-index: 2147483647;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08);
      background: #ffffff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('assistant.html');
    // microphone permission is scoped to this iframe only; not delegated to the host page.
    iframe.setAttribute('allow', 'microphone; speaker-selection');
    // Sandbox: allow-scripts needed for assistant.js; allow-same-origin so chrome.storage works
    // inside the extension page; do NOT allow-forms or allow-top-navigation.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
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

  function togglePanel() {
    const panel = createAssistantPanel();
    isPanelVisible = !isPanelVisible;
    if (isPanelVisible) {
      panel.style.display = 'flex';
      panel.style.transform = 'translateY(0) scale(1)';
      panel.style.opacity = '1';
    } else {
      panel.style.transform = 'translateY(20px) scale(0.96)';
      panel.style.opacity = '0';
      setTimeout(() => {
        if (!isPanelVisible) panel.style.display = 'none';
      }, 300);
    }
  }

  // Listen for messages from background script or assistant iframe
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SEVA_VAANI_TOGGLE_PANEL') {
      togglePanel();
      sendResponse({ status: 'toggled', isVisible: isPanelVisible });
    }
  });

  window.addEventListener('message', (event) => {
    if (!event.data || !event.data.type) return;

    // PRIVACY FIREWALL: Only accept privileged messages from our own extension origin.
    // Reject any message from the host page, other iframes, or cross-origin sources.
    const senderOrigin = event.origin;
    const isFromExtension = senderOrigin === EXTENSION_ORIGIN;

    // SEVA_VAANI_TOGGLE_PANEL is sent by the assistant iframe to close the panel;
    // it must also be extension-origin only.
    if (event.data.type === 'SEVA_VAANI_TOGGLE_PANEL' || event.data.type === 'SEVA_VAANI_OPEN_EXTENSION') {
      if (!isFromExtension) {
        console.warn('[SEVA VAANI] Rejected toggle from untrusted origin:', senderOrigin);
        return;
      }
      togglePanel();
      return;
    }

    // SEVA_VAANI_FILL_CONFIRMED_FIELD: privileged form-fill; extension-origin only.
    if (event.data.type === 'SEVA_VAANI_FILL_CONFIRMED_FIELD') {
      if (!isFromExtension) {
        console.warn('[SEVA VAANI] Rejected fill from untrusted origin:', senderOrigin);
        return;
      }
      const { fieldName, value } = event.data;
      if (window.DOMFieldMapper) {
        const result = window.DOMFieldMapper.fillField(fieldName, value);
        // Reply back to the extension frame only — never to '*'.
        if (event.source) {
          event.source.postMessage({
            type: 'SEVA_VAANI_FILL_RESULT',
            fieldName,
            result
          }, EXTENSION_ORIGIN);
        }
      }
    } else if (event.data.type === 'SEVA_VAANI_CLOSE_PANEL') {
      // Close is non-privileged; any message can close the panel (low risk).
      if (isPanelVisible) togglePanel();
    }
  });

  // Load DOMFieldMapper via scripting API into the ISOLATED content-script world,
  // not into the page's main world. This prevents host-page JS from accessing
  // or tampering with the mapper. We request injection from the background worker.
  chrome.runtime.sendMessage({ type: 'SEVA_VAANI_INJECT_MAPPER' });
})();
