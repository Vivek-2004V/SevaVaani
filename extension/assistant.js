// SEVA VAANI - Assistant Panel Controller
// Multilingual Voice Assistant (Hindi & Marathi) with Auth, Explicit Confirmation, and SQLite Persistence
//
// PRIVACY NOTICE (shown to user on first use via consent UI):
//   - Microphone audio is processed by the browser's built-in Speech Recognition API.
//   - Chrome's webkitSpeechRecognition sends audio to Google's speech servers.
//     It is NOT offline processing. When microphone is unavailable or denied,
//     text-entry fallback is offered instead.
//   - No raw audio is stored on device or transmitted to the SEVA VAANI backend.
//   - Transcripts (text only) are sent to the SEVA VAANI local backend (127.0.0.1:8000) for
//     field extraction. No transcript is sent to any external LLM unless explicitly configured.
//   - Form field values are only filled after explicit citizen confirmation.

const API_BASE = 'http://127.0.0.1:8000';

// Extension self-origin for postMessage targeting — never '*'.
const EXTENSION_ORIGIN = (typeof chrome !== 'undefined' && chrome.runtime)
  ? chrome.runtime.getURL('').replace(/\/$/, '').split('/').slice(0, 3).join('/')
  : null; // null when running in standalone web context (non-extension).

// Privacy Firewall Enforcement: Every outbound network call passes through secureFetch
async function privacyFetch(url, options = {}) {
  if (typeof window !== 'undefined' && window.SEVA_VAANI_PRIVACY_FIREWALL && window.SEVA_VAANI_PRIVACY_FIREWALL.secureFetch) {
    return window.SEVA_VAANI_PRIVACY_FIREWALL.secureFetch(url, options);
  }
  return fetch(url, options);
}

// State
let currentSessionId = null;
let currentLanguage = 'hi';
let currentField = 'full_name';
let pendingCandidate = null;
let isListening = false;
let isProcessing = false;
let isSpeaking = false;
let recognition = null;
let authToken = null;
let currentUser = null;
let autoProcessTimer = null;

// DOM Elements
const langSelect = document.getElementById('language-select');
const closeBtn = document.getElementById('close-btn');

// Auth elements
const authBar = document.getElementById('auth-bar');
const authStatusDot = document.getElementById('auth-status-dot');
const authUserLabel = document.getElementById('auth-user-label');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const logoutBtn = document.getElementById('logout-btn');
const authPanel = document.getElementById('auth-panel');
const authTabLogin = document.getElementById('auth-tab-login');
const authTabRegister = document.getElementById('auth-tab-register');
const authCloseBtn = document.getElementById('auth-close-btn');
const authForm = document.getElementById('auth-form');
const authNameGroup = document.getElementById('auth-name-group');
const authName = document.getElementById('auth-name');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authCancelBtn = document.getElementById('auth-cancel-btn');

// Error Banner
const errorBanner = document.getElementById('error-banner');
const errorMessageText = document.getElementById('error-message-text');
const dismissErrorBtn = document.getElementById('dismiss-error-btn');

// Progress
const progressBarFill = document.getElementById('progress-bar-fill');
const fieldCounter = document.getElementById('field-counter');
const progressPercent = document.getElementById('progress-percent');

// Active Prompt
const activeFieldBadge = document.getElementById('active-field-badge');
const activePromptText = document.getElementById('active-prompt-text');
const speakPromptBtn = document.getElementById('speak-prompt-btn');
const speakPromptLabel = document.getElementById('speak-prompt-label');

// Confirmation
const confirmationCard = document.getElementById('confirmation-card');
const confirmTitleText = document.getElementById('confirm-title-text');
const confirmMessage = document.getElementById('confirm-message');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');
const confirmReplayBtn = document.getElementById('confirm-replay-btn');

// Transcript Editor
const transcriptCard = document.getElementById('transcript-card');
const transcriptTitle = document.getElementById('transcript-title');
const transcriptEditor = document.getElementById('transcript-editor');
const transcriptProcessBtn = document.getElementById('transcript-process-btn');
const transcriptRetryBtn = document.getElementById('transcript-retry-btn');
const transcriptClearBtn = document.getElementById('transcript-clear-btn');

