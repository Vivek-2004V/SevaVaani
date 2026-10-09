// SEVA VAANI - Content Script
// Injects the isolated Assistant Panel overlay and connects DOM mapping.

(function () {
  if (window.__SEVA_VAANI_INJECTED__) return;
  window.__SEVA_VAANI_INJECTED__ = true;

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
    iframe.setAttribute('allow', 'microphone');
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

    if (event.data.type === 'SEVA_VAANI_TOGGLE_PANEL' || event.data.type === 'SEVA_VAANI_OPEN_EXTENSION') {
      togglePanel();
      return;
    }

    if (event.data.type === 'SEVA_VAANI_FILL_CONFIRMED_FIELD') {
      const { fieldName, value } = event.data;
      if (window.DOMFieldMapper) {
        const result = window.DOMFieldMapper.fillField(fieldName, value);
        event.source.postMessage({
          type: 'SEVA_VAANI_FILL_RESULT',
          fieldName,
          result
        }, '*');
      }
    } else if (event.data.type === 'SEVA_VAANI_CLOSE_PANEL') {
      if (isPanelVisible) togglePanel();
    }
  });

  // Automatically load DOMFieldMapper helper into content context
  const mapperScript = document.createElement('script');
  mapperScript.src = chrome.runtime.getURL('domMapper.js');
  document.head.appendChild(mapperScript);
})();
