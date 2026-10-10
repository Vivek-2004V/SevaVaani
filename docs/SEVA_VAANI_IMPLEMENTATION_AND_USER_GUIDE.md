# SEVA VAANI — Complete Implementation & User Operations Guide

**Document Version**: 1.0  
**Project**: SEVA VAANI (सेवा वाणी) — Multilingual Voice Public Service Assistant  
**Target Audience**: Citizens, Operators, Developers, and Hackathon Evaluation Jury  
**Compliance Standard**: Digital Personal Data Protection (DPDP) Act 2023  

---

## 1. Project Overview & System Capabilities

**SEVA VAANI** replaces complex visual forms with an auditable, deterministic, field-by-field voice conversation while enforcing three core principles:
1. **Zero Unconfirmed Commits**: Critical citizen data is never committed to persistent storage without explicit user confirmation.
2. **When Uncertain, Do Not Guess**: Noisy or ambiguous speech triggers polite clarification, never hallucinated values.
3. **Fail-Safe Fallbacks**: Citizens are never stranded—degrading smoothly through Slow Audio Replay, Text Fallback, and Human Helpdesk Ticketing.

### Key Capabilities Matrix:
| Feature | Implementation | Benefit |
|---|---|---|
| **Supported Languages** | Hindi (`hi-IN`), Marathi (`mr-IN`), English (`en-IN`), and 8 other Indian languages | True vernacular inclusion across rural & semi-urban citizen bases |
| **Input Modalities** | Web Speech API (low latency), Audio Chunk File Upload, Keyboard Text Fallback | Universal accessibility across 2G/3G/4G/5G connections |
| **Client Platforms** | Progressive Web App (PWA) + Chrome Manifest V3 Extension | Mobile offline usage + overlay on live government portals (NSP, MahaDBT) |
| **Privacy & Security** | Client Regex Redaction Barrier, Argon2id, JWT Bearer Tokens | Zero PII leakage in server logs; Aadhaar numbers redacted at boundary |
| **Persistence** | SQLite with 0o600 permissions, foreign key constraints | Zero external database dependency for hackathon demo; production K8s ready |

---

## 2. System Architecture & Prerequisites

### Technical Stack:
- **Backend**: FastAPI (Python 3.9+ / 3.11+), Uvicorn, SQLite3, Pytest.
- **Frontend**: React 18, TypeScript, Vite, Tailwind-compatible CSS design system, Lucide icons.
- **Client Deployment**: Progressive Web App (Service Worker + Cache API + IndexedDB), Chrome Extension MV3.

### Prerequisites:
- Python 3.9+ installed (`python3 --version`)
- Node.js 18+ and npm installed (`node -v`, `npm -v`)
- Modern Chromium browser (Google Chrome, Microsoft Edge, Brave)

---

## 3. Step-by-Step Installation & Execution

### Step 1: Clone & Configure Repository
```bash
git clone https://github.com/Vivek-2004V/SevaVaani.git
cd SevaVaani
```

### Step 2: Backend Setup & Launch
```bash
# Navigate to project root and activate virtual environment
cd /Users/vivek/Desktop/SevaVaani
source backend/venv/bin/activate

# Verify test suite pass
pytest backend/tests/test_mandatory_cases.py -v

# Start FastAPI server on port 8000
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Documentation (Swagger UI): `http://localhost:8000/docs`
- Healthcheck Endpoint: `http://localhost:8000/api/health`

### Step 3: Frontend Setup & Launch
Open a second terminal window:
```bash
cd /Users/vivek/Desktop/SevaVaani/frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```
- Web Application URL: `http://localhost:5173`

### Step 4: Install PWA on Mobile / Desktop
1. Open `http://localhost:5173` in Google Chrome.
2. In the browser URL bar or bottom-right corner, click **"ऐप इंस्टॉल करें (Install App)"**.
3. The app is now installed on your desktop/home-screen with standalone offline caching capability!

### Step 5: Load Chrome Extension (Optional for Portal Overlays)
1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle on **"Developer mode"** in the top-right corner.
3. Click **"Load unpacked"** and select the `/Users/vivek/Desktop/SevaVaani/extension` directory.
4. Open any government portal (e.g. National Scholarship Portal) to use the floating voice assistant overlay!

---

## 4. End-to-End Citizen User Journey (How to Use)