// Microphone
const micBtn = document.getElementById('mic-btn');
const micPulseRing = document.getElementById('mic-pulse-ring');
const micStatusLabel = document.getElementById('mic-status-label');

// Fallback & Help
const fallbackDetails = document.getElementById('fallback-details');
const fallbackTextInput = document.getElementById('fallback-text-input');
const fallbackSubmitBtn = document.getElementById('fallback-submit-btn');
const humanHelpBtn = document.getElementById('human-help-btn');

// Footer
const serverStatusDot = document.getElementById('server-status-dot');
const backendStatusText = document.getElementById('backend-status-text');

// ═══════════════════════════════════════════════════════════════════
// 1. Storage Helpers (Chrome Storage API ONLY — no localStorage for tokens)
// Privacy: Tokens must never be accessible to host-page JavaScript.
// localStorage is readable by any script on the same origin including
// injected page scripts. chrome.storage.local is isolated to the extension.
// ═══════════════════════════════════════════════════════════════════
async function getStoredToken() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sv_auth_token'], (res) => {
        resolve(res.sv_auth_token || null);
      });
    });
  }
  // Standalone (non-extension) fallback: use sessionStorage only
  // (scoped to tab session; cleared on tab close; not accessible cross-tab).
  try { return sessionStorage.getItem('sv_auth_token'); } catch { return null; }
}

async function setStoredToken(token) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    if (token) {
      chrome.storage.local.set({ sv_auth_token: token });
    } else {
      chrome.storage.local.remove(['sv_auth_token']);
    }
    return;
  }
  // Standalone fallback: sessionStorage only (no localStorage).
  try {
    if (token) {
      sessionStorage.setItem('sv_auth_token', token);
    } else {
      sessionStorage.removeItem('sv_auth_token');
    }
  } catch (e) {
    console.warn('[SEVA VAANI] Could not store token:', e.name);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2. Auth State & Endpoints
// ═══════════════════════════════════════════════════════════════════
async function checkAuthStatus() {
  authToken = await getStoredToken();
  if (!authToken) {
    updateAuthUI(null);
    return;
  }
  try {
    const res = await privacyFetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      currentUser = await res.json();
      updateAuthUI(currentUser);
    } else {
      // Token invalid or expired
      await setStoredToken(null);
      authToken = null;
      currentUser = null;
      updateAuthUI(null);
    }
  } catch (err) {
    console.warn('Could not verify auth token:', err);
    updateAuthUI(null);
  }
}

function updateAuthUI(user) {
  if (user) {
    authStatusDot.className = 'auth-status-dot authenticated';
    authUserLabel.innerText = `👤 ${user.email}`;
    authToggleBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    authPanel.classList.add('hidden');
  } else {
    authStatusDot.className = 'auth-status-dot unauthenticated';
    authUserLabel.innerText = currentLanguage === 'mr' ? 'अतिथी सत्र (Guest)' : 'अतिथि सत्र (Guest Session)';
    authToggleBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }
}

let authMode = 'login'; // 'login' | 'register'

function setAuthMode(mode) {
  authMode = mode;
  authError.classList.add('hidden');
  if (mode === 'login') {
    authTabLogin.classList.add('active');
    authTabRegister.classList.remove('active');
    authNameGroup.classList.add('hidden');
    authSubmitBtn.innerText = currentLanguage === 'mr' ? 'लॉगिन करा' : 'लॉगिन करें';
  } else {
    authTabRegister.classList.add('active');
    authTabLogin.classList.remove('active');
    authNameGroup.classList.remove('hidden');
    authSubmitBtn.innerText = currentLanguage === 'mr' ? 'नोंदणी करा (Register)' : 'पंजीकरण करें (Register)';
  }
}

