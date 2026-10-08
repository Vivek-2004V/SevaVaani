/**
 * SEVA VAANI — Frontend Orchestration Engine
 * SV-PRD-001 Multilingual Voice-Based Assistance
 */

const API_BASE = "";

const state = {
  session_id: null,
  service_id: "scholarship_app",
  language: "hi", // "hi" or "mr"
  current_field: null,
  current_prompt: "",
  confirmed_fields: {},
  candidate_field: null,
  active_field_definition: null,
  progress: { confirmed_count: 0, total_fields: 10, percentage: 0 },
  status: "welcome", // welcome | active | ready_for_review | completed
  is_listening: false,
  is_speaking: false,
  network_simulation_delay: 0, // ms
  help_ticket_id: null,
};

// UI Elements
let recognition = null;
let speechSynth = window.speechSynthesis;

// Translation dictionary for UI static text
const I18N = {
  hi: {
    serviceName: "राज्य पोस्ट-मैट्रिक छात्रवृत्ति योजना",
    brandTitle: "सेवा वाणी (SEVA VAANI)",
    brandSub: "डिजिटल सार्वजनिक सेवाओं के लिए बहुभाषी आवाज़ सहायक",
    welcomeTitle: "बोलकर आसानी से छात्रवृत्ति आवेदन भरें",
    welcomeSub: "कोई जटिल फ़ॉर्म नहीं, कोई टाइपिंग नहीं। अपनी भाषा में एक-एक सवाल का जवाब दें, पुष्टि करें और आवेदन पूरा करें।",
    startBtn: "आवेदन शुरू करें",
    micIdle: "बोलने के लिए माइक दबाएं",
    micListening: "सुन रहा हूँ... बोलिए",
    micProcessing: "समझ रहा हूँ...",
    confirmHeader: "कृपया पुष्टि करें",
    btnConfirmYes: "हाँ, सही है",
    btnConfirmNo: "नहीं, गलत है",
    btnTypeFallback: "लिखकर उत्तर दें (Text Fallback)",
    btnHumanHelp: "सहायता ऑपरेटर (Help)",
    consentLabel: "मैं प्रमाणित करता/करती हूँ कि इस छात्रवृत्ति आवेदन में दी गई सभी जानकारी पूर्ण और सत्य है।",
    btnSubmit: "अंतिम आवेदन जमा करें",
    completedBadge: "सफलतापूर्वक जमा किया गया",
    appIdLabel: "आवेदन क्रमांक (Application ID)",
    btnNewApp: "नया आवेदन शुरू करें",
    reviewTitle: "आवेदन समीक्षा (Review Summary)",
    stepLabel: "चरण"
  },
  mr: {
    serviceName: "राज्य पोस्ट-मॅट्रिक शिष्यवृत्ती योजना",
    brandTitle: "सेवा वाणी (SEVA VAANI)",
    brandSub: "डिजिटल सार्वजनिक सेवांसाठी बहुभाषिक आवाज सहाय्यक",
    welcomeTitle: "बोलून सहजपणे शिष्यवृत्ती अर्ज भरा",
    welcomeSub: "कोणताही क्लिष्ट फॉर्म नाही, टाइपिंग नाही. आपल्या मातृभाषेत एका वेळी एका प्रश्नाचे उत्तर द्या, पडताळणी करा आणि अर्ज पूर्ण करा.",
    startBtn: "अर्ज सुरू करा",
    micIdle: "बोलण्यासाठी माइक दाबा",
    micListening: "ऐकत आहे... बोला",
    micProcessing: "समजून घेत आहे...",
    confirmHeader: "कृपया पुष्टी करा",
    btnConfirmYes: "होय, बरोबर आहे",
    btnConfirmNo: "नाही, चूक आहे",
    btnTypeFallback: "टाईप करून उत्तर द्या (Text Fallback)",
    btnHumanHelp: "मदत ऑपरेटर (Help)",
    consentLabel: "मी प्रमाणित करतो/करते की या शिष्यवृत्ती अर्जात दिलेली सर्व माहिती खरी आणि अचूक आहे.",
    btnSubmit: "अंतिम अर्ज सादर करा",
    completedBadge: "यशस्वीरित्या सादर केला गेला",
    appIdLabel: "अर्ज क्रमांक (Application ID)",
    btnNewApp: "नवीन अर्ज सुरू करा",
    reviewTitle: "अर्ज पुनरावलोकन (Review Summary)",
    stepLabel: "पायरी"
  }
};

// Initialize Speech Recognition
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Web Speech API not supported in this browser. Fallback input available.");
    return null;
  }
  const recog = new SpeechRecognition();
  recog.continuous = false;
  recog.interimResults = false;
  recog.lang = state.language === "hi" ? "hi-IN" : "mr-IN";

  recog.onstart = () => {
    state.is_listening = true;
    updateMicVisualState();
  };

  recog.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("transcriptDisplay").innerText = `"${transcript}"`;
    sendVoiceTurn(transcript);
  };

  recog.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
    state.is_listening = false;
    updateMicVisualState();
    if (event.error === "no-speech") {
      showNotice("कोई आवाज़ नहीं सुनी गई। कृपया दोबारा माइक दबाएं।", "warning");
    }
  };

  recog.onend = () => {
    state.is_listening = false;
    updateMicVisualState();
  };

  return recog;
}