### Phase 1: Service Selection & Language Choice
1. Open the dashboard at `http://localhost:5173`.
2. Select your language from the top bar (e.g. **हिन्दी**, **मराठी**, or **English**).
3. Click on the desired service:
   - **आय प्रमाण पत्र (Income Certificate)**
   - **जाति प्रमाण पत्र (Caste Certificate)**
   - **राशन कार्ड सेवा (Ration Card Service)**

### Phase 2: Conversational Voice Ingestion
1. The assistant introduces the form and speaks the first prompt:
   - *"कृपया अपना पूरा नाम बताएं।"*
2. Tap the **🎙️ माइक (Mic)** button and speak naturally:
   - Citizen: *"मेरा नाम रमेश कुमार है।"* (Mera naam Ramesh Kumar hai)
3. **Confidence Gatekeeper**:
   - **High Confidence (≥ 0.85)**: Assistant confirms: *"क्या आपका नाम रमेश कुमार है? कृपया हाँ या ना कहें।"*
   - Citizen speaks: *"हाँ"* (Yes) ➔ Candidate value is committed to the form!
   - **Unclear Speech (< 0.60)**: Assistant gently retries without guessing: *"मुझे आपकी आवाज़ स्पष्ट नहीं मिली। कृपया दोबारा बोलें।"*

### Phase 3: Field-by-Field Progression
The deterministic state machine navigates through required fields:
- Full Name (पूरा नाम)
- Phone Number (10-digit validation enforced)
- Annual Income (Natural language parsing: e.g., *"डेढ़ लाख रुपये"* ➔ `150000`)
- Category / Address

### Phase 4: Final Review & Citizen Consent Gate
1. All filled values are presented in a clear summary table.
2. The user is prompted for DPDP Act 2023 compliance consent.
3. Upon citizen confirmation, an immutable Application ID is generated (e.g. `APP-2026-INC-49120`).

---

## 5. 3-Tier Fallback & Human Support Desk

When a citizen encounters noise, dialect variance, or speech issues, the system automatically escalates through 3 tiers:

```
[Voice Input] ──(Unclear)──> Tier 1: Slow Audio Replay (0.70x speed)
                                    │
                                    └──(2 Failures)──> Tier 2: Text Keyboard Typing (FR-010)
                                                              │
                                                              └──(3 Failures)──> Tier 3: Human Help Ticket (FR-011)
```

### Accessing Human Help (`🆘 इंसानी सहायता`):
Click the red **"इंसानी सहायता"** button in the header or service form banner:
1. **Tab 1: सहायता का अनुरोध (Request Help)**:
   - Choose issue category: *आवाज़ समझ नहीं आ रही (Voice Not Understood)*, *फ़ॉर्म में गलती (Form Error)*, *सर्वर समस्या (Server Issue)*, *दस्तावेज़ सहायता (Document Guidance)*, or *अन्य (Other)*.
   - Enter optional description.
   - Click submit ➔ Generates official ticket ID: `TKT-ABC123`.
2. **Tab 2: मेरे टिकट्स (My Tickets)**:
   - Real-time status tracker (`OPEN`, `IN_PROGRESS`, `RESOLVED`).
3. **Tab 3: हेल्पलाइन संपर्क (Helpline Contacts)**:
   - Kisan Call Center: `1551`
   - Women Helpline: `181`
   - e-District Sahayata: `1800-180-6127`
   - Direct click-to-call (`tel:`) and WhatsApp Support links.

---

## 6. Automated Testing & Verification Commands

All test cases can be run directly from terminal:

```bash
# 1. Run the 15 Mandatory Evaluation Cases
backend/venv/bin/pytest backend/tests/test_mandatory_cases.py -v --tb=short

# 2. Run Human Help Integration Tests
backend/venv/bin/pytest backend/tests/test_human_help_integration.py -v

# 3. Run Entire 252-Test Backend Verification Suite
backend/venv/bin/pytest -q

# 4. Verify Frontend Production Build
cd frontend && npm run build
```

---

## 7. Production Deployment Overview

For cloud deployment:
```bash
# Build & run production Docker containers
docker-compose -f docker-compose.prod.yml up --build -d
```
Includes:
- **Backend API**: Gunicorn + Uvicorn worker pool with rate-limiting.
- **Frontend Web UI**: Nginx alpine serving optimized production bundle with Gzip/Brotli compression.
- **PostgreSQL StatefulSet**: Production database manifests located in `deploy/k8s/postgres-statefulset.yaml`.

---
*SEVA VAANI — Empowering every Indian citizen with trustworthy vernacular voice AI.*