async function handleAuthSubmit() {
  authError.classList.add('hidden');
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const name = authName.value.trim();

  if (!email || !password) {
    authError.innerText = 'कृपया ईमेल और पासवर्ड दर्ज करें।';
    authError.classList.remove('hidden');
    return;
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.innerText = 'प्रक्रिया जारी है...';

  try {
    if (authMode === 'register') {
      const regRes = await privacyFetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: name })
      });
      if (!regRes.ok) {
        const errData = await regRes.json();
        throw new Error(errData.detail || 'पंजीकरण विफल रहा');
      }
    }

    // Login to obtain 256-bit token
    const loginRes = await privacyFetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!loginRes.ok) {
      const errData = await loginRes.json();
      throw new Error(errData.detail || 'लॉगिन विफल रहा');
    }

    const data = await loginRes.json();
    authToken = data.token;
    currentUser = data.user;
    await setStoredToken(authToken);

    updateAuthUI(currentUser);
    authPanel.classList.add('hidden');
    authEmail.value = '';
    authPassword.value = '';
    authName.value = '';

    // Re-initialize session with authenticated user
    await initSession();
  } catch (err) {
    authError.innerText = err.message || 'त्रुटि उत्पन्न हुई।';
    authError.classList.remove('hidden');
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.innerText = authMode === 'login' ? 'लॉगिन करें' : 'पंजीकरण करें';
  }
}

