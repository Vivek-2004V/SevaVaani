# SEVA VAANI — Product Requirements Document (PRD)

**Document ID**: SV-PRD-001  
**Version**: 1.0  
**Status**: Implementation Ready  
**Product**: SEVA VAANI  
**Primary Objective**: Enable a citizen to complete one sample public-service form by speaking naturally in an Indian language.  
**Languages**: Hindi + Marathi  
**MVP Service**: Scholarship Application (mock service portal)  
**Primary Interface**: Responsive web application (Voice-first + accessible visual assistance)  
**Backend**: FastAPI  
**Data Store**: SQLite for prototype; PostgreSQL for production  
**Architecture Principle**: Voice interface + deterministic service-completion workflow  
**Core Product Principle**: *WHEN UNCERTAIN, DO NOT GUESS.*

---

## 1. Executive Summary
SEVA VAANI is a multilingual, voice-first public-service assistant designed to help citizens complete a digital service without requiring them to understand complex forms, type extensively, or communicate in English. The citizen selects Hindi or Marathi, answers one question at a time by voice, sees/hears what the system understood, confirms the answer, and proceeds through the service until final review and consent.

The product differentiation is the service-completion layer: converting a form into a controlled conversational workflow, confirming critical answers, refusing to guess when uncertain, recovering through text or human help, and measuring actual task completion.

---

## 2. Problem Statement & Impact
| Pain point | Impact | Required product response |
|---|---|---|
| Language barrier | Citizen cannot understand prompts | Hindi/Marathi voice interaction |
| Low digital literacy | Citizen cannot navigate form confidently | One-question-at-a-time guidance |
| Typing difficulty | Slow or inaccurate data entry | Voice-first input with text fallback |
| Speech recognition errors | Wrong information may be recorded | Transcript + confirmation gate |
| Ambiguous answers | Assistant may guess | Confidence-aware clarification/retry |
| Connectivity problems | Voice workflow may fail | Lightweight UI + bounded retries + text fallback |
| No assistance | Citizen gets stuck | Human-help request ticket generation |

---

## 3. Product Vision & Promise
- **Vision**: Make a digital public-service form feel like a guided conversation in the citizen’s own language.
- **Product Promise**: *"Speak naturally. Verify clearly. Complete the service."*
- **Core Principle**: **WHEN UNCERTAIN, DO NOT GUESS.**

---

## 4. Market and Innovation Positioning
SEVA VAANI’s defensible innovation is the combination of language infrastructure with a constrained, auditable service-completion engine:
1. Field-by-field orchestration
2. Confirmation gates
3. Confidence-aware recovery
4. Human escalation tickets
5. Low-bandwidth behavior
6. Measurable end-to-end completion

---

## 5. Goals and Success Criteria
- Controlled field extraction accuracy $\ge 90\%$ on defined demo test set
- Validation accuracy $\ge 95\%$ on defined valid/invalid cases
- Unconfirmed critical values submitted: **0**
- Controlled end-to-end task completion $\ge 85\%$
- Languages demonstrated: Hindi and Marathi
- Working retry + text fallback + human-help path
- Low latency & offline state resilience

---

## 6. MVP Service Definition — Scholarship Application
| Field | Type | Required | Validation Rules | Examples |
|---|---|---|---|---|
| `full_name` | String | Yes | 2–80 chars, alphabetic & spaces | Ramesh Kumar / रमेश कुमार |
| `dob` | Date | Yes | Valid date; DD/MM/YYYY | 14/08/2004 |
| `mobile` | String | Yes | 10 digits (6-9 starting) | 9876543210 |
| `college` | String | Yes | Non-empty | PIEMR |
| `course` | String | Yes | Non-empty | B.Tech CSE |
| `academic_year` | Enum | Yes | 1, 2, 3, 4 | 4 / चौथे वर्ष |
| `annual_income` | Number | Yes | $\ge 0$, normalized numbers | 180000 ("एक लाख अस्सी हज़ार") |
| `category` | Enum | Yes | SC / ST / OBC / General / Other | OBC / अन्य पिछड़ा वर्ग |
| `district` | String | Yes | Non-empty | Indore / पुणे |
| `document_status` | Enum | Yes | Available / Pending | Available / उपलब्ध |

---

## 7. State Machine
```
START
  -> ASK_FIELD
  -> LISTEN
  -> TRANSCRIBE
  -> EXTRACT
  -> VALIDATE
      | invalid -> ASK_FIELD (with error prompt)
      | valid   -> CONFIRM
          | YES -> SAVE -> NEXT_FIELD
          | NO  -> DISCARD -> ASK_FIELD
          | UNCERTAIN -> RETRY
              | success -> CONFIRM
              | repeated failure (2x) -> TEXT_FALLBACK
              | explicit help (3x)   -> HUMAN_HELP
  -> FINAL_REVIEW
  -> FINAL_CONSENT
      | NO  -> REVIEW (edit option)
      | YES -> SUBMIT
  -> COMPLETE (Application ID generated)
```

---

## 8. API Specification
- `POST /api/session`: Create service session
- `POST /api/assist/turn`: Process transcript and return candidate/next action
- `POST /api/confirm`: Commit or reject a candidate
- `POST /api/fallback/text`: Process typed value
- `POST /api/help/request`: Create human-help ticket
- `GET /api/session/{session_id}`: Return current session state
- `POST /api/submit`: Perform final mock submission after consent
- `GET /api/metrics`: Return demo metrics
- `GET /api/health`: Health check