function speakText(text) {
  if (!speechSynth || !text) return;
  speechSynth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.language === "hi" ? "hi-IN" : "mr-IN";
  utterance.rate = 0.95;
  speechSynth.speak(utterance);
}

function updateMicVisualState() {
  const micBtn = document.getElementById("micButton");
  const micStatus = document.getElementById("micStatusText");
  const t = I18N[state.language];

  if (!micBtn) return;

  if (state.is_listening) {
    micBtn.classList.add("listening");
    micStatus.innerText = t.micListening;
  } else {
    micBtn.classList.remove("listening");
    micStatus.innerText = t.micIdle;
  }
}

// REST API Wrappers
async function apiCall(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  // Network simulation delay if enabled
  if (state.network_simulation_delay > 0) {
    await new Promise(r => setTimeout(r, state.network_simulation_delay));
  }

  const startTime = performance.now();
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const latency = Math.round(performance.now() - startTime);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Network error" }));
    throw new Error(err.detail || "Request failed");
  }
  const data = await res.json();
  data._client_latency_ms = latency;
  return data;
}

// Session Management
async function startNewSession(lang = state.language) {
  try {
    state.language = lang;
    const res = await apiCall("/api/session", "POST", {
      service_id: "scholarship_app",
      language: lang
    });
    applySessionState(res);
    speakText(res.current_prompt);
  } catch (e) {
    showNotice("सत्र शुरू करने में विफल: " + e.message, "danger");
  }
}

async function switchLanguage(lang) {
  if (state.language === lang) return;
  state.language = lang;
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  if (recognition) {
    recognition.lang = lang === "hi" ? "hi-IN" : "mr-IN";
  }

  if (state.session_id) {
    try {
      const res = await apiCall("/api/session/language", "POST", {
        session_id: state.session_id,
        language: lang
      });
      applySessionState(res);
      speakText(res.current_prompt);
    } catch (e) {
      console.error("Language switch error:", e);
    }
  } else {
    renderView();
  }
}

function applySessionState(sessionState) {
  state.session_id = sessionState.session_id;
  state.language = sessionState.language;
  state.current_field = sessionState.current_field;
  state.current_prompt = sessionState.current_prompt;
  state.confirmed_fields = sessionState.confirmed_fields || {};
  state.candidate_field = sessionState.candidate_field;
  state.active_field_definition = sessionState.active_field_definition;
  state.progress = sessionState.progress;
  state.status = sessionState.status;

  renderView();
}

// Voice interaction
function toggleMic() {
  if (!recognition) {
    recognition = initSpeechRecognition();
  }
  if (!recognition) {
    showNotice("इस ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है। कृपया नीचे दिए गए उदाहरण चिप्स या टेक्स्ट इनपुट का उपयोग करें।", "warning");
    return;
  }

  if (state.is_listening) {
    recognition.stop();
  } else {
    recognition.lang = state.language === "hi" ? "hi-IN" : "mr-IN";
    try {
      recognition.start();
    } catch (err) {
      console.warn("Recognition already started", err);
    }
  }
}

async function sendVoiceTurn(transcript) {
  document.getElementById("micStatusText").innerText = I18N[state.language].micProcessing;
  try {
    const res = await apiCall("/api/assist/turn", "POST", {
      session_id: state.session_id,
      transcript: transcript,
      input_type: "voice"
    });

    // Check action
    if (res.status === "need_confirmation") {
      state.candidate_field = {
        field_name: res.field_name,
        candidate_value: res.candidate_value,
        confidence: res.confidence
      };
      speakText(res.audio_text);
      renderConfirmationGate(res.candidate_value, res.message);
    } else if (res.status === "saved_next_field" || res.status === "ready_for_review") {
      applySessionState(res.session_state);
      speakText(res.audio_text);
    } else if (res.status === "retry") {
      showNotice(res.message, "warning");
      speakText(res.audio_text);
    } else if (res.status === "invalid") {
      showNotice(res.message, "danger");
      speakText(res.audio_text);
    } else if (res.status === "text_fallback") {
      showNotice(res.message, "warning");
      toggleTextFallback(true);
      speakText(res.audio_text);
    } else if (res.status === "human_help") {
      showNotice(res.message, "info");
      speakText(res.audio_text);
    }

    if (res.session_state) {
      applySessionState(res.session_state);
    }
  } catch (e) {
    showNotice("सर्वर त्रुटि: " + e.message, "danger");
  }
}

