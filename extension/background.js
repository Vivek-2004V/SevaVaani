// SEVA VAANI - Background Service Worker (Manifest V3)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Ensure script is injected only on http/https pages
  if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://') || tab.url.startsWith('file://'))) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // Send toggle message
      chrome.tabs.sendMessage(tab.id, { type: 'SEVA_VAANI_TOGGLE_PANEL' });
    } catch (err) {
      console.warn('Could not inject content script:', err);
    }
  }
});
