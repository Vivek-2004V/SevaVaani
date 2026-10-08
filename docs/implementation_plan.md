# SEVA VAANI — IMPLEMENTATION PLAN (SV-IMP-001)

**Multilingual Voice-Based Assistance for Completing Digital Public Services**  
**Version:** 1.0 | **Status:** Implementation Ready | **Related PRD:** SV-PRD-001 | **Related TRD:** SV-TRD-001  

---

## 1. Purpose & Scope
This plan converts the SEVA VAANI PRD and TRD into a practical build sequence, prioritizing a complete, deterministic, and reliable citizen journey for the Scholarship Application in Hindi & Marathi.

### MVP Scope (P0)
- **Service:** Post-Matric Scholarship Application (`scholarship_app`)
- **Languages:** Hindi (`hi`) + Marathi (`mr`) + English (`en`)
- **Interaction:** Push-to-talk voice with Web Speech API and text fallback
- **Workflow:** Deterministic one-field-at-a-time state machine
- **Confirmation:** Every critical value requires explicit user confirmation
- **Failure Handling:** Retry $\rightarrow$ Text Fallback $\rightarrow$ Human Help Ticket
- **Submission:** Mock service submission with unique Application ID
- **Database:** SQLite for MVP, structured for PostgreSQL in production
- **3D Hero:** Three.js r149 Sylva Living World Scene (isolated background on landing)

---

## 2. System Architecture

```text
Citizen
  │
  ▼
React Voice UI (TypeScript + Vite)
  │
  ▼
FastAPI Backend (:8000)
  │
  ▼
STT Adapter / Web Speech API
  │
  ▼
Structured Extractor (Active field constrained)
  │
  ▼
Validator (Type, length, regex, range)
  │
  ▼
Confidence Gate
  │
  ▼
Explicit Confirmation Gate
  ├── False ──► Retry / Clarify
  └── True  ──► Persist Confirmed Value ──► Next Field
  │
  ▼
Final Review Table (All 10 fields + Edit)
  │
  ▼
Explicit Consent Checkbox
  │
  ▼
Mock Service Submission ──► Application ID Generation (SV-SCH-2026-XXXXXX)

[Failure Path]:
Low Confidence ──► Retry ──► Text Fallback ──► Human Help Operator Ticket
```

**Core Engineering Rule:** The LLM may interpret language, but it must never control workflow, validation, confirmation, or submission.

---

## 3. The 10 Form Fields (Scholarship Service)

| # | Field Name | Validation Rule | Hindi Sample | Marathi Sample |
|---|---|---|---|---|
| 1 | `full_name` | 2–80 characters | "मेरा नाम विवेक विश्वकर्मा है" | "माझे नाव विवेक विश्वकर्मा आहे" |
| 2 | `dob` | Valid Date (DD/MM/YYYY) | "15 अगस्त 2003" | "15 ऑगस्ट 2003" |
| 3 | `mobile` | Exactly 10 digits | "9876543210" | "9876543210" |
| 4 | `college` | Non-empty string | "राजकीय इंजीनियरिंग कॉलेज" | "शासकीय अभियांत्रिकी महाविद्यालय" |
| 5 | `course` | Non-empty string | "बी.टेक" | "बी.टेक" |
| 6 | `academic_year` | Enum: 1st/2nd/3rd/4th | "द्वितीय वर्ष" | "द्वितीय वर्ष" |
| 7 | `annual_income` | Non-negative integer | "150000 रुपये" | "150000 रुपये" |
| 8 | `category` | Enum: General/OBC/SC/ST/EWS | "ओबीसी" | "ओबीसी" |
| 9 | `district` | Non-empty string | "पुणे" | "पुणे" |
| 10 | `document_status` | Acknowledgment | "हाँ, सभी दस्तावेज तैयार हैं" | "होय, कागदपत्रे उपलब्ध आहेत" |

---

## 4. Phase Breakdown & Implementation Checklist

- [x] **Phase 0 — Repository & Environment:** Git repo, Python venv, FastAPI, SQLite, React Vite TypeScript, Tailwind CSS.
- [x] **Phase 1 — Service Schema:** `data/services/scholarship.json` and `frontend/src/services/schema.ts` aligned.
- [x] **Phase 2 — Database Layer:** SQLite connection, sessions, field_values, turns, help_tickets, applications tables.
- [x] **Phase 3 — Deterministic State Machine:** State engine advancing only upon explicit confirmation.
- [x] **Phase 4 — Core REST APIs:** `/api/session`, `/api/assist/turn`, `/api/confirm`, `/api/fallback/text`, `/api/help/request`, `/api/submit`, `/api/metrics`, `/api/health`.
- [x] **Phase 5 — Mock / Fallback Extractor:** Rule-based parser for mobile digits, word numbers to income, caste enums.
- [x] **Phase 6 — Validators:** Rigorous checks on mobile length, income bounds, dates, and non-empty strings.
- [x] **Phase 7 — Confirmation Layer:** Dedicated confirmation cards ensuring zero unconfirmed submissions.
- [x] **Phase 8 — Frontend Implementation:** TypeScript components (`VoiceButton`, `TranscriptCard`, `ConfirmationCard`, `ProgressBar`, `FallbackPanel`, `FieldSummary`, `LanguageSelector`, `Welcome`, `ServiceForm`, `Review`, `Success`, `JudgeMode`).
- [x] **Phase 9 — 3D Sylva Living World Integration:** Three.js r149 canonical runtime, isolated canvas and stage anchor, procedural shaders, moss roots, pollen, butterfly.
- [x] **Phase 10 — Multilingual Support:** Hindi + Marathi with in-session seamless switching without state loss.
- [x] **Phase 11 — Failure & Human Help:** Fallback panel generating operator tickets (`TICK-XXXXXX`).
- [x] **Phase 12 — Final Review & Explicit Consent:** Submission strictly blocked until explicit consent checkbox is checked.
- [x] **Phase 13 — Testing Strategy:** 15/15 mandatory PRD test cases passing via pytest.