// Candidate Confirmation (FR-007, FR-008, TC03)
async function sendConfirmation(action) {
  if (!state.current_field) return;
  try {
    const res = await apiCall("/api/confirm", "POST", {
      session_id: state.session_id,
      field_name: state.current_field,
      action: action // "confirm" or "reject"
    });

    if (action === "confirm") {
      showNotice("मान सफलतापूर्वक पुष्टि और सहेजा गया।", "info");
    } else {
      showNotice("मान रद्द किया गया। कृपया दोबारा उत्तर दें।", "warning");
    }

    if (res.session_state) {
      applySessionState(res.session_state);
    }
    if (res.audio_text) {
      speakText(res.audio_text);
    }
  } catch (e) {
    showNotice("पुष्टि त्रुटि: " + e.message, "danger");
  }
}

// Text Fallback (FR-010)
async function submitTextFallback() {
  const inputEl = document.getElementById("fallbackTextInput");
  if (!inputEl) return;
  const val = inputEl.value.trim();
  if (!val) return;

  try {
    const res = await apiCall("/api/fallback/text", "POST", {
      session_id: state.session_id,
      field_name: state.current_field,
      typed_value: val
    });

    if (res.status === "invalid") {
      showNotice(res.message, "danger");
      speakText(res.audio_text);
    } else {
      showNotice("टेक्स्ट उत्तर स्वीकार किया गया।", "info");
      toggleTextFallback(false);
      if (res.session_state) {
        applySessionState(res.session_state);
      }
      if (res.audio_text) {
        speakText(res.audio_text);
      }
    }
  } catch (e) {
    showNotice("टेक्स्ट सबमिट त्रुटि: " + e.message, "danger");
  }
}

// Request Human Help (FR-011, TC09)
async function triggerHumanHelp() {
  try {
    const res = await apiCall("/api/help/request", "POST", {
      session_id: state.session_id,
      field_name: state.current_field,
      reason: "citizen_explicit_request"
    });
    state.help_ticket_id = res.ticket_id;
    showNotice(res.message, "info");
    speakText(res.audio_text);
  } catch (e) {
    showNotice("सहायता अनुरोध विफल: " + e.message, "danger");
  }
}

// Final Submission (FR-014, FR-015, TC12, TC13)
async function submitFinalApplication() {
  const consentBox = document.getElementById("consentCheckbox");
  const consent = consentBox ? consentBox.checked : false;

  if (!consent) {
    showNotice(
      state.language === "hi" 
        ? "कृपया पहले सहमति चेकबॉक्स पर टिक करें।" 
        : "कृपया आधी संमती चेकबॉक्सवर खूण करा.",
      "warning"
    );
    return;
  }

  try {
    const res = await apiCall("/api/submit", "POST", {
      session_id: state.session_id,
      consent: consent
    });

    if (res.status === "success") {
      state.application_id = res.application_id;
      state.submitted_at = res.submitted_at;
      state.status = "completed";
      renderView();
      speakText(res.audio_text);
    } else {
      showNotice(res.message, "danger");
    }
  } catch (e) {
    showNotice("सबमिशन त्रुटि: " + e.message, "danger");
  }
}

// UI Rendering Functions
function renderView() {
  const container = document.getElementById("viewContainer");
  const t = I18N[state.language];

  // Update header text
  document.getElementById("brandSubText").innerText = t.brandSub;
  document.getElementById("serviceBarTitle").innerText = t.serviceName;

  if (state.status === "welcome" || !state.session_id) {
    container.innerHTML = `
      <div class="welcome-card">
        <div class="welcome-hero-icon">🎙️</div>
        <h2 class="welcome-title">${t.welcomeTitle}</h2>
        <p class="welcome-subtitle">${t.welcomeSub}</p>

        <div class="service-intro-box">
          <h3>${t.serviceName}</h3>
          <p>${state.language === "hi" 
            ? "उच्च शिक्षा (इंजीनियरिंग, मेडिकल, डिग्री) प्राप्त कर रहे विद्यार्थियों के लिए छात्रवृत्ति। बोलकर अपना 10-फ़ील्ड आवेदन 2 मिनट में भरें।"
            : "उच्च शिक्षण घेणाऱ्या विद्यार्थ्यांसाठी शिष्यवृत्ती. बोलून आपला १०-माहितीचा अर्ज २ मिनिटांत पूर्ण करा."}</p>
        </div>

        <div class="welcome-features">
          <div class="feature-pill"><span>🇮🇳</span> ${state.language === "hi" ? "हिंदी एवं मराठी में स्वाभाविक आवाज़" : "मराठी आणि हिंदीत नैसर्गिक आवाज"}</div>
          <div class="feature-pill"><span>🛡️</span> ${state.language === "hi" ? "हर महत्वपूर्ण जानकारी की पुष्टि (Zero Guess)" : "प्रत्येक माहितीची पडताळणी"}</div>
          <div class="feature-pill"><span>✍️</span> ${state.language === "hi" ? "टेक्स्ट व ऑपरेटर बैकअप सुविधा" : "मजकूर व मदत ऑपरेटर पर्याय"}</div>
        </div>

        <button class="btn-primary" onclick="startNewSession('${state.language}')">
          <span>🚀</span> ${t.startBtn}
        </button>
      </div>
    `;
    updateProgressBar(0, 10);
    return;
  }

  if (state.status === "ready_for_review") {
    renderReviewView();
    updateProgressBar(10, 10);
    return;
  }

  if (state.status === "completed") {
    renderSuccessView();
    updateProgressBar(10, 10);
    return;
  }

  // Active Voice Form View
  renderActiveFormView();
}

