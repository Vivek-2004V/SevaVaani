# SEVA VAANI (सेवा वाणी) — Final Hackathon Technical Submission Package

**Project Name**: SEVA VAANI (सेवा वाणी) — Multilingual Voice-Based Public Service Assistant  
**Target Domain**: State Post-Matric Scholarship Scheme (10 Essential Fields)  
**Supported Languages**: हिन्दी (Hindi), मराठी (Marathi), English  
**Evaluation Status**: **42 / 42 Tests PASSED (100% Success Rate in 0.33s)**  
**Verification Baseline**: PRD (`SV-PRD-001 v1.0`) & TRD (`SV-TRD-001 v1.0`)  

---

## 1. Executive Summary & Problem-Solution Fit

### The Challenge
Over 800 million Indian citizens face substantial barriers when accessing digital public services due to complex bureaucratic portals, complex form fields, English-centric UI layouts, and limited typing literacy. Existing automated systems frequently guess user intent or hallucinate data, destroying citizen trust.

### The SEVA VAANI Solution
SEVA VAANI converts multi-page government forms into an empathetic, one-question-at-a-time voice dialogue in **Hindi** and **Marathi**. It is governed by one strict engineering rule: **WHEN UNCERTAIN, DO NOT GUESS.**
- **Zero Unconfirmed Commits**: Every single field is confirmed by voice or click before committing to persistent storage.
- **Deterministic State Machine**: Language models/NLUs only extract candidate values; they never route workflow or submit forms autonomously.
- **Multi-Tier Degradation**: Voice $\rightarrow$ Voice Retry $\rightarrow$ Text Fallback $\rightarrow$ Human Support Ticket (`TKT-XXXXXX`).
- **Safe Chrome Extension**: Injects a Manifest V3 overlay with zero auto-submit and strictly excludes sensitive inputs (passwords, OTPs, CAPTCHAs).

---

## 2. Requirements Traceability Matrix