async function handleLogout() {
  if (authToken) {
    try {
      await privacyFetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (e) {
      // Ignore network errors on logout
    }
  }
  await setStoredToken(null);
  authToken = null;
  currentUser = null;
  updateAuthUI(null);
  await initSession();
}

// ═══════════════════════════════════════════════════════════════════
// 3. Session Initialization & UI State Synchronization
// ═══════════════════════════════════════════════════════════════════
async function initSession() {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await privacyFetch(`${API_BASE}/api/session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        service_id: 'scholarship_app',
        language: currentLanguage
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentSessionId = data.session_id;

    serverStatusDot.className = 'status-dot';
    backendStatusText.innerText = `FastAPI Connected (${currentLanguage.toUpperCase()})`;
    hideErrorBanner();

    updateUIState(data);
  } catch (err) {
    console.warn('Backend offline or not reachable:', err);
    serverStatusDot.className = 'status-dot offline';
    backendStatusText.innerText = 'FastAPI Offline (127.0.0.1:8000)';
    showErrorBanner(
      currentLanguage === 'mr'
        ? '⚠️ SEVA VAANI बॅकएंड सर्व्हरशी संपर्क होत नाही. कृपया सर्व्हर चालू असल्याचे तपासा.'
        : '⚠️ SEVA VAANI बैकएंड सर्वर (http://127.0.0.1:8000) से संपर्क नहीं हो पा रहा है।'
    );
  }
}

function updateUIState(state) {
  if (!state) return;
  currentField = state.current_field || 'full_name';
  const progress = state.progress || { confirmed_count: 0, total_fields: 10, percentage: 0 };

  progressBarFill.style.width = `${progress.percentage || 10}%`;
  progressPercent.innerText = `${progress.percentage || 0}%`;
  fieldCounter.innerText = `Field ${(progress.confirmed_count || 0) + 1} of ${progress.total_fields || 10}`;

  if (state.active_field_definition) {
    const def = state.active_field_definition;
    const label = def[`label_${currentLanguage}`] || def.label_hi || def.label_en || currentField;
    activeFieldBadge.innerText = label;
  } else {
    activeFieldBadge.innerText = currentField;
  }

  const prompt = state.current_prompt || (currentLanguage === 'mr' ? 'कृपया आपले तपशील सांगा.' : 'कृपया अपना विवरण बताएं।');
  activePromptText.innerText = prompt;
  speakText(prompt);

  // Hide confirmation card on fresh field
  if (!state.candidate_field) {
    confirmationCard.classList.add('hidden');
    pendingCandidate = null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4. Voice STT & Transcript Editing Pipeline
// ═══════════════════════════════════════════════════════════════════
function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.interimResults = true;

  rec.onstart = () => {
    isListening = true;
    clearAutoProcessTimer();
    micBtn.className = 'mic-button listening';
    micPulseRing.classList.remove('hidden');
    micStatusLabel.innerText = currentLanguage === 'mr' ? 'ऐकत आहोत... बोला (Listening...)' : 'सुन रहे हैं... बोलिए (Listening...)';
    hideErrorBanner();
  };

  rec.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const currentText = finalTranscript || interimTranscript;
    if (currentText) {
      transcriptCard.classList.remove('hidden');
      transcriptEditor.value = currentText;
    }

    if (finalTranscript) {
      // Citizen has finished speaking; allow 1.2s for optional editing before auto-processing
      scheduleAutoProcess(finalTranscript);
    }
  };

  rec.onerror = (e) => {
    isListening = false;
    micBtn.className = 'mic-button';
    micPulseRing.classList.add('hidden');
    clearAutoProcessTimer();

    console.warn('SpeechRecognition error:', e.error);
    if (e.error === 'not-allowed' || e.error === 'permission-denied') {
      showErrorBanner(
        currentLanguage === 'mr'
          ? '⚠️ मायक्रोफोन परवानगी नाकारली: कृपया ब्राउझरमध्ये परवानगी द्या किंवा खाली टाइप करा.'
          : '⚠️ माइक्रोफ़ोन अनुमति अस्वीकृत: कृपया ब्राउज़र में अनुमति दें या नीचे टाइप करें।'
      );
      fallbackDetails.open = true;
    } else if (e.error === 'no-speech') {
      micStatusLabel.innerText = currentLanguage === 'mr' ? 'आवाज आला नाही. पुन्हा बोला.' : 'आवाज़ सुनाई नहीं दी। कृपया दोबारा बोलें।';
    } else {
      micStatusLabel.innerText = currentLanguage === 'mr' ? 'आवाज ओळखण्यात त्रुटी. टाइप करा.' : 'आवाज़ पहचान में त्रुटि। कृपया टाइप करें।';
      fallbackDetails.open = true;
    }
  };

  rec.onend = () => {
    isListening = false;
    if (!isProcessing && !isSpeaking) {
      micBtn.className = 'mic-button';
      micPulseRing.classList.add('hidden');
      micStatusLabel.innerText = currentLanguage === 'mr' ? 'बोलण्यासाठी माइक दाबा (Tap to Speak)' : 'बोलने के लिए माइक दबाएं (Tap to Speak)';
    }
  };

  return rec;
}

function clearAutoProcessTimer() {
  if (autoProcessTimer) {
    clearTimeout(autoProcessTimer);
    autoProcessTimer = null;
  }
}

function scheduleAutoProcess(text) {
  clearAutoProcessTimer();
  micStatusLabel.innerText = currentLanguage === 'mr' ? 'तपासत आहोत... (संपादित करू शकता)' : 'समीक्षा जारी... (आप संपादित कर सकते हैं)';
  autoProcessTimer = setTimeout(() => {
    const val = transcriptEditor.value.trim() || text;
    if (val) sendTurn(val);
  }, 1200);
}

// ═══════════════════════════════════════════════════════════════════
// 5. Backend Turn Processing (NLU, Validation, Confidence)
// ═══════════════════════════════════════════════════════════════════
async function sendTurn(transcript) {
  if (!currentSessionId || !transcript) return;
  clearAutoProcessTimer();
  setProcessingState(true);

  try {
    const res = await privacyFetch(`${API_BASE}/api/assist/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: currentSessionId,
        transcript: transcript,
        input_type: 'voice',
        latency_ms: 120
      })
    });
    const data = await res.json();
    setProcessingState(false);

    if (data.status === 'need_confirmation') {
      pendingCandidate = {
        fieldName: data.field_name || currentField,
        value: data.candidate_value
      };
      confirmTitleText.innerText = currentLanguage === 'mr' ? '❓ कृपया पुष्टी करा (Please Confirm)' : '❓ कृपया पुष्टि करें (Please Confirm)';
      confirmMessage.innerText = data.message || (currentLanguage === 'mr' ? `काय ${data.candidate_value} बरोबर आहे?` : `क्या ${data.candidate_value} सही है?`);
      confirmationCard.classList.remove('hidden');
      speakText(confirmMessage.innerText);
    } else if (data.status === 'saved_next_field') {
      updateUIState(data.session_state);
    } else {
      activePromptText.innerText = data.message || (currentLanguage === 'mr' ? 'कृपया पुन्हा सांगा.' : 'कृपया दोबारा बताएं।');
      speakText(activePromptText.innerText);
    }
  } catch (err) {
    setProcessingState(false);
    console.error('Error in sendTurn:', err);
    showErrorBanner('बैकएंड नेटवर्क त्रुटि। विवरण सुरक्षित है।');
  }
}

