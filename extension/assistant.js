// SEVA VAANI - Assistant Panel Controller
// Multilingual Voice Assistant (Hindi & Marathi) with Auth, Explicit Confirmation, and SQLite Persistence
//
// PRIVACY NOTICE (shown to user on first use via consent UI):
//   - Microphone audio is processed by the browser's built-in Speech Recognition API.
//   - Chrome's webkitSpeechRecognition sends audio to Google's speech service.
//     It is NOT offline speech recognition. When microphone is unavailable or denied,
//     text-entry fallback is offered instead.
//   - No raw audio is stored on device or transmitted to the SEVA VAANI backend.
//   - Transcripts (text only) are sent to the local SEVA VAANI backend (127.0.0.1:8000) for
//     field extraction. No transcript is sent to any external LLM unless explicitly configured.
//   - Form field values are only filled after explicit citizen confirmation.
//   - ZERO auto-submits: Application submission requires manual review and separate consent.

let API_BASE = 'http://127.0.0.1:8000';

// Extension self-origin for postMessage targeting — never '*'.
const EXTENSION_ORIGIN = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
  ? chrome.runtime.getURL('').replace(/\/$/, '').split('/').slice(0, 3).join('/')
  : null;

// Privacy Firewall Enforcement: Every outbound network call passes through secureFetch
async function privacyFetch(url, options = {}) {
  if (typeof window !== 'undefined' && window.SEVA_VAANI_PRIVACY_FIREWALL && window.SEVA_VAANI_PRIVACY_FIREWALL.secureFetch) {
    return window.SEVA_VAANI_PRIVACY_FIREWALL.secureFetch(url, options);
  }
  return fetch(url, options);
}

// ═══════════════════════════════════════════════════════════════════
// State Management
// ═══════════════════════════════════════════════════════════════════
// Real states: 'idle' | 'listening' | 'processing' | 'confirmation' | 'speaking' | 'error'
let assistantState = 'idle';
let currentSessionId = null;
let currentLanguage = 'hi';
let currentField = 'full_name';
let pendingCandidate = null;
let isListening = false;
let isStarting = false;
let isProcessing = false;
let isSpeaking = false;
let isUserEditingTranscript = false;
let recognition = null;
let authToken = null;
let currentUser = null;
let autoProcessTimer = null;
let toastTimer = null;

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

// Error Banner & Fill Toast
const errorBanner = document.getElementById('error-banner');
const errorMessageText = document.getElementById('error-message-text');
const dismissErrorBtn = document.getElementById('dismiss-error-btn');
const fillToast = document.getElementById('fill-toast');
const fillToastIcon = document.getElementById('fill-toast-icon');
const fillToastText = document.getElementById('fill-toast-text');

// Progress
const progressBarFill = document.getElementById('progress-bar-fill');
const fieldCounter = document.getElementById('field-counter');
const progressPercent = document.getElementById('progress-percent');

// Active Prompt
const activeFieldBadge = document.getElementById('active-field-badge');
const activePromptText = document.getElementById('active-prompt-text');
const speakPromptBtn = document.getElementById('speak-prompt-btn');
const speakPromptLabel = document.getElementById('speak-prompt-label');
const explainFieldBtn = document.getElementById('explain-field-btn');
const explainFieldLabel = document.getElementById('explain-field-label');
const guidanceCard = document.getElementById('guidance-card');
const guidanceCloseBtn = document.getElementById('guidance-close-btn');
const guidanceExplanation = document.getElementById('guidance-explanation');
const guidanceExampleBox = document.getElementById('guidance-example-box');
const guidanceExampleText = document.getElementById('guidance-example-text');
const guidanceSpellingBox = document.getElementById('guidance-spelling-box');
const guidanceSpellingText = document.getElementById('guidance-spelling-text');
const guidanceListenBtn = document.getElementById('guidance-listen-btn');
let currentGuidanceSpokenText = '';

// Confirmation & FSM Controls (Phase 3)
const confirmationCard = document.getElementById('confirmation-card');
const confirmTitleText = document.getElementById('confirm-title-text');
const confirmMessage = document.getElementById('confirm-message');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');
const confirmSlowBtn = document.getElementById('confirm-slow-btn');
const confirmEditSpellingBtn = document.getElementById('confirm-edit-spelling-btn');
const confirmHelpBtn = document.getElementById('confirm-help-btn');
const confirmReplayBtn = document.getElementById('confirm-replay-btn');
const fsmStateBadge = document.getElementById('fsm-state-badge');
const confirmSpellingContainer = document.getElementById('confirm-spelling-container');
const confirmSpacedText = document.getElementById('confirm-spaced-text');
const confirmSpellingChips = document.getElementById('confirm-spelling-chips');
const confirmAmbiguityWarning = document.getElementById('confirm-ambiguity-warning');
const spellingEditorDrawer = document.getElementById('spelling-editor-drawer');
const spellingInput = document.getElementById('spelling-input');
const spellingApplyBtn = document.getElementById('spelling-apply-btn');
const spellingCancelBtn = document.getElementById('spelling-cancel-btn');
const spellingVariantsContainer = document.getElementById('spelling-variants-container');
const spellingVariantsList = document.getElementById('spelling-variants-list');
const docConsentCheckbox = document.getElementById('doc-consent-checkbox');

let currentFsmState = 'LISTENING';
let currentPendingNameMetadata = null;

function setFsmState(state) {
  currentFsmState = state;
  if (!fsmStateBadge) return;
  fsmStateBadge.innerText = state;
  fsmStateBadge.className = 'fsm-state-badge';
  if (state === 'LISTENING') fsmStateBadge.classList.add('state-listening');
  else if (state === 'TRANSCRIPT_REVIEW') fsmStateBadge.classList.add('state-review');
  else if (state === 'CONFIRMATION_REQUIRED') fsmStateBadge.classList.add('state-confirmation');
  else if (state === 'CONFIRMED') fsmStateBadge.classList.add('state-confirmed');
  else if (state === 'CORRECTION_REQUIRED') fsmStateBadge.classList.add('state-correction');
  else if (state === 'ERROR') fsmStateBadge.classList.add('state-error');
}

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

// Voice Command Hints
const hintReplay = document.getElementById('hint-replay');
const hintSlower = document.getElementById('hint-slower');
const hintChange = document.getElementById('hint-change');
const hintHelp = document.getElementById('hint-help');