| Hackathon Requirement | Implementation Detail & Mechanism | File / Code Evidence | Test Verification | Status |
|---|---|---|---|:---:|
| **1. Hindi + $\ge 1$ Indian Language** | Complete localization for **Hindi** (`hi`), **Marathi** (`mr`), and English (`en`). | [`data/services/scholarship.json`](file:///Users/vivek/Desktop/SevaVaani/data/services/scholarship.json) | `test_multilingual_workflow.py` | **VERIFIED** |
| **2. STT & TTS Pipeline** | Browser `SpeechRecognition` adapter with `hi-IN`, `mr-IN`, `en-IN` tags; `speechSynthesis` rate `0.92`. | [`frontend/src/services/sttAdapter.ts`](file:///Users/vivek/Desktop/SevaVaani/frontend/src/services/sttAdapter.ts)<br>[`frontend/src/services/ttsAdapter.ts`](file:///Users/vivek/Desktop/SevaVaani/frontend/src/services/ttsAdapter.ts) | `test_speech_adapters.py` | **VERIFIED** |
| **3. Indic NLU & Extraction** | Deterministic regex and natural language number parser (e.g. *"ek lakh assi hazaar"* $\rightarrow$ `180000`). | [`backend/app/services/extractor.py`](file:///Users/vivek/Desktop/SevaVaani/backend/app/services/extractor.py) | `test_accuracy_evaluation.py` | **VERIFIED** |
| **4. Guided Scholarship Flow** | 10-field deterministic state sequence for State Scholarship application. | [`backend/app/services/form_engine.py`](file:///Users/vivek/Desktop/SevaVaani/backend/app/services/form_engine.py) | `test_e2e_scenarios.py` | **VERIFIED** |
| **5. Explicit Answer Confirmation** | Candidate answers presented to citizen; explicit affirmation (*"हाँ"* / *"होय"*) required. | [`backend/app/api/confirmations.py`](file:///Users/vivek/Desktop/SevaVaani/backend/app/api/confirmations.py) | `test_mandatory_cases.py` (TC01-TC03) | **VERIFIED** |
| **6. Text Fallback & Human Help** | Prominent text box after 2 failures; traceable support ticket (`TKT-XXXXXX`) created after 3. | [`backend/app/api/fallback.py`](file:///Users/vivek/Desktop/SevaVaani/backend/app/api/fallback.py) | `test_mandatory_cases.py` (TC08-TC09) | **VERIFIED** |
| **7. Low-Bandwidth Resilience** | Transactional SQLite persistence after every turn; recovers progress on page reload. | [`backend/app/models/database.py`](file:///Users/vivek/Desktop/SevaVaani/backend/app/models/database.py) | `test_mandatory_cases.py` (TC14) | **VERIFIED** |
| **8. Measured Accuracy & WER** | Multilingual benchmark evaluation suite reporting exact-match accuracy, WER, and rejection rate. | [`backend/tests/test_accuracy_evaluation.py`](file:///Users/vivek/Desktop/SevaVaani/backend/tests/test_accuracy_evaluation.py) | `test_accuracy_evaluation.py` | **VERIFIED** |
| **9. Safe Browser Extension** | Manifest V3 extension with DOM scanner, sensitive field exclusion, and zero auto-submit. | [`extension/manifest.json`](file:///Users/vivek/Desktop/SevaVaani/extension/manifest.json)<br>[`extension/domMapper.js`](file:///Users/vivek/Desktop/SevaVaani/extension/domMapper.js) | `test_extension_contracts.py` | **VERIFIED** |
| **10. Mandatory Consent Barrier** | Submissions without explicit citizen consent checkbox are strictly blocked (HTTP 400). | [`backend/app/api/submission.py`](file:///Users/vivek/Desktop/SevaVaani/backend/app/api/submission.py) | `test_mandatory_cases.py` (TC12-TC13) | **VERIFIED** |

---

## 3. Judge Questions & Answers (Definitive Technical Guide)

### Q1: Why is voice assistance necessary for public service portals?
**Answer**: Most Indian citizens access the internet primarily via mobile smartphones and communicate fluently in their native languages (Hindi, Marathi, etc.), but struggle with dense English text, multi-step dropdowns, and keyboard input on complex government portals. SEVA VAANI eliminates cognitive overload by converting forms into an intuitive spoken conversation.

### Q2: How does the multilingual engine handle Hindi and Marathi?
**Answer**: SEVA VAANI uses a two-layer architecture:
1. **Acoustic / Speech Layer**: Web Speech API configured with native locale tags (`hi-IN` and `mr-IN`) capturing natural speech phonetics.
2. **Deterministic Indic NLU Layer**: Custom rule and pattern extractors in [`backend/app/services/extractor.py`](file:///Users/vivek/Desktop/SevaVaani/backend/app/services/extractor.py) that normalize Devnagari numerals, colloquial affirmations (*"हाँ, सही है"*, *"होय, बरोबर"*), currency phrasing (*"डेढ़ लाख"*, *"दोन लाख पन्नास हजार"*), and date expressions into standardized database formats.

### Q3: What happens when speech recognition fails or ambient noise is high?
**Answer**: SEVA VAANI follows a structured **multi-tier degradation protocol**:
- **Attempt 1 (Low Confidence / Unclear)**: System enters `retry` state and politely asks the citizen to repeat (*"कृपया थोड़ा साफ़ और नज़दीक होकर दोबारा बोलें"*).
- **Attempt 2 (Repeated Failure)**: System enters `text_fallback` state, prominently presenting an editable text box so the citizen can type or select.
- **Attempt 3 (Persistent Issue)**: System generates a persistent support ticket (`TKT-XXXXXX`) with all previously confirmed fields, allowing a human operator to resume assistance seamlessly.

### Q4: How do you prevent incorrect answers or hallucinations from corrupting the application?
**Answer**: Through our **Zero Unconfirmed Commits Invariant**. When a citizen speaks, the value is held strictly in an uncommitted `candidate_value` state. The state machine halts and prompts the citizen for confirmation. Only after explicit affirmative intent (`action='confirm'`) is the value written to `confirmed_fields`.

### Q5: What runs locally and what requires a network?
**Answer**:
- **Runs Fully Offline / Locally**: FastAPI state machine, SQLite database, Indic NLU regex extractors, field validation rules, and the Manifest V3 Chrome Extension.
- **Requires Network**: Browser Web Speech API (when using cloud-backed browser recognition engines) or remote API endpoints if deployed to a cloud server.

### Q6: How is citizen privacy protected?
**Answer**:
- **Zero Raw Audio Storage**: Audio streams are processed ephemerally in browser memory; no voice recordings are stored on disk.
- **Sensitive Field Exclusion**: The Chrome extension DOM scanner strictly excludes passwords, OTPs, CAPTCHAs, PINs, and payment tokens from indexing or filling.
- **Data Minimization**: The backend logs only operational turns without persisting PII beyond the declared session schema.

### Q7: What differentiates SEVA VAANI from a generic chatbot?
**Answer**: Generic LLM chatbots are probabilistic, can hallucinate incorrect data, and lack transactional state machines. SEVA VAANI is a **deterministic form completion engine** where LLMs/rules are restricted strictly to candidate parsing, while the transition logic, validation boundaries, and confirmation gates are hardcoded and mathematically verifiable.

### Q8: What is the current limitation regarding real government portals?
**Answer**: To protect security and privacy, SEVA VAANI is tested against an approved synthetic 10-field fixture ([`extension/test-portal.html`](file:///Users/vivek/Desktop/SevaVaani/extension/test-portal.html)). Live portals require explicit administrative whitelisting and integration testing. SEVA VAANI never bypasses logins, CAPTCHAs, OTPs, or the citizen's final submission review.