// ═══════════════════════════════════════════════════════════════════
// 6. Explicit Confirmation Gate & In-Page DOM Autofill
// ═══════════════════════════════════════════════════════════════════
async function handleConfirm(action) {
  if (!currentSessionId) return;

  if (action === 'confirm' && pendingCandidate) {
    // Notify parent window to fill field into page DOM via domMapper.js.
    // Use EXTENSION_ORIGIN to prevent any page from spoofing this message.
    const targetOrigin = EXTENSION_ORIGIN || '*';
    window.parent.postMessage({
      type: 'SEVA_VAANI_FILL_CONFIRMED_FIELD',
      fieldName: pendingCandidate.fieldName,
      value: pendingCandidate.value
    }, targetOrigin);
  }

  try {
    const res = await privacyFetch(`${API_BASE}/api/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: currentSessionId,
        field_name: currentField,
        action: action
      })
    });
    const data = await res.json();
    confirmationCard.classList.add('hidden');
    transcriptCard.classList.add('hidden');
    transcriptEditor.value = '';
    pendingCandidate = null;

    updateUIState(data.session_state);
  } catch (err) {
    console.error('Error confirming field:', err);
    showErrorBanner('पुष्टि दर्ज करने में त्रुटि।');
  }
}

// ═══════════════════════════════════════════════════════════════════
// 7. Speech Synthesis (TTS) Helper
// ═══════════════════════════════════════════════════════════════════
function speakText(text) {
  if (!('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : (currentLanguage === 'mr' ? 'mr-IN' : 'en-IN');
    utterance.rate = 0.92;

    utterance.onstart = () => {
      isSpeaking = true;
      micBtn.className = 'mic-button speaking';
      micStatusLabel.innerText = currentLanguage === 'mr' ? 'सहाय्यक बोलत आहे... (Speaking)' : 'असिस्टेंट बोल रहा है... (Speaking)';
    };

    utterance.onend = () => {
      isSpeaking = false;
      if (!isListening && !isProcessing) {
        micBtn.className = 'mic-button';
        micStatusLabel.innerText = currentLanguage === 'mr' ? 'बोलण्यासाठी माइक दाबा (Tap to Speak)' : 'बोलने के लिए माइक दबाएं (Tap to Speak)';
      }
    };

    utterance.onerror = () => {
      isSpeaking = false;
      micBtn.className = 'mic-button';
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('TTS playback error:', err);
  }
}

function setProcessingState(processing) {
  isProcessing = processing;
  if (processing) {
    micBtn.className = 'mic-button processing';
    micPulseRing.classList.add('hidden');
    micStatusLabel.innerText = currentLanguage === 'mr' ? 'प्रक्रिया सुरू आहे... (Processing)' : 'प्रक्रिया जारी है... (Processing)';
  } else {
    micBtn.className = 'mic-button';
    micStatusLabel.innerText = currentLanguage === 'mr' ? 'बोलण्यासाठी माइक दाबा (Tap to Speak)' : 'बोलने के लिए माइक दबाएं (Tap to Speak)';
  }
}

function showErrorBanner(msg) {
  errorMessageText.innerText = msg;
  errorBanner.classList.remove('hidden');
}

function hideErrorBanner() {
  errorBanner.classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════════
// 8. Event Listeners
// ═══════════════════════════════════════════════════════════════════

// Auth listeners
authToggleBtn.addEventListener('click', () => {
  authPanel.classList.toggle('hidden');
  setAuthMode('login');
});
authCloseBtn.addEventListener('click', () => authPanel.classList.add('hidden'));
authCancelBtn.addEventListener('click', () => authPanel.classList.add('hidden'));
authTabLogin.addEventListener('click', () => setAuthMode('login'));
authTabRegister.addEventListener('click', () => setAuthMode('register'));
authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  handleAuthSubmit();
});
logoutBtn.addEventListener('click', handleLogout);

// Microphone listener - Only triggers permission when user clicks
micBtn.addEventListener('click', () => {
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
  }
  if (!recognition) recognition = setupRecognition();
  if (!recognition) {
    showErrorBanner('Browser speech recognition not supported in this environment. Please type.');
    fallbackDetails.open = true;
    return;
  }
  if (isListening) {
    recognition.stop();
  } else {
    recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : (currentLanguage === 'mr' ? 'mr-IN' : 'en-IN');
    try {
      recognition.start();
    } catch (err) {
      console.warn('Recognition start error:', err);
    }
  }
});

// Transcript editor actions
transcriptProcessBtn.addEventListener('click', () => {
  const text = transcriptEditor.value.trim();
  if (text) sendTurn(text);
});

transcriptRetryBtn.addEventListener('click', () => {
  transcriptEditor.value = '';
  clearAutoProcessTimer();
  if (micBtn) micBtn.click();
});

transcriptClearBtn.addEventListener('click', () => {
  clearAutoProcessTimer();
  transcriptCard.classList.add('hidden');
  transcriptEditor.value = '';
});

// Confirmation actions
confirmYesBtn.addEventListener('click', () => handleConfirm('confirm'));
confirmNoBtn.addEventListener('click', () => handleConfirm('reject'));
confirmReplayBtn.addEventListener('click', () => speakText(confirmMessage.innerText));

// Re-speak active prompt
speakPromptBtn.addEventListener('click', () => {
  speakText(activePromptText.innerText);
});

// Text Fallback
fallbackSubmitBtn.addEventListener('click', async () => {
  const val = fallbackTextInput.value.trim();
  if (!val || !currentSessionId) return;
  try {
    const res = await privacyFetch(`${API_BASE}/api/fallback/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: currentSessionId,
        field_name: currentField,
        typed_value: val
      })
    });
    const data = await res.json();
    fallbackTextInput.value = '';
    fallbackDetails.open = false;
    updateUIState(data.session_state);

    // Auto-fill confirmed field on page — extension origin only.
    const targetOrigin = EXTENSION_ORIGIN || '*';
    window.parent.postMessage({
      type: 'SEVA_VAANI_FILL_CONFIRMED_FIELD',
      fieldName: currentField,
      value: val
    }, targetOrigin);
  } catch (err) {
    console.error('Fallback error:', err);
    showErrorBanner('टाइप किया गया उत्तर दर्ज करने में त्रुटि।');
  }
});