function renderActiveFormView() {
  const container = document.getElementById("viewContainer");
  const t = I18N[state.language];
  const fieldDef = state.active_field_definition;
  const currentStep = state.progress.confirmed_count + 1;
  const totalSteps = state.progress.total_fields;

  updateProgressBar(state.progress.confirmed_count, totalSteps);

  container.innerHTML = `
    <div class="form-card">
      <div class="active-question-panel">
        <div class="question-step-badge">${t.stepLabel} ${currentStep} / ${totalSteps}: ${fieldDef ? fieldDef[`label_${state.language}`] : ''}</div>
        <div class="question-text">${state.current_prompt || ''}</div>
        <button class="speak-prompt-btn" onclick="speakText('${escapeQuotes(state.current_prompt)}')">
          <span>🔊</span> ${state.language === "hi" ? "सवाल दोबारा सुनें" : "प्रश्न पुन्हा ऐका"}
        </button>
      </div>

      <div id="confirmationGateContainer"></div>

      <div class="voice-action-area">
        <div class="mic-button-wrapper">
          <button id="micButton" class="mic-button" onclick="toggleMic()" title="Microphone">
            🎙️
          </button>
        </div>
        <div id="micStatusText" class="voice-status-text">${t.micIdle}</div>

        <div class="soundwave-visualizer">
          <div class="soundwave-bar"></div>
          <div class="soundwave-bar"></div>
          <div class="soundwave-bar"></div>
          <div class="soundwave-bar"></div>
          <div class="soundwave-bar"></div>
        </div>

        <div class="transcript-box">
          <div class="transcript-label">${state.language === "hi" ? "पहचाना गया स्वर (Live Transcript):" : "ओळखलेला आवाज (Live Transcript):"}</div>
          <div id="transcriptDisplay" class="transcript-content">...</div>
        </div>

        <!-- Quick Demo Utterance Chips for Judges/Testing -->
        <div class="demo-speech-chips">
          <div class="chip-label">⚡ ${state.language === "hi" ? "डेमो परीक्षण विकल्प (त्वरित क्लिक करें):" : "डेमो चाचणी पर्याय (क्लिक करा):"}</div>
          ${getSampleChipsHtml(fieldDef ? fieldDef.name : "")}
        </div>
      </div>

      <!-- Text Fallback Card (Hidden by default, shown on button click or repeated failure) -->
      <div id="textFallbackContainer" style="display:none;" class="text-fallback-card">
        <div style="font-weight:700; color:var(--accent-sky);">${t.btnTypeFallback}</div>
        <div class="text-fallback-input-row">
          <input type="text" id="fallbackTextInput" class="text-fallback-input" placeholder="${fieldDef ? fieldDef.example : 'उत्तर लिखें'}">
          <button class="btn-primary" style="padding:0.6rem 1.4rem; font-size:0.9rem;" onclick="submitTextFallback()">दर्ज करें</button>
        </div>
      </div>

      <div class="fallback-help-bar">
        <button class="btn-outline-text" onclick="toggleTextFallback()">
          <span>⌨️</span> ${t.btnTypeFallback}
        </button>
        <button class="btn-help-ticket" onclick="triggerHumanHelp()">
          <span>🆘</span> ${t.btnHumanHelp}
        </button>
      </div>

      <!-- Completed Fields Mini Grid -->
      <div>
        <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:0.4rem;">
          ${state.language === "hi" ? "स्वीकृत फ़ील्ड:" : "स्वीकारलेली माहिती:"}
        </div>
        <div class="completed-fields-grid">
          ${renderCompletedBadges()}
        </div>
      </div>
    </div>
  `;

  // If candidate is already awaiting confirmation
  if (state.candidate_field) {
    renderConfirmationGate(state.candidate_field.candidate_value);
  }
}

