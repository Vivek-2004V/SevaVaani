// SEVA VAANI - Background Service Worker (Manifest V3)
// Privacy & Security: No tokens, transcripts, or personal data are ever stored or logged here.

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Only inject on http/https/file pages; never on chrome:// or extension pages.
  if (tab.url && (
    tab.url.startsWith('http://') ||
    tab.url.startsWith('https://') ||
    tab.url.startsWith('file://')
  )) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // Send toggle message via chrome.tabs (not postMessage) to avoid any web page interception.
      chrome.tabs.sendMessage(tab.id, { type: 'SEVA_VAANI_TOGGLE_PANEL' });
    } catch (err) {
      // Log only structural error type; never log tab URLs or user data.
      console.warn('[SEVA VAANI] Could not inject content script:', err.message || 'injection_error');
    }
  }
});

// Handle request from content script to inject domMapper into the ISOLATED
// content-script execution world (NOT the main page world).
// This prevents host-page JavaScript from accessing or tampering with DOMFieldMapper.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'SEVA_VAANI_INJECT_MAPPER') return;

  // Validate sender: must be from a content script (tab exists, not from an extension page).
  if (!sender.tab || !sender.tab.id) {
    console.warn('[SEVA VAANI] Rejected INJECT_MAPPER from non-tab sender.');
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: sender.tab.id },
    files: ['domMapper.js'],
    world: 'ISOLATED'   // Content-script world; isolated from page JS.
  }).then(() => {
    sendResponse({ status: 'injected' });
  }).catch((err) => {
    console.warn('[SEVA VAANI] DOMFieldMapper injection failed:', err.message || 'injection_error');
    sendResponse({ status: 'failed' });
  });

  return true; // Keep channel open for async response.
});