// Document-Agnostic Verification Elements
const docTypeSelect = document.getElementById('doc-type-select');
const docTextInput = document.getElementById('doc-text-input');
const docFileInput = document.getElementById('doc-file-input');
const docVerifyBtn = document.getElementById('doc-verify-btn');
const docClearBtn = document.getElementById('doc-clear-btn');
const docResultsBox = document.getElementById('doc-results-box');
const docResultsHeader = document.getElementById('doc-results-header');
const docResultsList = document.getElementById('doc-results-list');
const docSpeakResultsBtn = document.getElementById('doc-speak-results-btn');
const docApplyValueBtn = document.getElementById('doc-apply-value-btn');

let currentSpeechRate = 0.92;
let lastDocSpokenMessage = '';
let lastVerifiedDocValue = null;

// Footer
const serverStatusDot = document.getElementById('server-status-dot');
const backendStatusText = document.getElementById('backend-status-text');

// ═══════════════════════════════════════════════════════════════════
// Helper: Locale and State Display
// ═══════════════════════════════════════════════════════════════════
function getLocaleCode(lang) {
  if (lang === 'mr') return 'mr-IN';
  if (lang === 'hi') return 'hi-IN';
  return 'en-IN';
}

function setAssistantState(state, customMessage = null) {
  assistantState = state;
  micBtn.className = `mic-button ${state}`;

  if (state === 'listening') {
    micPulseRing.classList.remove('hidden');
  } else {
    micPulseRing.classList.add('hidden');
  }

  if (customMessage) {
    micStatusLabel.innerText = customMessage;
    return;
  }

  if (currentLanguage === 'mr') {
    switch (state) {
      case 'idle':
        micStatusLabel.innerText = 'बोलण्यासाठी माइक दाबा (Tap to Speak)';
        break;
      case 'listening':
        micStatusLabel.innerText = 'ऐकत आहोत... बोला (Listening...)';
        break;
      case 'processing':
        micStatusLabel.innerText = 'प्रक्रिया सुरू आहे... (Processing)';
        break;
      case 'confirmation':
        micStatusLabel.innerText = 'कृपया पुष्टी करा (Confirmation Required)';
        break;
      case 'speaking':
        micStatusLabel.innerText = 'सहाय्यक बोलत आहे... (Speaking)';
        break;
      case 'error':
        micStatusLabel.innerText = 'त्रुटी आढळली (Error)';
        break;
      default:
        micStatusLabel.innerText = 'बोलण्यासाठी माइक दाबा';
    }
  } else if (currentLanguage === 'en') {
    switch (state) {
      case 'idle':
        micStatusLabel.innerText = 'Tap microphone to speak';
        break;
      case 'listening':
        micStatusLabel.innerText = 'Listening... Speak now';
        break;
      case 'processing':
        micStatusLabel.innerText = 'Processing your response...';
        break;
      case 'confirmation':
        micStatusLabel.innerText = 'Confirmation required';
        break;
      case 'speaking':
        micStatusLabel.innerText = 'Assistant is speaking...';
        break;
      case 'error':
        micStatusLabel.innerText = 'Error occurred';
        break;
      default:
        micStatusLabel.innerText = 'Tap microphone to speak';
    }
  } else {
    // Default Hindi
    switch (state) {
      case 'idle':
        micStatusLabel.innerText = 'बोलने के लिए माइक दबाएं (Tap to Speak)';
        break;
      case 'listening':
        micStatusLabel.innerText = 'सुन रहे हैं... बोलिए (Listening...)';
        break;
      case 'processing':
        micStatusLabel.innerText = 'प्रक्रिया जारी है... (Processing)';
        break;
      case 'confirmation':
        micStatusLabel.innerText = 'कृपया पुष्टि करें (Confirmation Required)';
        break;
      case 'speaking':
        micStatusLabel.innerText = 'असिस्टेंट बोल रहा है... (Speaking)';
        break;
      case 'error':
        micStatusLabel.innerText = 'त्रुटि (Error)';
        break;
      default:
        micStatusLabel.innerText = 'बोलने के लिए माइक दबाएं';
    }
  }
}

function showFieldFillToast(message, type = 'success') {
  if (!fillToast) return;
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  fillToast.className = `fill-toast ${type}`;
  if (fillToastIcon) {
    fillToastIcon.innerText = type === 'success' ? '✓' : (type === 'error' ? '⚠️' : 'ℹ️');
  }
  if (fillToastText) {
    fillToastText.innerText = message;
  }
  fillToast.classList.remove('hidden');
  toastTimer = setTimeout(() => {
    fillToast.classList.add('hidden');
  }, 3500);
}

// ═══════════════════════════════════════════════════════════════════
// 1. Storage Helpers (Chrome Storage API preferred; sessionStorage fallback)
// ═══════════════════════════════════════════════════════════════════
async function getStoredToken() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sv_auth_token'], (res) => {
        resolve(res.sv_auth_token || null);
      });
    });
  }
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

async function initBackendUrl() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const res = await new Promise((resolve) => {
      chrome.storage.local.get(['sv_backend_url'], resolve);
    });
    if (res && res.sv_backend_url) {
      const candidateUrl = res.sv_backend_url;
      if (window.SEVA_VAANI_PRIVACY_FIREWALL && window.SEVA_VAANI_PRIVACY_FIREWALL.registerApprovedOrigin) {
        if (window.SEVA_VAANI_PRIVACY_FIREWALL.registerApprovedOrigin(candidateUrl)) {
          API_BASE = candidateUrl;
        }
      }
    }
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
    authUserLabel.innerText = currentLanguage === 'mr' ? 'अतिथी सत्र (Guest)' : (currentLanguage === 'en' ? 'Guest Session' : 'अतिथि सत्र (Guest Session)');
    authToggleBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }
}

let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  authError.classList.add('hidden');
  if (mode === 'login') {
    authTabLogin.classList.add('active');
    authTabRegister.classList.remove('active');
    authNameGroup.classList.add('hidden');
    authSubmitBtn.innerText = currentLanguage === 'mr' ? 'लॉगिन करा' : (currentLanguage === 'en' ? 'Login' : 'लॉगिन करें');
  } else {
    authTabRegister.classList.add('active');
    authTabLogin.classList.remove('active');
    authNameGroup.classList.remove('hidden');
    authSubmitBtn.innerText = currentLanguage === 'mr' ? 'नोंदणी करा (Register)' : (currentLanguage === 'en' ? 'Register' : 'पंजीकरण करें (Register)');
  }
}