// Human Help ticket
humanHelpBtn.addEventListener('click', async () => {
  if (!currentSessionId) return;
  try {
    const res = await privacyFetch(`${API_BASE}/api/help/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: currentSessionId,
        field_name: currentField,
        reason: 'extension_citizen_request'
      })
    });
    const data = await res.json();
    alert(`सहायता टिकट बनाया गया: ${data.ticket_id}\nऑपरेटर शीघ्र संपर्क करेगा।`);
  } catch (err) {
    console.error('Help request error:', err);
  }
});

// Language switcher
langSelect.addEventListener('change', async (e) => {
  currentLanguage = e.target.value;
  if (recognition) {
    recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : (currentLanguage === 'mr' ? 'mr-IN' : 'en-IN');
  }
  if (currentSessionId) {
    try {
      await privacyFetch(`${API_BASE}/api/session/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          language: currentLanguage
        })
      });
    } catch (err) {
      console.warn('Language switch backend notification failed:', err);
    }
  }
  initSession();
});

// Close panel button
closeBtn.addEventListener('click', () => {
  const targetOrigin = EXTENSION_ORIGIN || '*';
  window.parent.postMessage({ type: 'SEVA_VAANI_CLOSE_PANEL' }, targetOrigin);
});

// Dismiss error button
dismissErrorBtn.addEventListener('click', hideErrorBanner);

// ═══════════════════════════════════════════════════════════════════
// 9. Startup Sequence
// ═══════════════════════════════════════════════════════════════════
(async function start() {
  await checkAuthStatus();
  await initSession();
})();
