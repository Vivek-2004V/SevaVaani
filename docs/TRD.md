# SEVA VAANI — Technical Requirements Document (TRD)

**Document Control**  
- **Document ID**: SV-TRD-001  
- **Version**: 1.0  
- **Status**: Implementation Ready  
- **Related PRD**: SV-PRD-001 (SEVA VAANI Product Requirements Document v1.0)  
- **Backend**: Python 3.11+ / FastAPI  
- **Frontend**: React + Vite + Tailwind CSS  
- **Prototype DB**: SQLite (PostgreSQL ready for production)  
- **API Format**: REST / JSON  
- **Primary Languages**: Hindi + Marathi  
- **Deployment Target**: Local demo first; cloud/container-ready  

---

## 1. Purpose of this TRD
This Technical Requirements Document converts the SEVA VAANI PRD into an implementation specification. It defines the concrete software architecture, technology stack, service boundaries, data structures, API contracts, state transitions, speech adapters, validation rules, security controls, testing strategy, and deployment process.

---

## 2. Technical Design Principles
1. **Deterministic workflow controls the service**: The LLM/NLU never controls irreversible actions or workflow state transitions.
2. **Voice providers are adapters**: STT/TTS vendors (Bhashini, Whisper, Web Speech) can be swapped via configuration without touching business logic.
3. **Active form field constraint**: Only the active form field is eligible for extraction and commit.
4. **Zero unconfirmed commits**: No critical value is committed without explicit confirmation.
5. **Mandatory explicit consent**: No final submission without explicit user consent.
6. **State preservation**: Every network failure or retry preserves session state in persistent storage.
7. **Synthetic citizen data**: Used for hackathon demonstrations; no raw audio or PII leaked.
8. **Complete single service**: Optimizes for one complete, robust end-to-end service (Scholarship Application) rather than many partial features.

---

## 3. Recommended Technology Stack
| Layer | Technology | Choice / Version | Purpose |
|---|---|---|---|
| Frontend | React | 18 / 19 | Voice-first web UI |
| Build | Vite | Current stable | Ultra-fast development and optimized build |
| Styling | Tailwind CSS | Current stable | Modern, accessible, responsive design |
| HTTP client | Fetch / Axios | Fetch native | Clean REST API communication |
| Audio | MediaRecorder API | Browser native | Push-to-talk short audio clip capture |
| Backend | Python | 3.11+ (3.9+ compatible) | Application runtime |
| API | FastAPI | Current stable | Asynchronous high-performance REST API |
| Validation | Pydantic | v2 | Request/response and domain schema validation |
| Server | Uvicorn | Current stable | ASGI production server |
| DB | SQLite | MVP | Session, turn, and application storage |
| ORM / Access | SQLAlchemy / SQLite | 2.x | Structured database persistence |
| Testing | Pytest | Current stable | Unit, integration, and E2E test suite |
| Speech | STT/TTS Provider Adapters | Bhashini / Browser hybrid | Indian-language speech processing |
| LLM / Extractor | Structured Extractor | Provider-agnostic | Field extraction & denomination normalization |

---

## 4. High-Level Architecture
```
           CITIZEN (Hindi / Marathi)
                      │
                      ▼
               REACT WEB UI
     [Mic | Transcript | Confirm | Progress | Text Fallback]
                      │ HTTPS / JSON
                      ▼
               FASTAPI ENGINE
             [API / Orchestrator]
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
Voice Adapter   Service Engine    Help/Fallback Manager
[STT/TTS/VAD]  [State Machine]    [Retry/Text/Human Help]
    │          [Validation]
    ▼          [Confirmation]
NLU Extractor         │
 [LLM/Rules] ◄────────┘
    │
    ▼
Confidence Gate
    │
    ▼
 Session Store (SQLite)
    │
    ▼
 Mock Submission
```

---