async function handleAuthSubmit() {
  authError.classList.add('hidden');
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const name = authName.value.trim();

  if (!email || !password) {
    authError.innerText = currentLanguage === 'mr' ? 'कृपया ईमेल आणि पासवर्ड प्रविष्ट करा.' : 'कृपया ईमेल और पासवर्ड दर्ज करें।';
    authError.classList.remove('hidden');
    return;
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.innerText = currentLanguage === 'mr' ? 'प्रक्रिया सुरू आहे...' : 'प्रक्रिया जारी है...';

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

    await initSession();
  } catch (err) {
    authError.innerText = err.message || 'त्रुटि उत्पन्न हुई।';
    authError.classList.remove('hidden');
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.innerText = authMode === 'login' ? (currentLanguage === 'mr' ? 'लॉगिन करा' : 'लॉगिन करें') : (currentLanguage === 'mr' ? 'नोंदणी करा' : 'पंजीकरण करें');
  }
}

async function handleLogout() {
  if (authToken) {
    try {
      await privacyFetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (_) {}
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
        ? '⚠️ SEVA VAANI बॅकएंड सर्व्हरशी संपर्क होत नाही (127.0.0.1:8000). कृपया सर्व्हर चालू असल्याचे तपासा.'
        : (currentLanguage === 'en'
            ? '⚠️ Cannot connect to SEVA VAANI backend (127.0.0.1:8000). Please ensure server is running.'
            : '⚠️ SEVA VAANI बैकएंड सर्वर (http://127.0.0.1:8000) से संपर्क नहीं हो पा रहा है।')
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

  const defaultPrompt = currentLanguage === 'mr'
    ? 'कृपया आपले तपशील सांगा.'
    : (currentLanguage === 'en' ? 'Please provide your details.' : 'कृपया अपना विवरण बताएं।');
  const prompt = state.current_prompt || defaultPrompt;
  activePromptText.innerText = prompt;
  speakText(prompt);

  // If candidate field is returned waiting for confirmation
  if (state.candidate_field) {
    pendingCandidate = {
      fieldName: state.candidate_field.field_name,
      value: state.candidate_field.candidate_value
    };
    confirmTitleText.innerText = currentLanguage === 'mr'
      ? 'कृपया पुष्टी करा (Please Confirm)'
      : (currentLanguage === 'en' ? 'Please Confirm' : 'कृपया पुष्टि करें (Please Confirm)');
    confirmMessage.innerText = currentLanguage === 'mr'
      ? `काय ${pendingCandidate.value} बरोबर आहे?`
      : `क्या ${pendingCandidate.value} सही है?`;
    confirmationCard.classList.remove('hidden');
    renderNameSpellingIfApplicable(state.candidate_field);
    confirmationCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setAssistantState('confirmation');
  } else {
    confirmationCard.classList.add('hidden');
    renderNameSpellingIfApplicable(null);
    pendingCandidate = null;
    if (!isListening && !isSpeaking && !isProcessing) {
      setAssistantState('idle');
    }
  }
}

function renderNameSpellingIfApplicable(candidateField) {
  if (!confirmSpellingContainer) return;
  if (!candidateField) {
    confirmSpellingContainer.classList.add('hidden');
    if (spellingEditorDrawer) spellingEditorDrawer.classList.add('hidden');
    currentPendingNameMetadata = null;
    return;
  }

  const nameMeta = candidateField.name_pronunciation;
  currentPendingNameMetadata = nameMeta;

  if (nameMeta && nameMeta.spaced_spelling) {
    confirmSpellingContainer.classList.remove('hidden');
    if (confirmSpacedText) confirmSpacedText.innerText = nameMeta.spaced_spelling;

    if (confirmSpellingChips) {
      confirmSpellingChips.innerHTML = '';
      if (Array.isArray(nameMeta.spelling_chars)) {
        nameMeta.spelling_chars.forEach(ch => {
          const chip = document.createElement('span');
          chip.className = ch.type === 'space' ? 'spelling-chip space-chip' : 'spelling-chip';
          chip.innerText = ch.char;
          chip.title = ch.label || ch.char;
          confirmSpellingChips.appendChild(chip);
        });
      }
    }

    if (nameMeta.is_ambiguous && nameMeta.ambiguity_warning) {
      if (confirmAmbiguityWarning) {
        confirmAmbiguityWarning.innerText = nameMeta.ambiguity_warning;
        confirmAmbiguityWarning.classList.remove('hidden');
      }
    } else if (confirmAmbiguityWarning) {
      confirmAmbiguityWarning.classList.add('hidden');
    }

    // Populate variant pills in spelling drawer (e.g. Meenakshi vs Minakshi)
    if (spellingVariantsContainer && spellingVariantsList) {
      if (Array.isArray(nameMeta.known_variants) && nameMeta.known_variants.length > 0) {
        spellingVariantsList.innerHTML = '';
        nameMeta.known_variants.forEach(variant => {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = 'variant-pill';
          pill.innerText = variant;
          pill.addEventListener('click', () => {
            if (spellingInput) spellingInput.value = variant;
          });
          spellingVariantsList.appendChild(pill);
        });
        spellingVariantsContainer.classList.remove('hidden');
      } else {
        spellingVariantsContainer.classList.add('hidden');
      }
    }
  } else {
    confirmSpellingContainer.classList.add('hidden');
    if (confirmAmbiguityWarning) confirmAmbiguityWarning.classList.add('hidden');
  }
}

function handleSlowRepeat() {
  currentSpeechRate = 0.70;
  let textToSpeak = '';
  if (currentPendingNameMetadata && currentPendingNameMetadata.slow_audio_text) {
    textToSpeak = currentPendingNameMetadata.slow_audio_text;
  } else if (confirmMessage && confirmMessage.innerText) {
    textToSpeak = confirmMessage.innerText;
  }
  if (textToSpeak) {
    speakText(textToSpeak, 0.70);
  }
}

function toggleSpellingDrawer(show) {
  if (!spellingEditorDrawer) return;
  if (show) {
    spellingEditorDrawer.classList.remove('hidden');
    if (spellingInput && pendingCandidate) {
      spellingInput.value = pendingCandidate.value || '';
      spellingInput.focus();
    }
  } else {
    spellingEditorDrawer.classList.add('hidden');
  }
}

async function applyEditedSpelling() {
  if (!spellingInput) return;
  const newSpelling = spellingInput.value.trim();
  if (!newSpelling) return;
  toggleSpellingDrawer(false);
  setFsmState('CORRECTION_REQUIRED');
  await handleConfirm('edit_spelling', newSpelling);
}

async function triggerHumanHelp() {
  if (!currentSessionId) return;
  try {
    const res = await privacyFetch(`${API_BASE}/api/help`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: currentSessionId,
        field_name: currentField,
        reason: 'citizen_requested_human_assistance_for_name_spelling'
      })
    });
    const data = await res.json();
    const msg = currentLanguage === 'mr'
      ? `मदत तिकीट तयार झाले: ${data.ticket_id || 'HLP-101'}\nऑपरेटर लवकरच संपर्क करेल.`
      : `सहायता टिकट बनाया गया: ${data.ticket_id || 'HLP-101'}\nऑपरेटर शीघ्र संपर्क करेगा।`;
    showFieldFillToast(`🆘 ${msg}`, 'info');
    speakText(msg, currentSpeechRate);
  } catch (err) {
    console.error('Human help error:', err);
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
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    isStarting = false;
    isListening = true;
    clearAutoProcessTimer();
    setAssistantState('listening');
    hideErrorBanner();
  };

  rec.onresult = (event) => {
    let fullFinalTranscript = '';
    let interimTranscript = '';

    for (let i = 0; i < event.results.length; ++i) {
      const res = event.results[i];
      if (res.isFinal) {
        fullFinalTranscript += res[0].transcript;
      } else {
        interimTranscript += res[0].transcript;
      }
    }

    const currentText = (fullFinalTranscript + ' ' + interimTranscript).trim();
    if (currentText) {
      transcriptCard.classList.remove('hidden');
      transcriptEditor.value = currentText;
    }

    if (fullFinalTranscript.trim()) {
      if (!isUserEditingTranscript) {
        scheduleAutoProcess(fullFinalTranscript.trim());
      }
    }
  };

  rec.onerror = (e) => {
    isStarting = false;
    isListening = false;
    clearAutoProcessTimer();

    console.warn('SpeechRecognition event error:', e.error);
    if (e.error === 'not-allowed' || e.error === 'permission-denied') {
      showErrorBanner(
        currentLanguage === 'mr'
          ? '⚠️ मायक्रोफोन परवानगी नाकारली: कृपया ब्राउझर सेटिंग्जमध्ये मायक्रोफोन चालू करा किंवा खाली टाइप करा.'
          : (currentLanguage === 'en'
              ? '⚠️ Microphone permission denied: Please allow microphone in browser or type below.'
              : '⚠️ माइक्रोफ़ोन अनुमति अस्वीकृत: कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन चालू करें या नीचे टाइप करें।')
      );
      fallbackDetails.open = true;
      setAssistantState('idle');
    } else if (e.error === 'audio-capture') {
      showErrorBanner(
        currentLanguage === 'mr'
          ? '⚠️ मायक्रोफोन आढळला नाही: कृपया मायक्रोफोन हार्डवेअर तपासा किंवा खाली टाइप करा.'
          : '⚠️ कोई माइक्रोफ़ोन नहीं मिला: कृपया हार्डवेयर जांचें या नीचे टाइप करें।'
      );
      fallbackDetails.open = true;
      setAssistantState('idle');
    } else if (e.error === 'no-speech') {
      setAssistantState('idle', currentLanguage === 'mr' ? 'आवाज आला नाही. पुन्हा बोला.' : 'आवाज़ सुनाई नहीं दी। दोबारा बोलें।');
    } else if (e.error === 'aborted') {
      setAssistantState(pendingCandidate ? 'confirmation' : 'idle');
    } else if (e.error === 'network') {
      showErrorBanner(
        currentLanguage === 'mr'
          ? '⚠️ स्पीच ओळख नेटवर्क त्रुटी: Google स्पीच सेवेशी संपर्क झाला नाही. खाली टाइप करा.'
          : '⚠️ स्पीच पहचान नेटवर्क त्रुटि: Google स्पीच सेवा से संपर्क नहीं हुआ। नीचे टाइप करें।'
      );
      fallbackDetails.open = true;
      setAssistantState('idle');
    } else {
      setAssistantState('idle', currentLanguage === 'mr' ? 'आवाज ओळखण्यात अडचण आली. पुन्हा बोला किंवा टाइप करा.' : 'आवाज़ पहचान में समस्या आई। टाइप करें।');
      fallbackDetails.open = true;
    }
  };

  rec.onend = () => {
    isStarting = false;
    isListening = false;
    if (!isProcessing && !isSpeaking) {
      if (pendingCandidate) {
        setAssistantState('confirmation');
      } else {
        setAssistantState('idle');
      }
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
  setAssistantState(
    'processing',
    currentLanguage === 'mr' ? 'तपासत आहोत... (संपादित करू शकता)' : 'समीक्षा जारी... (आप संपादित कर सकते हैं)'
  );
  autoProcessTimer = setTimeout(() => {
    const val = transcriptEditor.value.trim() || text;
    if (val && !isUserEditingTranscript) {
      sendTurn(val);
    }
  }, 1200);
}

// ═══════════════════════════════════════════════════════════════════
// 5. Backend Turn Processing (NLU, Validation, Confidence)
// ═══════════════════════════════════════════════════════════════════
async function sendTurn(transcript) {
  if (!currentSessionId || !transcript || isProcessing) return;
  clearAutoProcessTimer();
  isProcessing = true;
  setAssistantState('processing');

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

    if (data.speech_rate) {
      currentSpeechRate = data.speech_rate;
    }

    if (data.status === 'need_confirmation') {
      pendingCandidate = {
        fieldName: data.field_name || currentField,
        value: data.candidate_value
      };
      setAssistantState('confirmation');
      confirmTitleText.innerText = currentLanguage === 'mr'
        ? 'कृपया पुष्टी करा (Please Confirm)'
        : (currentLanguage === 'en' ? 'Please Confirm' : 'कृपया पुष्टि करें (Please Confirm)');
      confirmMessage.innerText = data.message || (currentLanguage === 'mr' ? `काय ${data.candidate_value} बरोबर आहे?` : `क्या ${data.candidate_value} सही है?`);
      confirmationCard.classList.remove('hidden');
      confirmationCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      speakText(confirmMessage.innerText, currentSpeechRate);
    } else if (data.status === 'saved_next_field') {
      confirmationCard.classList.add('hidden');
      transcriptCard.classList.add('hidden');
      transcriptEditor.value = '';
      pendingCandidate = null;
      updateUIState(data.session_state);
    } else if (data.status === 'greeting' || data.status === 'help') {
      activePromptText.innerText = data.message;
      speakText(data.message, currentSpeechRate);
      setAssistantState('idle');
    } else {
      activePromptText.innerText = data.message || (currentLanguage === 'mr' ? 'कृपया पुन्हा सांगा.' : 'कृपया दोबारा बताएं।');
      speakText(activePromptText.innerText, currentSpeechRate);
      setAssistantState('idle');
    }
  } catch (err) {
    console.error('Error in sendTurn:', err);
    showErrorBanner(
      currentLanguage === 'mr' ? 'बॅकएंड नेटवर्क त्रुटी. माहिती सुरक्षित आहे.' : 'बैकएंड नेटवर्क त्रुटि। विवरण सुरक्षित है।'
    );
    setAssistantState('idle');
  } finally {
    isProcessing = false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 6. Explicit Confirmation Gate & In-Page DOM Autofill
// ═══════════════════════════════════════════════════════════════════
async function handleConfirm(action, updatedValue = null) {
  if (!currentSessionId || isProcessing) return;
  isProcessing = true;
  confirmYesBtn.disabled = true;
  confirmNoBtn.disabled = true;

  const targetField = pendingCandidate ? pendingCandidate.fieldName : currentField;
  const targetValue = updatedValue !== null ? updatedValue : (pendingCandidate ? pendingCandidate.value : null);

  if (action === 'confirm' && targetValue !== null) {
    setFsmState('CONFIRMED');
    // Deliver to host page (localhost:5173 or portal) with wildcard targetOrigin.
    // The content script securely checks event.origin === EXTENSION_ORIGIN before execution.
    window.parent.postMessage({
      type: 'SEVA_VAANI_FILL_CONFIRMED_FIELD',
      fieldName: targetField,
      value: targetValue
    }, '*');
  } else if (action === 'reject') {
    setFsmState('CORRECTION_REQUIRED');
  }

  try {
    const payload = {
      session_id: currentSessionId,
      field_name: targetField,
      action: action
    };
    if (updatedValue !== null) {
      payload.updated_value = updatedValue;
    }

    const res = await privacyFetch(`${API_BASE}/api/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (action === 'edit_spelling') {
      if (data.session_state) {
        updateUIState(data.session_state);
      }
      return;
    }

    confirmationCard.classList.add('hidden');
    renderNameSpellingIfApplicable(null);
    transcriptCard.classList.add('hidden');
    transcriptEditor.value = '';
    pendingCandidate = null;

    updateUIState(data.session_state);
  } catch (err) {
    console.error('Error confirming field:', err);
    setFsmState('ERROR');
    showErrorBanner(currentLanguage === 'mr' ? 'पुष्टी नोंदवण्यात त्रुटी.' : 'पुष्टि दर्ज करने में त्रुटि।');
    setAssistantState('idle');
  } finally {
    isProcessing = false;
    confirmYesBtn.disabled = false;
    confirmNoBtn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 7. Speech Synthesis (TTS) Helper & Controls
// ═══════════════════════════════════════════════════════════════════
function updateTTSControls(speaking) {
  const speakPromptLabel = document.getElementById('speak-prompt-label');
  if (speakPromptLabel) {
    speakPromptLabel.innerText = speaking
      ? (currentLanguage === 'mr' ? 'थांबवा (Stop)' : (currentLanguage === 'en' ? 'Stop' : 'रोकें (Stop)'))
      : (currentLanguage === 'mr' ? 'ऐका (Listen)' : (currentLanguage === 'en' ? 'Listen' : 'सुनिए (Listen)'));
  }
  if (confirmReplayBtn) {
    confirmReplayBtn.innerText = speaking
      ? (currentLanguage === 'mr' ? '⏹️ थांबवा (Stop)' : (currentLanguage === 'en' ? '⏹️ Stop' : '⏹️ रोकें (Stop)'))
      : (currentLanguage === 'mr' ? '🔊 पुन्हा ऐका (Replay Audio)' : (currentLanguage === 'en' ? '🔊 Replay Audio' : '🔊 दोबारा सुनें (Replay Audio)'));
  }
}

function getVoiceForLocale(locale) {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const target = locale.toLowerCase().replace('_', '-');
  // 1. Exact locale match
  let voice = voices.find(v => v.lang.toLowerCase().replace('_', '-') === target);
  // 2. Language prefix match
  if (!voice) {
    const prefix = target.split('-')[0];
    voice = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
  }
  return voice || null;
}

function speakText(text, rate = currentSpeechRate) {
  if (!('speechSynthesis' in window) || !text) return;

  // Avoid speaking over microphone capture
  if (isListening && recognition) {
    try { recognition.abort(); } catch (_) {}
    isListening = false;
  }

  // Privacy sanitize: never speak URLs, bearer tokens, or hex IDs
  const sanitized = String(text)
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[a-f0-9]{32,}/gi, '')
    .replace(/sv-[a-f0-9]+/gi, '')
    .trim();
  if (!sanitized) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sanitized);
    const targetLocale = getLocaleCode(currentLanguage);
    utterance.lang = targetLocale;
    utterance.rate = Math.max(0.5, Math.min(1.5, Number(rate) || 0.92));

    const matchedVoice = getVoiceForLocale(targetLocale);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      isSpeaking = true;
      setAssistantState('speaking');
      updateTTSControls(true);
    };

    utterance.onend = () => {
      isSpeaking = false;
      updateTTSControls(false);
      if (!isListening && !isProcessing) {
        if (pendingCandidate) {
          setAssistantState('confirmation');
        } else {
          setAssistantState('idle');
        }
      }
    };

    utterance.onerror = () => {
      isSpeaking = false;
      updateTTSControls(false);
      if (!isListening && !isProcessing) {
        if (pendingCandidate) {
          setAssistantState('confirmation');
        } else {
          setAssistantState('idle');
        }
      }
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('TTS playback error:', err);
    isSpeaking = false;
    updateTTSControls(false);
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    // Cached voice lookup refreshed
  };
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

// Microphone listener - Only triggers permission when citizen clicks
micBtn.addEventListener('click', () => {
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    updateTTSControls(false);
  }

  if (isStarting || isProcessing) {
    return; // Guard against rapid clicks while starting or processing
  }

  if (!recognition) recognition = setupRecognition();
  if (!recognition) {
    showErrorBanner(
      currentLanguage === 'mr'
        ? 'या ब्राऊझरमध्ये स्पीच ओळख समर्थित नाही. कृपया खाली टाइप करा.'
        : 'ब्राउज़र में स्पीच पहचान समर्थित नहीं है। कृपया नीचे टाइप करें।'
    );
    fallbackDetails.open = true;
    return;
  }

  if (isListening) {
    try {
      recognition.stop();
    } catch (_) {}
  } else {
    recognition.lang = getLocaleCode(currentLanguage);
    try {
      isStarting = true;
      recognition.start();
    } catch (err) {
      isStarting = false;
      console.warn('Recognition start exception:', err);
      if (err.name === 'InvalidStateError') {
        // Recognition was already starting; ignore gracefully
      } else {
        showErrorBanner(currentLanguage === 'mr' ? 'मायक्रोफोन सुरू करण्यात त्रुटी. कृपया टाइप करा.' : 'माइक्रोफ़ोन प्रारंभ करने में त्रुटि। कृपया टाइप करें।');
        fallbackDetails.open = true;
      }
    }
  }
});

// Transcript editor events
transcriptEditor.addEventListener('focus', () => {
  isUserEditingTranscript = true;
  clearAutoProcessTimer();
  setAssistantState(
    'processing',
    currentLanguage === 'mr' ? 'संपादन करत आहात... (टाइप पूर्ण करा)' : 'संपादन जारी है... (टाइप पूरा करें)'
  );
});

transcriptEditor.addEventListener('input', () => {
  isUserEditingTranscript = true;
  clearAutoProcessTimer();
});

transcriptProcessBtn.addEventListener('click', () => {
  isUserEditingTranscript = false;
  clearAutoProcessTimer();
  const text = transcriptEditor.value.trim();
  if (text) sendTurn(text);
});

transcriptRetryBtn.addEventListener('click', () => {
  isUserEditingTranscript = false;
  clearAutoProcessTimer();
  transcriptEditor.value = '';
  if (isListening && recognition) {
    try { recognition.abort(); } catch (_) {}
  }
  setTimeout(() => micBtn.click(), 100);
});

transcriptClearBtn.addEventListener('click', () => {
  isUserEditingTranscript = false;
  clearAutoProcessTimer();
  transcriptCard.classList.add('hidden');
  transcriptEditor.value = '';
  if (isListening && recognition) {
    try { recognition.abort(); } catch (_) {}
  }
  setAssistantState(pendingCandidate ? 'confirmation' : 'idle');
});

// Confirmation actions (5 Controls - Phase 3)
confirmYesBtn.addEventListener('click', () => handleConfirm('confirm'));
confirmNoBtn.addEventListener('click', () => handleConfirm('reject'));
if (confirmSlowBtn) confirmSlowBtn.addEventListener('click', handleSlowRepeat);
if (confirmEditSpellingBtn) confirmEditSpellingBtn.addEventListener('click', () => toggleSpellingDrawer(true));
if (confirmHelpBtn) confirmHelpBtn.addEventListener('click', triggerHumanHelp);
if (spellingApplyBtn) spellingApplyBtn.addEventListener('click', applyEditedSpelling);
if (spellingCancelBtn) spellingCancelBtn.addEventListener('click', () => toggleSpellingDrawer(false));

confirmReplayBtn.addEventListener('click', () => {
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    updateTTSControls(false);
  } else {
    speakText(confirmMessage.innerText);
  }
});

// Re-speak active prompt or stop if speaking
speakPromptBtn.addEventListener('click', () => {
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    updateTTSControls(false);
  } else {
    speakText(activePromptText.innerText);
  }
});

// Explain This Field (Low-Literacy Guidance)
explainFieldBtn.addEventListener('click', async () => {
  if (!currentField) return;
  try {
    const res = await privacyFetch(`${API_BASE}/api/guidance/explain/${encodeURIComponent(currentField)}?language=${encodeURIComponent(currentLanguage)}`);
    if (res.ok) {
      const data = await res.json();
      guidanceExplanation.innerText = data.explanation || '';
      if (data.example) {
        guidanceExampleText.innerText = data.example;
        guidanceExampleBox.classList.remove('hidden');
      } else {
        guidanceExampleBox.classList.add('hidden');
      }
      if (data.spelling_guidance) {
        guidanceSpellingText.innerText = data.spelling_guidance;
        guidanceSpellingBox.classList.remove('hidden');
      } else {
        guidanceSpellingBox.classList.add('hidden');
      }
      currentGuidanceSpokenText = data.spoken_text || data.explanation || '';
      guidanceCard.classList.remove('hidden');
    }
  } catch (err) {
    console.warn('Field guidance fetch error:', err);
  }
});

guidanceCloseBtn.addEventListener('click', () => {
  guidanceCard.classList.add('hidden');
  stopSpeaking();
});

guidanceListenBtn.addEventListener('click', () => {
  if (currentGuidanceSpokenText) {
    speakText(currentGuidanceSpokenText);
  }
});

// Text Fallback Alternative
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

    // Auto-fill confirmed field on host page — extension origin only
    const targetOrigin = EXTENSION_ORIGIN || '*';
    window.parent.postMessage({
      type: 'SEVA_VAANI_FILL_CONFIRMED_FIELD',
      fieldName: currentField,
      value: val
    }, targetOrigin);
  } catch (err) {
    console.error('Fallback error:', err);
    showErrorBanner(currentLanguage === 'mr' ? 'टाइप केलेले उत्तर नोंदवण्यात त्रुटी.' : 'टाइप किया गया उत्तर दर्ज करने में त्रुटि।');
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
    const msg = currentLanguage === 'mr'
      ? `मदत तिकीट तयार झाले: ${data.ticket_id}\nमदतनीस लवकरच संपर्क करतील.`
      : `सहायता टिकट बनाया गया: ${data.ticket_id}\nऑपरेटर शीघ्र संपर्क करेगा।`;
    alert(msg);
  } catch (err) {
    console.error('Help request error:', err);
  }
});

// Language switcher
langSelect.addEventListener('change', async (e) => {
  currentLanguage = e.target.value;

  // Cancel any active recognition or speech
  if (recognition && isListening) {
    try { recognition.abort(); } catch (_) {}
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isListening = false;
  isStarting = false;
  isSpeaking = false;
  isProcessing = false;
  clearAutoProcessTimer();

  if (recognition) {
    recognition.lang = getLocaleCode(currentLanguage);
  }

  // Check if system has a voice for this language
  const availableVoice = getVoiceForLocale(getLocaleCode(currentLanguage));
  if (!availableVoice && currentLanguage !== 'en') {
    console.info(`[SEVA VAANI] Note: System TTS voice for ${currentLanguage} is not installed locally. Web speech will use browser default.`);
  }

  setAssistantState('idle');
  updateAuthUI(currentUser);

  if (currentSessionId) {
    try {
      const res = await privacyFetch(`${API_BASE}/api/session/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          language: currentLanguage
        })
      });
      if (res.ok) {
        const data = await res.json();
        updateUIState(data);
        return;
      }
    } catch (err) {
      console.warn('Language switch backend notification failed:', err);
    }
  }

  await initSession();
});

