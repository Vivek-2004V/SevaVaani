# SEVA VAANI (सेवा वाणी) — Pilot Readiness & User Validation Protocol

**Document ID**: SV-PR-001 (Phase 9 Release)  
**Target Focus**: Supervised Pilot Testing Protocol, Accessibility Validation, and Risk Mitigation  

---

## 1. User Validation & Testing Protocol (Proposed Protocol)

> **Notice**: This protocol outlines the structured testing methodology for a supervised pilot with citizen volunteers. No real citizens have been exposed to unvetted software; all internal validation to date utilized synthetic test personas.

### A. Test Personas & Scenarios

| Persona ID | Language / Literacy Level | Device Condition | Core Tasks to Evaluate |
|---|---|---|---|
| **Persona 1: Ramesh** | Hindi (Native), Basic Digital Literacy | Android Chrome, Moderate Ambient Noise | Complete full 10-field scholarship form using Hindi voice input and explicit voice confirmation (*"हाँ, सही है"*). |
| **Persona 2: Sneha** | Marathi (Native), High Digital Literacy | Laptop Chrome, Clear Microphone | Complete Marathi scholarship form, reject a misspelled name candidate (*"नाही, चूक"*), provide correction, and verify review screen. |
| **Persona 3: Vikas** | Hindi / English, Low Reading Ability | Mobile Chrome, Denied Microphone Permission | Verify immediate fallback to text typing box, request a human operator support ticket (`TKT-XXXXXX`). |

---

### B. Observable Success Criteria

1. **Zero Unconfirmed Commits**: $100\%$ of fields written to `confirmed_fields` must have been preceded by an explicit citizen confirmation step.
2. **Task Completion Rate**: $\ge 85\%$ of participants complete the 10-field form under supervised conditions.
3. **Recovery from Misrecognition**: $100\%$ of participants successfully correct candidate values or switch to text typing fallback without restarting the application.
4. **Consent Integrity**: $100\%$ of completed submissions generate a valid `SV-SCH-2026-XXXX` receipt only after checking the explicit consent box.

---

### C. Participant Feedback Form Template

```markdown
### Participant Feedback Questionnaire (Post-Session)

1. Language Used: [ ] Hindi  [ ] Marathi  [ ] English
2. How easy was it to understand the voice instructions?
   [ ] 1 - Very Difficult  [ ] 2 - Difficult  [ ] 3 - Neutral  [ ] 4 - Easy  [ ] 5 - Very Easy
3. Did the system accurately understand what you said?
   [ ] Always  [ ] Most of the time  [ ] Rarely  [ ] Never
4. When the system made a mistake, how easy was it to correct?
   [ ] Easy to reject and repeat  [ ] Used text typing box  [ ] Gave up
5. Did you feel in control of what information was saved?
   [ ] Yes, always asked to confirm  [ ] No, saved automatically
6. Open Feedback / Observations:
   [_________________________________________________________]
```

---

## 2. Accessibility & Usability Audit (WCAG 2.1 Level AA)

| Accessibility Dimension | Implementation & Status | Verification |
|---|---|:---:|
| **Screen Reader Support** | `role="region"`, `aria-live="polite"` on confirmation cards and `role="alert"` on error banners. | **VERIFIED** |
| **Keyboard Navigation** | Visible focus rings (`focus:ring-4 focus:ring-blue-300`) and standard tab order for all interactive buttons. | **VERIFIED** |
| **Accessible State Indicators** | `aria-pressed={isListening}` and descriptive `aria-label` tags on the primary microphone button. | **VERIFIED** |
| **Typography & Contrast** | High-contrast text on dark/light surfaces meeting the $4.5:1$ contrast ratio for body text. | **VERIFIED** |
| **Low-Literacy Design** | Plain spoken prompts (e.g. *"कृपया अपना पूरा नाम बताएं"*) avoiding complex bureaucratic jargon. | **VERIFIED** |
| **Permission Transparency** | Clear explanation when microphone permission is denied, with immediate text fallback. | **VERIFIED** |

---

## 3. Pilot Readiness & Safety Guardrails

1. **Synthetic Form Sandbox Only**: The pilot assistant interacts strictly with the local synthetic scholarship fixture (`extension/test-portal.html`) or internal staging environments. Live government portal automation is prohibited.
2. **Zero Audio Retention**: Citizen voice recordings are never logged or stored on server disks.
3. **Data Minimization**: Sessions collect only the 10 declared scholarship schema fields.
4. **Operator Escalation**: Support tickets (`TKT-XXXXXX`) preserve session state so human operators can resume assistance seamlessly.