## 5. Component Responsibilities
| Component | Responsibility | Must Not Do |
|---|---|---|
| **React UI** | Collect input, display state, play prompts, show confirmation | Enforce business-rule authority alone |
| **FastAPI** | Authenticate/session-route requests and orchestrate services | Trust client-side values blindly |
| **Session Manager** | Create, update, and retrieve session state | Interpret arbitrary speech |
| **STT Adapter** | Audio $\rightarrow$ Transcript | Decide form transitions |
| **TTS Adapter** | Text $\rightarrow$ Audio / Speech synthesis params | Modify application state |
| **Extractor** | Transcript $\rightarrow$ Candidate field value | Submit application |
| **Validator** | Validate candidate against field rules | Invent missing data |
| **Confidence Gate** | Choose confirm / clarify / retry / fallback | Bypass confirmation |
| **Form Engine** | Control field sequence and state transitions | Depend on LLM for state decisions |
| **Fallback Manager** | Retry / text fallback / human-help ticket | Delete session data |
| **Submission Service** | Final mock application submission | Submit without explicit consent |
| **Metrics Service** | Record technical/evaluation events | Expose sensitive personal data |

---

## 6. State Machine Technical Specification
| State | Input | Action | Next State |
|---|---|---|---|
| `START` | Start | Create session; set first field | `ASK_FIELD` |
| `ASK_FIELD` | None | Generate localized prompt | `LISTEN` |
| `LISTEN` | Audio | Send to STT | `TRANSCRIBE` |
| `TRANSCRIBE` | Transcript | Send active field + transcript to extractor | `EXTRACT` |
| `EXTRACT` | Candidate | Run validation / confidence gate | `VALIDATE` |
| `VALIDATE` | Valid | Create pending candidate | `CONFIRM` |
| `VALIDATE` | Invalid | Generate correction prompt | `ASK_FIELD` |
| `CONFIRM` | Yes | Persist confirmed value | `NEXT_FIELD` |
| `CONFIRM` | No | Discard candidate | `ASK_FIELD` |
| `CONFIRM` | Unclear | Ask confirmation again | `CONFIRM` |
| `RETRY` | Audio | Increment attempts | `TRANSCRIBE` |
| `TEXT_FALLBACK` | Text | Validate typed value | `CONFIRM` |
| `HUMAN_HELP` | Request | Create ticket; preserve session | `HELP_PENDING` |
| `NEXT_FIELD` | More fields | Move field pointer | `ASK_FIELD` |
| `NEXT_FIELD` | No fields | Prepare summary | `FINAL_REVIEW` |
| `FINAL_REVIEW` | Consent | Validate complete session | `SUBMIT` |
| `FINAL_REVIEW` | Edit | Jump to selected field | `ASK_FIELD` |
| `SUBMIT` | Valid consent | Create application ID | `COMPLETE` |

---

## 7. State Data Contract
```json
{
  "session_id": "uuid",
  "service_id": "scholarship_application",
  "language": "hi",
  "status": "collecting",
  "current_field": "annual_income",
  "attempts": 0,
  "pending_candidate": {
    "field": "annual_income",
    "value": 180000,
    "confidence": 0.91
  },
  "values": {
    "full_name": {
      "value": "Ramesh Kumar",
      "confirmed": true
    }
  }
}
```

---

## 8. REST API Specification
| Method | Endpoint | Request Payload | Response Payload |
|---|---|---|---|
| `POST` | `/api/session` | `service_id`, `language` | `session_id`, `first_prompt`, `status`, `current_field` |
| `POST` | `/api/assist/turn` | `session_id`, `transcript` | `candidate`, `confidence`, `action`, `prompt` |
| `POST` | `/api/confirm` | `session_id`, `confirmed` (or `action`) | `updated_state`, `next_prompt`, `saved_field` |
| `POST` | `/api/fallback/text` | `session_id`, `field`, `value` | `validation`, `candidate`, `session_state` |
| `POST` | `/api/help/request` | `session_id`, `reason` | `ticket_id`, `status`, `message` |
| `GET` | `/api/session/{id}` | — | Complete `session_state` |
| `POST` | `/api/submit` | `session_id`, `consent` | `application_id`, `status`, `submitted_at` |
| `GET` | `/api/metrics` | — | Real-time evaluation metrics |
| `GET` | `/api/health` | — | Service health status |
| `POST` | `/api/voice/transcribe` | audio file/bytes | `transcript`, `confidence`, `language` |

---

## 9. Performance & Security Requirements
- **Input Validation**: Pydantic v2 + domain regex & format validators.
- **Secrets Management**: Kept in `.env` or system environment variables; never in frontend bundles.
- **Latency Target**: Local API non-voice endpoint $< 500\text{ ms}$; DB access $< 100\text{ ms}$.
- **Zero Unconfirmed Guarantee**: Hard-coded safety invariant that blocks any unconfirmed field from submission.