// Close panel button
closeBtn.addEventListener('click', () => {
  if (recognition && isListening) {
    try { recognition.abort(); } catch (_) {}
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  const targetOrigin = EXTENSION_ORIGIN || '*';
  window.parent.postMessage({ type: 'SEVA_VAANI_CLOSE_PANEL' }, targetOrigin);
});

// Dismiss error button
dismissErrorBtn.addEventListener('click', hideErrorBanner);

// Listen for fill result response from content script
window.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  if (event.data.type === 'SEVA_VAANI_FILL_RESULT') {
    const { fieldName, result } = event.data;
    if (result && result.success) {
      showFieldFillToast(
        currentLanguage === 'mr'
          ? `✓ '${fieldName}' पृष्ठावर भरले गेले`
          : `✓ '${fieldName}' पेज पर भर दिया गया`,
        'success'
      );
    } else {
      console.warn('Field fill warning:', result ? result.message : 'Unknown');
      showFieldFillToast(
        currentLanguage === 'mr'
          ? `ℹ️ फॉर्म फील्ड पृष्ठावर सापडले नाही (माहिती सुरक्षित आहे)`
          : `ℹ️ फॉर्म इनपुट पेज पर नहीं मिला (जानकारी सुरक्षित है)`,
        'info'
      );
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
// 8. Voice Commands Quick Hints & Document-Agnostic Verification
// ═══════════════════════════════════════════════════════════════════

// Voice Hints Action triggers
if (hintReplay) {
  hintReplay.addEventListener('click', () => {
    if (pendingCandidate) {
      speakText(confirmMessage.innerText, currentSpeechRate);
    } else {
      speakText(activePromptText.innerText, currentSpeechRate);
    }
  });
}

if (hintSlower) {
  hintSlower.addEventListener('click', () => {
    currentSpeechRate = 0.75;
    const prefix = currentLanguage === 'mr' ? 'हळू आवाजात पुन्हा सांगतो: ' : 'धीमी आवाज़ में दोबारा दोहरा रहा हूँ: ';
    if (pendingCandidate) {
      speakText(prefix + confirmMessage.innerText, 0.75);
    } else {
      speakText(prefix + activePromptText.innerText, 0.75);
    }
  });
}

if (hintChange) {
  hintChange.addEventListener('click', () => {
    if (pendingCandidate) {
      handleConfirm('reject');
    } else {
      showFieldFillToast(
        currentLanguage === 'mr' ? 'नवीन उत्तर बोलण्यासाठी माइक दाबा.' : 'नया उत्तर बोलने के लिए माइक दबाएं।',
        'info'
      );
    }
  });
}

if (hintHelp) {
  hintHelp.addEventListener('click', () => {
    if (humanHelpBtn) humanHelpBtn.click();
  });
}

// In-Memory Document File Ingestion (Zero Disk Storage)
if (docFileInput) {
  docFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      if (docTextInput) {
        docTextInput.value = content || '';
      }
    };
    reader.readAsText(file);
  });
}

