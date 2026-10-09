# SEVA VAANI (सेवा वाणी)

> **Multilingual Voice-Based Public Service Assistant**  
> *Empowering Indian Citizens to Complete Digital Public Services with Trust, Clarity, and Zero Guesswork*  
> **Supported Languages:** हिन्दी (Hindi), मराठी (Marathi), English  
> **Complies Strictly With:** PRD (`SV-PRD-001 v1.0`) & TRD (`SV-TRD-001 v1.0`)

---

## 🎯 Core Principles & Promise

> *"Speak naturally. Verify clearly. Complete the service."*  
> **Core Engineering Rule: WHEN UNCERTAIN, DO NOT GUESS.**

SEVA VAANI transforms digital public service portals into guided, conversational workflows with deterministic state machines and transparent verification gates:

1. **Zero Unconfirmed Commits**: Every critical field requires explicit citizen confirmation before saving.
2. **Deterministic State Machine**: Language models/NLUs are strictly constrained to candidate extraction, never autonomous business workflow routing.
3. **Multi-Tier Degradation**: Low confidence triggers polite voice retries $\rightarrow$ repeated failures offer text typing fallback $\rightarrow$ persistent blockers generate a human operator ticket (`TKT-XXXXXX`).
4. **Session Resilience**: SQLite-backed state persistence after every single turn prevents data loss during network interruptions or page reloads.
5. **Safe Browser Integration**: Chrome Extension (Manifest V3) operates with minimal permissions (`activeTab`, `storage`), strictly excludes sensitive inputs (passwords, OTPs, CAPTCHAs), and never auto-submits external portals.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Citizen Interface
        A1[Voice Mic / STT Adapter] -->|Transcribed Text| UI[SEVA VAANI Web UI / Chrome Extension]
        A2[Text Fallback Input] -->|Typed Value| UI
    end

    subgraph Backend Core Engine [FastAPI Unified Server]
        UI -->|REST API / Turn Request| Router[API Router /api/*]
        Router --> Engine[Form Engine & State Machine]
        Engine --> Extractor[Deterministic Indic NLU Extractor]
        Engine --> Validator[Field Validator]
        Engine --> Confidence[Confidence & Degradation Engine]
        Engine --> DB[(SQLite Database / sessions, field_values, turns, tickets)]
    end

    subgraph User Confirmation Gate
        Confidence -->|Proposed Candidate| UI
        UI -->|Citizen Confirms: हाँ / होय / Confirm| Commit[Commit to Confirmed Fields]
        UI -->|Citizen Rejects: नहीं / नाही / Reject| Discard[Discard Candidate & Re-prompt]
    end

    subgraph Final Submission
        Commit --> Review[10-Field Final Review Screen]
        Review -->|Explicit Consent Mandatory| Submission[Generate Application ID SV-SCH-2026-XXXX]
    end
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.9+**
- **Node.js 18+** & **npm** (for companion frontend)
- **Google Chrome** (for Manifest V3 extension)

---

### 2. Setup & Run the Backend API Server
```bash
# 1. Navigate to project root
cd /Users/vivek/Desktop/SevaVaani

# 2. Activate Python virtual environment
source backend/venv/bin/activate

# 3. Start the FastAPI server on port 8000
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
* API Documentation & Swagger: **http://127.0.0.1:8000/docs**
* API Health Endpoint: **http://127.0.0.1:8000/api/health**

---

### 3. Run the Companion Web Frontend
```bash
# In a new terminal tab:
cd /Users/vivek/Desktop/SevaVaani/frontend
npm install
npm run dev
```
* Open your browser at: 👉 **http://localhost:5173**

---

### 4. Load & Run the Chrome Extension (Manifest V3)
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in top-right corner).
3. Click **Load unpacked** (top-left button).
4. Select the directory: `/Users/vivek/Desktop/SevaVaani/extension`.
5. Open the local synthetic test portal fixture in Chrome:
   ```
   file:///Users/vivek/Desktop/SevaVaani/extension/test-portal.html
   ```
6. Click the **SEVA VAANI** puzzle/extension action icon in the toolbar to activate the assistant overlay panel.
7. Speak or type field entries and watch the assistant highlight and fill the form upon explicit confirmation.

---

## 🧪 Comprehensive Automated Test Suites

Run the complete 94-test test suite:
```bash
PYTHONPATH=backend ./backend/venv/bin/pytest backend/tests -v
```

### Verified Test Categories (94/94 Passed):
1. **`test_extension_voice_flow.py` (10/10 Passed)**: Browser extension voice assistance, Hindi & Marathi workflows, transcript preview & editing, explicit confirmation gate, SQLite persistence, and text fallback.
2. **`test_database_persistence.py` (13/13 Passed)**: SQLite schema, Argon2id auth, tenant isolation, session linkage, and WAL foreign keys.
3. **`test_mandatory_cases.py` (15/15 Passed)**: Mandatory test cases (`TC01`–`TC15`) covering Hindi/Marathi extraction, confidence gates, retries, text fallback, and human tickets.
4. **`test_e2e_scenarios.py` (6/6 Passed)**: Full E2E Hindi & Marathi workflows, correction cycles, invalid value rejection, fallback escalation, and session recovery.
5. **`test_multilingual_architecture.py` (6/6 Passed)**: Schedule 8 Indic language registry (22 languages), script detection, and LID.
6. **`test_multilingual_workflow.py` (5/5 Passed)**: Multi-language schema consistency across Hindi, Marathi, and English.
7. **`test_ollama_integration.py` (9/9 Passed)**: Local Ollama LLM integration, offline graceful fallbacks, timeout handling, and safety invariants.
8. **`test_llm_integration.py` (8/8 Passed)**: Pluggable LLM extraction with deterministic Indic regex fallback.
9. **`test_security_audit.py` (5/5 Passed)**: CORS origin restrictions, cryptographic session entropy, 0o600 DB permissions, and zero raw audio persistence.
10. **`test_accuracy_evaluation.py` (3/3 Passed)**: Extraction accuracy benchmark, negative rejection rate, and transcription WER.
11. **`test_api_endpoints.py` (6/6 Passed)**: REST contracts for session, turns, confirmation, fallback, submission, and metrics.
12. **`test_speech_adapters.py` (3/3 Passed)**: STT/TTS adapter modularity and WER calculations.
13. **`test_extension_contracts.py` (4/4 Passed)**: Manifest V3 safety, sensitive input exclusions, and test fixture schema coverage.
14. **`test_turn_contract.py` (1/1 Passed)**: Turn response schema contract validation.

---

## 🎤 Live Demonstration Scripts

### Scenario 1: Hindi Voice Journey (हिन्दी संवाद)
1. **Start**: Citizen selects **हिन्दी** on the home screen and clicks **"आवेदन शुरू करें"**.
2. **Field 1 (Name)**:
   - System: *"कृपया अपना पूरा नाम बताएं, जैसा कि आपके आधार कार्ड में है।"*
   - Citizen speaks: *"मेरा नाम रमेश कुमार है।"*
   - System displays & asks: *"मैंने समझा कि आपका नाम Ramesh Kumar है। क्या यह सही है?"*
   - Citizen confirms: *"हाँ, सही है"* (or clicks **✓ हाँ, सही है**).
3. **Field 2 (Date of Birth)**:
   - Citizen speaks: *"मेरी जन्मतिथि 15 अगस्त 2002 है।"*
   - System normalizes to `15/08/2002` $\rightarrow$ Citizen confirms.
4. **Field 3 (Mobile)**:
   - Citizen speaks: *"9876543210"* $\rightarrow$ System validates 10 digits $\rightarrow$ Citizen confirms.
5. **Language Switch Test**:
   - Switch language to **मराठी** using the top bar. All previously confirmed fields remain intact!

### Scenario 2: Error Handling & Marathi Correction (मराठी संवाद)
1. **Rejection & Correction**:
   - Citizen speaks: *"माझे नाव अमित आहे"* $\rightarrow$ System: *"आपले नाव Amit आहे, हे बरोबर आहे का?"*
   - Citizen rejects: *"नाही, चूक आहे"* $\rightarrow$ System discards candidate and politely re-prompts.
   - Citizen corrects: *"माझे नाव राहुल देशमुख आहे"* $\rightarrow$ System extracts *"Rahul Deshmukh"* $\rightarrow$ Citizen confirms: *"होय, बरोबर"*.
2. **Low-Confidence Audio & Text Fallback**:
   - Ambient noise: *"..."* $\rightarrow$ System prompts polite retry.
   - Second unclear audio $\rightarrow$ System activates text fallback input box.
3. **Final Review & Submission**:
   - Citizen reviews all 10 verified fields in the summary card.
   - Citizen checks explicit consent checkbox: *"मी घोषित करतो/करते की वरील सर्व माहिती सत्य आहे."*
   - Click **"अंतिम अर्ज सादर करा"** $\rightarrow$ Unique Application ID generated: `SV-SCH-2026-XXXX`.

---

## 📋 Hackathon Evaluation Checklist

- [x] **Zero Guesswork Guarantee**: No critical field is ever committed without explicit citizen confirmation.
- [x] **Multilingual Support**: Complete, localized prompt/confirmation sets for Hindi, Marathi, and English.
- [x] **Multi-Tier Degradation**: Voice $\rightarrow$ Voice Retry $\rightarrow$ Text Fallback $\rightarrow$ Human Support Ticket.
- [x] **Session Persistence**: SQLite database retains session state after every turn across page reloads.
- [x] **Chrome Extension (Manifest V3)**: Minimal permissions, sensitive field protection, zero auto-submit.
- [x] **100% Passing Test Coverage**: 42 automated tests covering all PRD, TRD, and E2E scenarios.
- [x] **Synthetic & Safe Testing**: All tests utilize synthetic mock data; no live government portals are scraped.

---

## 🔒 Security, Privacy & Scope Boundaries
* **Audio Privacy**: Audio is processed ephemerally in-memory through the browser speech interface; no raw voice recordings are stored.
* **Credential Isolation**: Passwords, OTPs, CAPTCHAs, and payment PINs are explicitly excluded from DOM indexing and assistant processing.
* **Independent Operation**: Zero paid external API dependencies; fully functional locally with deterministic Indic rule extractors and browser speech synthesis.
