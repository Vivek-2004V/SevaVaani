// SEVA VAANI - Background Service Worker (Manifest V3)
// Privacy & Security: No tokens, transcripts, or personal data are ever stored or logged here.

// 1. Lifecycle management: Keep service worker active and responsive
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[SEVA VAANI] Service Worker installed & active:', details.reason);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[SEVA VAANI] Service Worker started.');
});

// Periodic heartbeat via storage API keeps service worker active and prevents idle timeout
function keepWorkerActive() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['_sv_last_active'], () => {
      // Keeps execution context active
    });
  }
}
// Persistent active port connections from content scripts keep service worker alive
const activePorts = new Set();
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'seva-vaani-worker-keepalive') {
    activePorts.add(port);
    port.onDisconnect.addListener(() => {
      activePorts.delete(port);
    });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Skip internal browser pages where extensions cannot inject scripts
  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
    console.info('[SEVA VAANI] Assistant cannot run on internal browser pages. Please open a website or test-portal.html.');
    return;
  }

  try {
    // 1. Try sending toggle message directly if content script is already present
    chrome.tabs.sendMessage(tab.id, { type: 'SEVA_VAANI_TOGGLE_PANEL' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        // 2. If not yet present, inject dynamically and toggle
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['domMapper.js', 'content.js']
        }).then(() => {
          chrome.tabs.sendMessage(tab.id, { type: 'SEVA_VAANI_TOGGLE_PANEL' });
        }).catch((err) => {
          console.warn('[SEVA VAANI] Dynamic script injection failed:', err.message || 'injection_error');
        });
      }
    });
  } catch (err) {
    console.warn('[SEVA VAANI] Action handler exception:', err.message || 'action_error');
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