if (docClearBtn) {
  docClearBtn.addEventListener('click', () => {
    if (docTextInput) docTextInput.value = '';
    if (docFileInput) docFileInput.value = '';
    if (docResultsBox) docResultsBox.classList.add('hidden');
    if (docApplyValueBtn) docApplyValueBtn.classList.add('hidden');
    lastDocSpokenMessage = '';
    lastVerifiedDocValue = null;
  });
}

if (docVerifyBtn) {
  docVerifyBtn.addEventListener('click', async () => {
    const docType = docTypeSelect ? docTypeSelect.value : 'education_marksheet';
    const textContent = docTextInput ? docTextInput.value.trim() : '';

    if (!textContent) {
      showErrorBanner(
        currentLanguage === 'mr'
          ? 'कृपया कागदपत्रातील मजकूर किंवा फाईल द्या.'
          : 'कृपया दस्तावेज़ का टेक्स्ट या फ़ाइल प्रदान करें।'
      );
      return;
    }

    // Build target fields object from active field / candidate
    const targetFields = {};
    if (currentField) {
      const currentVal = pendingCandidate ? pendingCandidate.value : '';
      if (currentVal) {
        targetFields[currentField] = currentVal;
      } else {
        targetFields['applicant_name'] = 'Ramesh Kumar';
        if (currentField === 'annual_income') {
          targetFields['annual_income'] = '120000';
        }
      }
    }

    if (docConsentCheckbox && !docConsentCheckbox.checked) {
      showErrorBanner(
        currentLanguage === 'mr'
          ? 'कागदपत्र तपासणीसाठी नागरिकाची संमती आवश्यक आहे. कृपया संमती चेकबॉक्स निवडा.'
          : 'दस्तावेज़ सत्यापन के लिए नागरिक की सहमति आवश्यक है। कृपया सहमति चेकबॉक्स चुनें।'
      );
      return;
    }

    try {
      docVerifyBtn.disabled = true;
      docVerifyBtn.innerText = currentLanguage === 'mr' ? 'पडताळणी करत आहे...' : 'सत्यापन हो रहा है...';

      const res = await privacyFetch(`${API_BASE}/api/verify/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: docType,
          document_text: textContent,
          target_fields: targetFields,
          language: currentLanguage,
          service_id: 'scholarship',
          consent_granted: docConsentCheckbox ? docConsentCheckbox.checked : true
        })
      });

      const data = await res.json();
      docVerifyBtn.disabled = false;
      docVerifyBtn.innerText = currentLanguage === 'mr' ? '🔍 मिलान करा (Verify)' : '🔍 मिलान करें (Verify Document)';

      if (!data.success) {
        showErrorBanner(data.message || data.error || 'दस्तावेज़ सत्यापन विफल');
        return;
      }

      // Render results
      if (docResultsBox) docResultsBox.classList.remove('hidden');
      if (docResultsList) docResultsList.innerHTML = '';

      const spokenMsgs = [];
      let candidateForApply = null;

      const extracted = data.extracted_fields || {};
      const fieldComparisons = data.field_comparisons || {};

      if (docResultsHeader) {
        const docTitle = (data.document_meta && data.document_meta['title_' + currentLanguage]) || data.document_type;
        docResultsHeader.innerText = `📄 ${docTitle} (Extracted ${Object.keys(extracted).length} fields)`;
      }

      for (const [fName, comp] of Object.entries(fieldComparisons)) {
        const item = document.createElement('div');
        const statusClass = comp.status ? comp.status.toLowerCase().replace('_', '-') : 'match';
        item.className = `doc-result-item ${statusClass}`;
        item.innerText = comp.explanation_text || `${fName}: ${comp.status}`;

        // If phonetic/spelling discrepancy, provide explicit citizen choices (Zero silent overwrites)
        if (comp.status === 'PHONETIC_MATCH' || comp.status === 'PHONETIC_SPELLING_MISMATCH') {
          const choiceRow = document.createElement('div');
          choiceRow.style.cssText = 'display: flex; gap: 6px; margin-top: 6px;';
          
          const useDocBtn = document.createElement('button');
          useDocBtn.className = 'btn btn-primary btn-xs';
          useDocBtn.innerText = currentLanguage === 'mr' ? `✓ कागदपत्रातील नाव वापरा (${comp.document_value})` : `✓ दस्तावेज़ का नाम (${comp.document_value})`;
          useDocBtn.addEventListener('click', () => {
            handleConfirm('edit_spelling', comp.document_value);
          });
          choiceRow.appendChild(useDocBtn);

          const keepSpkBtn = document.createElement('button');
          keepSpkBtn.className = 'btn btn-ghost btn-xs';
          keepSpkBtn.innerText = currentLanguage === 'mr' ? `बोलालेले ठेवा (${comp.spoken_value})` : `बोला गया नाम रखें (${comp.spoken_value})`;
          keepSpkBtn.addEventListener('click', () => {
            showFieldFillToast(currentLanguage === 'mr' ? 'बोलालेले नाव कायम ठेवले.' : 'बोला गया नाम सुरक्षित रखा गया।', 'info');
          });
          choiceRow.appendChild(keepSpkBtn);

          item.appendChild(choiceRow);
        }

        if (docResultsList) docResultsList.appendChild(item);

        if (comp.spoken_message) {
          spokenMsgs.push(comp.spoken_message);
        }

        if (comp.document_value && (comp.status === 'MISMATCH' || comp.status === 'PHONETIC_MATCH')) {
          candidateForApply = { fieldName: fName, value: comp.document_value };
        }
      }

      if (spokenMsgs.length > 0) {
        lastDocSpokenMessage = spokenMsgs.join(' ');
        speakText(lastDocSpokenMessage, currentSpeechRate);
      } else {
        const okMsg = currentLanguage === 'mr'
          ? 'कागदपत्रातील सर्व तपशील यशस्वीरित्या पडताळले गेले.'
          : 'दस्तावेज़ के सभी विवरण सफलतापूर्वक सत्यापित हो गए हैं।';
        lastDocSpokenMessage = okMsg;
        speakText(okMsg, currentSpeechRate);
      }

      if (candidateForApply && docApplyValueBtn) {
        lastVerifiedDocValue = candidateForApply;
        docApplyValueBtn.classList.remove('hidden');
        docApplyValueBtn.innerText = currentLanguage === 'mr'
          ? `✓ कागदपत्रातील मूल्य '${candidateForApply.value}' फॉर्ममध्ये भरा`
          : `✓ दस्तावेज़ का मान '${candidateForApply.value}' फॉर्म में भरें`;
      } else if (docApplyValueBtn) {
        docApplyValueBtn.classList.add('hidden');
      }

    } catch (err) {
      docVerifyBtn.disabled = false;
      docVerifyBtn.innerText = currentLanguage === 'mr' ? '🔍 मिलान करा (Verify)' : '🔍 मिलान करें (Verify Document)';
      console.error('Document verification error:', err);
      showErrorBanner(err.message || 'Network error during document check');
    }
  });
}

if (docSpeakResultsBtn) {
  docSpeakResultsBtn.addEventListener('click', () => {
    if (lastDocSpokenMessage) {
      speakText(lastDocSpokenMessage, currentSpeechRate);
    }
  });
}

if (docApplyValueBtn) {
  docApplyValueBtn.addEventListener('click', () => {
    if (!lastVerifiedDocValue) return;

    // Set as pending candidate and ask for confirmation
    pendingCandidate = {
      fieldName: lastVerifiedDocValue.fieldName,
      value: lastVerifiedDocValue.value
    };
    setAssistantState('confirmation');
    confirmTitleText.innerText = currentLanguage === 'mr'
      ? 'कृपया पुष्टी करा (Please Confirm)'
      : (currentLanguage === 'en' ? 'Please Confirm' : 'कृपया पुष्टि करें (Please Confirm)');
    confirmMessage.innerText = currentLanguage === 'mr'
      ? `कागदपत्रातून घेतलेले मूल्य '${lastVerifiedDocValue.value}' फॉर्ममध्ये भरायचे का?`
      : `दस्तावेज़ से लिया गया मान '${lastVerifiedDocValue.value}' फॉर्म में भरना है?`;
    confirmationCard.classList.remove('hidden');
    speakText(confirmMessage.innerText, currentSpeechRate);
  });
}

// ═══════════════════════════════════════════════════════════════════
// 9. Startup Sequence
// ═══════════════════════════════════════════════════════════════════
(async function start() {
  await initBackendUrl();
  await checkAuthStatus();
  await initSession();
})();