function renderConfirmationGate(candidateValue, customMessage) {
  const container = document.getElementById("confirmationGateContainer");
  if (!container) return;
  const t = I18N[state.language];

  container.innerHTML = `
    <div class="confirmation-gate-card">
      <div class="confirmation-header">
        <span>🛡️</span> ${t.confirmHeader} (Gate: Unconfirmed = 0)
      </div>
      <div class="candidate-value-highlight">
        ${candidateValue}
      </div>
      <div style="font-size:0.9rem; color:var(--text-sub);">
        ${customMessage || (state.language === "hi" ? "क्या यह जानकारी सही है?" : "ही माहिती बरोबर आहे का?")}
      </div>
      <div class="confirmation-buttons-row">
        <button class="btn-confirm-yes" onclick="sendConfirmation('confirm')">
          <span>✓</span> ${t.btnConfirmYes}
        </button>
        <button class="btn-confirm-no" onclick="sendConfirmation('reject')">
          <span>✕</span> ${t.btnConfirmNo}
        </button>
      </div>
    </div>
  `;
}

function renderReviewView() {
  const container = document.getElementById("viewContainer");
  const t = I18N[state.language];

  const rowsHtml = Object.entries(state.confirmed_fields).map(([k, v]) => `
    <tr>
      <td>${getFieldLabel(k)}</td>
      <td class="field-val">${v}</td>
      <td style="text-align:right;"><span style="color:var(--accent-emerald); font-weight:700;">✓ Verified</span></td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="review-card">
      <h2 style="font-size:1.5rem; font-weight:800; color:var(--primary-navy);">${t.reviewTitle}</h2>
      <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.25rem;">
        ${state.language === "hi" 
          ? "कृपया अंतिम रूप से जांचें कि आपकी सभी प्रविष्टियाँ सही हैं। इसके बाद आवेदन जमा किया जाएगा।"
          : "कृपया अंतिम तपशील तपासा. यानंतर अर्ज सादर केला जाईल."}
      </p>

      <table class="review-table">
        <thead>
          <tr>
            <th>${state.language === "hi" ? "फ़ील्ड विवरण" : "तपशील"}</th>
            <th>${state.language === "hi" ? "दर्ज किया गया मान" : "नोंदवलेले मूल्य"}</th>
            <th style="text-align:right;">स्थिति</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Mandatory Explicit Consent Gate (FR-014, TC12) -->
      <div class="consent-box">
        <input type="checkbox" id="consentCheckbox">
        <label for="consentCheckbox">
          <strong>${state.language === "hi" ? "स्पष्ट नागरिक सहमति:" : "स्पष्ट नागरिक संमती:"}</strong> ${t.consentLabel}
        </label>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:1rem;">
        <button class="btn-primary" onclick="submitFinalApplication()">
          <span>📤</span> ${t.btnSubmit}
        </button>
      </div>
    </div>
  `;
}

function renderSuccessView() {
  const container = document.getElementById("viewContainer");
  const t = I18N[state.language];

  container.innerHTML = `
    <div class="success-card">
      <div class="success-badge-icon">✓</div>
      <h2 style="font-size:1.8rem; font-weight:800; color:var(--primary-navy);">${t.completedBadge}</h2>
      <p style="color:var(--text-sub); margin-top:0.5rem;">
        ${state.language === "hi" 
          ? "आपका डिजिटल छात्रवृत्ति आवेदन राज्य कल्याण पोर्टल पर सुरक्षित रूप से प्रेषित कर दिया गया है।"
          : "आपला डिजिटल शिष्यवृत्ती अर्ज सुरक्षितपणे सादर केला गेला आहे."}
      </p>

      <div class="application-id-box">
        <div class="app-id-label">${t.appIdLabel}</div>
        <div class="app-id-value">${state.application_id}</div>
      </div>

      <div style="margin:2rem 0; display:flex; justify-content:center; gap:1rem; flex-wrap:wrap;">
        <button class="btn-primary" onclick="window.print()">
          <span>🖨️</span> ${state.language === "hi" ? "पावती प्रिंट / डाउनलोड करें" : "पावती प्रिंट करा"}
        </button>
        <button class="btn-outline-text" onclick="startNewSession('${state.language}')">
          <span>🔄</span> ${t.btnNewApp}
        </button>
      </div>
    </div>
  `;
}

function renderCompletedBadges() {
  const entries = Object.entries(state.confirmed_fields);
  if (entries.length === 0) {
    return `<div style="color:var(--text-muted); font-size:0.8rem; font-style:italic;">अभी कोई फ़ील्ड पूर्ण नहीं हुआ है</div>`;
  }
  return entries.map(([k, v]) => `
    <div class="completed-field-item">
      <div class="completed-field-label">${getFieldLabel(k)}</div>
      <div class="completed-field-val">✓ ${v}</div>
    </div>
  `).join("");
}

function getFieldLabel(fieldName) {
  const labels = {
    full_name: state.language === "hi" ? "पूरा नाम" : "पूर्ण नाव",
    dob: state.language === "hi" ? "जन्म तिथि" : "जन्मतारीख",
    mobile: state.language === "hi" ? "मोबाइल नंबर" : "मोबाईल नंबर",
    college: state.language === "hi" ? "कॉलेज" : "महाविद्यालय",
    course: state.language === "hi" ? "कोर्स" : "अभ्यासक्रम",
    academic_year: state.language === "hi" ? "शैक्षणिक वर्ष" : "शैक्षणिक वर्ष",
    annual_income: state.language === "hi" ? "वार्षिक आय" : "वार्षिक उत्पन्न",
    category: state.language === "hi" ? "सामाजिक श्रेणी" : "सामाजिक प्रवर्ग",
    district: state.language === "hi" ? "जिला" : "जिल्हा",
    document_status: state.language === "hi" ? "दस्तावेज़" : "कागदपत्र स्थिती",
  };
  return labels[fieldName] || fieldName;
}

function getSampleChipsHtml(fieldName) {
  const isHi = state.language === "hi";
  let chips = [];

  if (fieldName === "full_name") {
    chips = isHi
      ? ["मेरा नाम रमेश कुमार है", "रमेश कुमार", "अस्पष्ट ध्वनि [unclear]"]
      : ["माझं नाव राहुल देशमुख आहे", "राहुल देशमुख", "अस्पष्ट आवाज"];
  } else if (fieldName === "dob") {
    chips = isHi
      ? ["14/08/2004", "चौदह अगस्त दो हज़ार चार", "25/12/2003"]
      : ["14/08/2004", "चौदा ऑगस्ट दोन हजार चार", "10/05/2002"];
  } else if (fieldName === "mobile") {
    chips = isHi
      ? ["9876543210", "987654321 (अमान्य 9 अंक)", "नौ आठ सात छह पांच चार तीन दो एक शून्य"]
      : ["9876543210", "987654321 (अवैध ९ अंक)", "9822012345"];
  } else if (fieldName === "college") {
    chips = isHi
      ? ["PIEMR", "गवर्नमेंट कॉलेज", "आईआईटी बॉम्बे"]
      : ["PIEMR", "सीओईपी पुणे", "मुंबई विद्यापीठ"];
  } else if (fieldName === "course") {
    chips = isHi
      ? ["B.Tech CSE", "बीटेक कंप्यूटर साइंस", "बी.कॉम"]
      : ["B.Tech CSE", "बी.एस्सी", "एम.बी.ए"];
  } else if (fieldName === "academic_year") {
    chips = isHi
      ? ["चौथा वर्ष", "4", "पहला", "दूसरा"]
      : ["चौथे वर्ष", "4", "पहिले वर्ष", "दुसरे वर्ष"];
  } else if (fieldName === "annual_income") {
    chips = isHi
      ? ["एक लाख अस्सी हज़ार", "180000", "दो लाख पचास हज़ार"]
      : ["एक लाख ऐंशी हजार", "180000", "दोन लाख पन्नास हजार"];
  } else if (fieldName === "category") {
    chips = isHi
      ? ["OBC", "ओबीसी", "SC", "General", "अमान्य (VIP श्रेणी)"]
      : ["OBC", "ओबीसी", "SC", "General", "इतर"];
  } else if (fieldName === "district") {
    chips = isHi
      ? ["Indore", "इंदौर", "भोपाल", "पुणे"]
      : ["पुणे", "नागपूर", "नाशिक", "मुंबई"];
  } else if (fieldName === "document_status") {
    chips = isHi
      ? ["उपलब्ध (Available)", "लंबित (Pending)", "हाँ सभी प्रमाण पत्र हैं"]
      : ["उपलब्ध (Available)", "प्रलंबित (Pending)", "सर्व कागदपत्रे आहेत"];
  }

  return chips.map(c => `
    <button class="speech-chip" onclick="simulateSpeech('${escapeQuotes(c)}')">${c}</button>
  `).join("");
}

function simulateSpeech(text) {
  // Strip annotations in parentheses if testing raw transcript
  const rawText = text.replace(/\(.*?\)/g, "").trim();
  document.getElementById("transcriptDisplay").innerText = `"${rawText}"`;
  sendVoiceTurn(rawText);
}

function toggleTextFallback(forceShow = null) {
  const drawer = document.getElementById("textFallbackContainer");
  if (!drawer) return;
  const isHidden = drawer.style.display === "none";
  drawer.style.display = (forceShow !== null ? forceShow : isHidden) ? "flex" : "none";
}

function updateProgressBar(confirmedCount, totalSteps) {
  const fill = document.getElementById("progressFill");
  const label = document.getElementById("progressLabel");
  const pct = Math.round((confirmedCount / totalSteps) * 100);
  if (fill) fill.style.width = `${pct}%`;
  if (label) label.innerText = `${confirmedCount} / ${totalSteps} (${pct}%)`;
}

function showNotice(msg, type = "info") {
  const banner = document.getElementById("alertBanner");
  if (!banner) return;
  banner.className = `alert-banner ${type}`;
  banner.style.display = "flex";
  banner.innerHTML = `<span>ℹ️</span> <div>${msg}</div>`;
  setTimeout(() => {
    banner.style.display = "none";
  }, 6000);
}

function escapeQuotes(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// -------------------------------------------------------------
// JUDGE / EVALUATION DASHBOARD & AUTOMATED TEST RUNNER
// -------------------------------------------------------------
async function openJudgeModal() {
  const modal = document.getElementById("judgeModalOverlay");
  modal.style.display = "flex";
  refreshJudgeMetrics();
}

function closeJudgeModal() {
  document.getElementById("judgeModalOverlay").style.display = "none";
}

async function refreshJudgeMetrics() {
  try {
    const metrics = await apiCall("/api/metrics");
    document.getElementById("metricTotalSessions").innerText = metrics.total_sessions;
    document.getElementById("metricCompletionRate").innerText = `${metrics.completion_rate_pct}%`;
    document.getElementById("metricTotalTurns").innerText = metrics.total_turns;
    document.getElementById("metricAvgRetries").innerText = metrics.avg_retries_per_session;
    document.getElementById("metricMedianLatency").innerText = `${metrics.median_latency_ms} ms`;
    document.getElementById("metricUnconfirmed").innerText = `${metrics.unconfirmed_critical_submitted} (Zero Rule)`;
    document.getElementById("metricExtractionAcc").innerText = `${metrics.field_extraction_accuracy_pct}%`;
    document.getElementById("metricValidationAcc").innerText = `${metrics.validation_accuracy_pct}%`;
  } catch (e) {
    console.error("Metrics load error:", e);
  }
}

function toggleNetworkThrottling() {
  const chk = document.getElementById("throttleNetworkCheckbox");
  state.network_simulation_delay = chk && chk.checked ? 800 : 0;
  showNotice(
    state.network_simulation_delay > 0 
      ? "धीमी नेटवर्क सिमुलेशन चालू (800ms विलंब)" 
      : "सामान्य नेटवर्क गति बहाल", 
    "info"
  );
}

// Automated 15 Test Case Runner inside Judge Modal
async function runAutomatedTestCases() {
  const resultsTable = document.getElementById("testResultsBody");
  resultsTable.innerHTML = `<tr><td colspan="4" style="text-align:center;">परीक्षण चल रहे हैं (15 Test Cases Executing)...</td></tr>`;

  const cases = [
    { id: "TC01", test: "Hindi name extraction + confirmation", expected: "Extract + Confirm", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      const t = await apiCall("/api/assist/turn", "POST", { session_id: s.session_id, transcript: "Mera naam Ramesh Kumar hai" });
      const c = await apiCall("/api/confirm", "POST", { session_id: s.session_id, field_name: "full_name", action: "confirm" });
      return c.session_state.confirmed_fields.full_name === "Ramesh Kumar";
    }},
    { id: "TC02", test: "Marathi name extraction + confirmation", expected: "Extract + Confirm", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "mr" });
      const t = await apiCall("/api/assist/turn", "POST", { session_id: s.session_id, transcript: "माझं नाव राहुल देशमुख आहे" });
      const c = await apiCall("/api/confirm", "POST", { session_id: s.session_id, field_name: "full_name", action: "confirm" });
      return c.session_state.confirmed_fields.full_name.includes("राहुल देशमुख");
    }},
    { id: "TC03", test: "User says No (Negative confirmation)", expected: "Candidate discarded", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      await apiCall("/api/assist/turn", "POST", { session_id: s.session_id, transcript: "Ramesh" });
      const rej = await apiCall("/api/confirm", "POST", { session_id: s.session_id, field_name: "full_name", action: "reject" });
      return rej.status === "candidate_discarded" && !rej.session_state.confirmed_fields.full_name;
    }},
    { id: "TC04", test: "9-digit phone validation", expected: "Rejected", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      await apiCall("/api/fallback/text", "POST", { session_id: s.session_id, field_name: "full_name", typed_value: "Ramesh" });
      await apiCall("/api/fallback/text", "POST", { session_id: s.session_id, field_name: "dob", typed_value: "14/08/2004" });
      const t = await apiCall("/api/assist/turn", "POST", { session_id: s.session_id, transcript: "987654321" });
      return t.status === "invalid" || t.status === "retry";
    }},
    { id: "TC05", test: "10-digit phone accepted", expected: "Accepted after confirm", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      await apiCall("/api/fallback/text", "POST", { session_id: s.session_id, field_name: "full_name", typed_value: "Ramesh" });
      await apiCall("/api/fallback/text", "POST", { session_id: s.session_id, field_name: "dob", typed_value: "14/08/2004" });
      const t = await apiCall("/api/assist/turn", "POST", { session_id: s.session_id, transcript: "9876543210" });
      const c = await apiCall("/api/confirm", "POST", { session_id: s.session_id, field_name: "mobile", action: "confirm" });
      return c.session_state.confirmed_fields.mobile === "9876543210";
    }},
    { id: "TC06", test: "Natural-language income normalization", expected: "180000 (Numeric)", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      // Fast forward to income
      for (let f of ["full_name","dob","mobile","college","course","academic_year"]) {
        await apiCall("/api/fallback/text", "POST", { session_id: s.session_id, field_name: f, typed_value: "test" });
      }
      const t = await apiCall("/api/assist/turn", "POST", { session_id: s.session_id, transcript: "Mere ghar ki saal ki income lagbhag ek lakh assi hazaar hai" });
      return t.candidate_value === 180000;
    }},
    { id: "TC07", test: "Unclear speech prompt", expected: "Retry requested", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      const t = await apiCall("/api/assist/turn", "POST", { session_id: s.session_id, transcript: "[unclear]" });
      return t.status === "retry";
    }},
    { id: "TC08", test: "Repeated failure (2 attempts)", expected: "Text fallback offered", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      await apiCall("/api/assist/turn", "POST", { session_id: s.session_id, transcript: "[unclear]" });
      const t2 = await apiCall("/api/assist/turn", "POST", { session_id: s.session_id, transcript: "[unclear]" });
      return t2.status === "text_fallback";
    }},
    { id: "TC09", test: "Human help request", expected: "Ticket ID generated", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      const t = await apiCall("/api/help/request", "POST", { session_id: s.session_id, field_name: "full_name" });
      return t.ticket_id && t.ticket_id.startsWith("TKT-");
    }},
    { id: "TC10", test: "Language switch", expected: "Confirmed state preserved", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      await apiCall("/api/fallback/text", "POST", { session_id: s.session_id, field_name: "full_name", typed_value: "Ramesh" });
      const sw = await apiCall("/api/session/language", "POST", { session_id: s.session_id, language: "mr" });
      return sw.language === "mr" && sw.confirmed_fields.full_name === "Ramesh";
    }},
    { id: "TC11", test: "Final review display", expected: "All fields visible", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      const fields = [
        ["full_name","Ramesh"], ["dob","14/08/2004"], ["mobile","9876543210"],
        ["college","PIEMR"], ["course","B.Tech CSE"], ["academic_year","4"],
        ["annual_income","180000"], ["category","OBC"], ["district","Indore"],
        ["document_status","Available"]
      ];
      for (let [k,v] of fields) {
        await apiCall("/api/fallback/text", "POST", { session_id: s.session_id, field_name: k, typed_value: v });
      }
      const st = await apiCall(`/api/session/${s.session_id}`);
      return st.status === "ready_for_review" && Object.keys(st.confirmed_fields).length === 10;
    }},
    { id: "TC12", test: "No consent submission", expected: "Submission blocked", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      const res = await apiCall("/api/submit", "POST", { session_id: s.session_id, consent: false });
      return res.status === "blocked";
    }},
    { id: "TC13", test: "Consent submission", expected: "Application ID generated", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      const fields = [
        ["full_name","Ramesh"], ["dob","14/08/2004"], ["mobile","9876543210"],
        ["college","PIEMR"], ["course","B.Tech CSE"], ["academic_year","4"],
        ["annual_income","180000"], ["category","OBC"], ["district","Indore"],
        ["document_status","Available"]
      ];
      for (let [k,v] of fields) {
        await apiCall("/api/fallback/text", "POST", { session_id: s.session_id, field_name: k, typed_value: v });
      }
      const res = await apiCall("/api/submit", "POST", { session_id: s.session_id, consent: true });
      return res.status === "success" && res.application_id.startsWith("SV-SCH-2026-");
    }},
    { id: "TC14", test: "Network recovery state preservation", expected: "State preserved in DB", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      await apiCall("/api/fallback/text", "POST", { session_id: s.session_id, field_name: "full_name", typed_value: "Ramesh" });
      const st = await apiCall(`/api/session/${s.session_id}`);
      return st.confirmed_fields.full_name === "Ramesh";
    }},
    { id: "TC15", test: "Invalid category input", expected: "Re-prompt with allowed values", fn: async () => {
      const s = await apiCall("/api/session", "POST", { language: "hi" });
      const res = await apiCall("/api/fallback/text", "POST", { session_id: s.session_id, field_name: "category", typed_value: "VIP_CATEGORY" });
      return res.status === "invalid" && res.message.includes("SC, ST, OBC");
    }}
  ];

  let rows = "";
  for (let c of cases) {
    try {
      const passed = await c.fn();
      rows += `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>${c.test}</td>
          <td>${c.expected}</td>
          <td><span style="color:${passed ? '#0b9e58' : '#dc2626'}; font-weight:700;">${passed ? '✓ PASSED' : '✕ FAILED'}</span></td>
        </tr>
      `;
    } catch (e) {
      rows += `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>${c.test}</td>
          <td>${c.expected}</td>
          <td><span style="color:#dc2626; font-weight:700;">✕ ERROR: ${e.message}</span></td>
        </tr>
      `;
    }
  }

  resultsTable.innerHTML = rows;
  refreshJudgeMetrics();
}

// Initial Bootstrap on page load
window.addEventListener("DOMContentLoaded", () => {
  renderView();
});
