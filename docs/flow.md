# SEVA VAANI — Actual End-to-End System Flow Document

**Document Control**  
- **Document ID**: SV-FLOW-001  
- **Version**: 1.0  
- **Purpose**: Implementation-ready operational flow  
- **Primary Interface**: Web voice-first application (React + Vite + Tailwind CSS)  
- **Backend**: FastAPI  
- **Speech**: STT/TTS provider adapters  
- **Decision Engine**: Deterministic form state machine  
- **AI Role**: Structured extraction only  
- **MVP Submission**: Mock public-service submission  

---

## 1. What this document defines
This document defines the exact runtime flow of **SEVA VAANI**. It connects citizen interaction to frontend events, REST APIs, speech services, extraction, validation, confirmation, persistence, fallback, and final submission.

---

## 2. Master End-to-End Flow Diagram
```
                     CITIZEN (Hindi / Marathi)
                                │
                                ▼
                         OPEN SEVA VAANI
                                │
                                ▼
                         SELECT LANGUAGE
                                │
                                ▼
                         SELECT SERVICE
                          (Scholarship)
                                │
                                ▼
                         CREATE SESSION
                         POST /api/session
                                │
                                ▼
                         ASK CURRENT FIELD
                                │
                                ▼
                         CITIZEN SPEAKS
                                │
                                ▼
                              STT
                        (Speech → Text)
                                │
                                ▼
                        EXTRACTOR / NLU
                       (Text → Candidate)
                                │
                                ▼
                         VALIDATE VALUE
                                │
                 ┌──────────────┴──────────────┐
              INVALID                        VALID
                 │                             │
                 ▼                             ▼
           RE-ASK FIELD                 CONFIDENCE GATE
                                               │
                       ┌───────────────────────┼───────────────────────┐
                      HIGH                   MEDIUM                   LOW
                       │                       │                       │
                       ▼                       ▼                       ▼
                    CONFIRM                 CLARIFY                  RETRY
                       │                       │                       │
                 ┌─────┴─────┐                 │                       │
                YES          NO                │                       │
                 │           │                 │                       │
                 ▼           ▼                 │                       │
               SAVE       DISCARD ─────────────┼───────────────┐       │
                 │                             │               │       │
                 ▼                             ▼               ▼       ▼
             NEXT FIELD                                     RE-ASK FIELD
                 │                                             │
                 │                                             │
                 │                repeated failures            │
                 │               ───────────────────►   TEXT FALLBACK
                 │                                             │
                 │                                        still blocked?
                 │                                             │
                 │                                             ▼
                 │                                     HUMAN HELP TICKET
                 │                                       (SV-XXXXXX)
                 ▼
          After all 10 fields:
                 │
                 ▼
            FINAL REVIEW
                 │
          EXPLICIT CONSENT
                 │
          MOCK SUBMISSION
                 │
           APPLICATION ID
          (SV-SCH-2026-XXXX)
                 │
              COMPLETE
```

---

## 3. Runtime Flow — Step-by-Step

| Step | Citizen | Frontend Event | Backend / Service Action | Output / System State |
|---|---|---|---|---|
| **01** | Opens app | Loads welcome screen | `GET /api/health` optional | App ready (`welcome`) |
| **02** | Selects Hindi / Marathi | Stores language | Creates language context | Language active |
| **03** | Selects Scholarship Scheme | Shows service info | `POST /api/session` | `session_id`, `status: "collecting"` |
| **04** | Waits for question | Shows prompt + mic | Returns first field (`full_name`) | Question visible & audio spoken |
| **05** | Speaks answer | Records short audio | `POST /api/assist/turn` | Speech transcript |
| **06** | — | Shows transcript | Extractor processes active field | Structured candidate value |
| **07** | — | Shows processing state | Validator checks rules + Confidence gate | Action decision (`CONFIRM`, `RETRY`, `INVALID`) |
| **08** | Confirms / Rejects | Shows Yes / No buttons | `POST /api/confirm` | Candidate saved or discarded |
| **09** | — | Updates progress bar | Moves to next field | Next question prompted |
| **10** | Fails voice ($2\times$) | Shows text fallback panel | Retry counter increments | Prominent typing input & help ticket option |
| **11** | Finishes 10 fields | Shows Review screen | Validates completeness | 10 verified fields summary |
| **12** | Gives explicit consent | Enables Submit button | `POST /api/submit` | Application created in DB |
| **13** | — | Shows Success screen | Stores application status | Official Application ID (`SV-SCH-2026-XXXX`) |

---

## 4. Confirmation Gate (Critical Safety Invariant)
```
Candidate Value
       │
       ▼
Is it VALID? ──── NO ──► RE-ASK FIELD (with explanation)
       │ YES
       ▼
Is confidence acceptable? ──── NO (Low < 0.60) ──► RETRY PROMPT
       │ YES
       ▼
SHOW CONFIRMATION GATE
       │
   ┌───┴───┐
  YES      NO
   │        │
   ▼        ▼
 SAVE    DISCARD ──► RE-ASK FIELD
   │
   ▼
NEXT FIELD
```

> **Important Rule**: `candidate_value` and `confirmed_value` are strictly separate. A candidate is never committed to application state until the citizen explicitly confirms it.

---

## 5. What the User Never Sees vs. What the Judge Should See

### What the Citizen Never Sees
- Internal LLM/NLU prompt engineering strings.
- Raw confidence floating-point numbers.
- Internal state machine enum constants.
- External API keys or tokens.
- Backend exception traces.

### What the Judge Sees
- Effortless language selection (Hindi / Marathi).
- Voice prompt and natural voice response.
- Accurate Devanagari / English live transcripts.
- Strict confirmation gate protection (0 unconfirmed submitted).
- Smooth language switching mid-session without data loss.
- Intentional failure injection & recovery (Retry $\rightarrow$ Text Fallback $\rightarrow$ Human Help Ticket).
- Complete review table with "Edit (बदलें)" option.
- Mandatory explicit citizen consent.
- Generated official Application ID and verifiable evaluation metrics.
