# SEVA VAANI — Native Speaker Speech Corpus & Preparation Pipeline

## 1. Executive Summary & Purpose
The **SEVA VAANI Native Speaker Speech Corpus** is a curated, consent-driven speech dataset designed to evaluate and train automatic speech recognition (ASR) systems for Indian digital public services.

The primary objective is improving recognition accuracy across **native speakers**, **regional accents**, **dialectal variations**, **pronunciation patterns**, and **code-switching** in **Hindi**, **Marathi**, **Indian English**, and **Hinglish**.

> [!IMPORTANT]
> **Zero Citizen Data Policy**: Live citizen application records, Aadhaar numbers, real telephone directories, and sensitive public service filings are **STRICTLY EXCLUDED** from this training corpus. All sample prompts and training utterances are drawn exclusively from consenting study participants or curated synthetic public-domain service dialogs.

---

## 2. Ethical Framework & Informed Consent (Requirements 1, 6, 7 & 8)

1. **Explicit Informed Consent**:
   - Every audio recording must be accompanied by an active consent ledger entry (`consent_ledger.json`).
   - Consent covers: model training, accent evaluation, and accessibility research.
   - Any sample lacking active consent is immediately quarantined or rejected.
2. **Prohibition of Sensitive Inferences (Requirement 6)**:
   - **Strict Rule**: Voice recordings are **NEVER** analyzed to infer caste, religion, ethnicity, political affiliation, or socioeconomic vulnerability.
   - Only **voluntarily self-reported** regional background (e.g., *Vidarbha, Malwa, Bundelkhand*) and linguistic dialect (e.g., *Varhadi, Malwi*) are recorded.
3. **No Unlicensed Web Scraping (Requirement 7)**:
   - Voice clips are never scraped from public social media or non-consenting portals. Only consented participants and verified open licenses (e.g., CC-BY-4.0 / AI4Bharat IndicVoices) are admitted.

---

## 3. Pseudonymization & Air-Gapped Identity Decoupling (Requirements 2 & 4)

To prevent re-identification, participant identity is completely decoupled from audio features and training manifests:

```
Participant Token (Air-Gapped Private Ledger)
            │
            ▼
Salted HMAC-SHA256 Pseudonymizer
            │
            ▼
Pseudonymous ID: `spk_9f83a2c7104b9e21`
            │
            ▼
Manifest Entry: `recording_id`, `speaker_id_pseudonymous`, `audio_path`, `verified_transcript`
```

- **Training manifests ONLY contain `speaker_id_pseudonymous`.**
- Real names, phone numbers, and participant contact details reside in an isolated, encrypted administrative ledger, inaccessible to training scripts.

---

## 4. Dataset Schema Specification (Requirement 12)

Each sample in the corpus is represented as a structured JSON object in versioned JSONL manifests (`manifest_train.jsonl`, `manifest_val.jsonl`, `manifest_test.jsonl`, `manifest_quarantine.jsonl`):

```json
{
  "recording_id": "a5d8b72e-3c21-4f90-8b1a-8c7e90123456",
  "speaker_id_pseudonymous": "spk_9f83a2c7104b9e21",
  "language": "mr",
  "self_reported_region_optional": "Vidarbha, Maharashtra",
  "self_reported_dialect_optional": "Varhadi",
  "recording_environment": "village_chowk_outdoor",
  "audio_path": "audio/mr/a5d8b72e-3c21-4f90-8b1a-8c7e90123456.wav",
  "audio_format": "wav",
  "sample_rate": 16000,
  "duration_sec": 4.82,
  "audio_hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "verified_transcript": "व्हय माझं नाव राहुल देशमुख आहे आणि मी शेतकरी आहे",
  "transcript_language_segments": [
    {"text": "व्हय", "language": "mr", "script": "Devanagari"},
    {"text": "माझं", "language": "mr", "script": "Devanagari"},
    {"text": "नाव", "language": "mr", "script": "Devanagari"},
    {"text": "राहुल", "language": "mr", "script": "Devanagari"},
    {"text": "देशमुख", "language": "mr", "script": "Devanagari"},
    {"text": "आहे", "language": "mr", "script": "Devanagari"}
  ],
  "transcription_reviewer_status": "verified",
  "consent_status": "active",
  "license_type": "Consent-Restricted Research & Public Service Agreement",
  "dataset_split": "train",
  "quality_flags": ["pass_clean"],
  "dataset_version": "1.0.0",
  "annotation_version": "v1.0",
  "created_at": 1728500000.0,
  "updated_at": 1728500000.0
}
```

---

## 5. Automated Audio Quality Gate (Requirement 9)

Every incoming recording passes through the automated `DatasetQualityGate` before being routed to a training split:

| Criterion | Threshold | Failure Action / Flag |
| :--- | :--- | :--- |
| **Empty File** | Byte size == 0 | Immediate rejection (`empty_file`) |
| **Container Integrity** | RIFF/WAV or WebM header verification | Rejection to quarantine (`corrupted_header`) |
| **Deduplication** | SHA-256 byte fingerprint comparison | Flagged as duplicate (`duplicate_file`) |
| **Silence / Dropped Audio** | RMS Energy < 8.0 | Quarantine (`excessive_silence`) |
| **Signal-to-Noise Ratio** | SNR < 10.0 dB | Quarantine (`excessively_noisy_low_snr`) |
| **Clipping / Saturation** | Saturated samples > 5% | Flagged (`audio_clipping_detected`) |
| **Duration Bounds** | 0.5s ≤ Duration ≤ 30.0s | Flagged (`duration_too_short` / `duration_too_long`) |

---

## 6. Transcript Human Verification & Code-Switching (Requirements 10 & 11)

1. **Human Verification Gate**:
   - Supervised fine-tuning and benchmark evaluations strictly require `transcription_reviewer_status == "verified"`.
   - Automated ASR drafts (`raw_transcript`) without human verification are kept in `quarantine` until validated by a trained linguist reviewer.
2. **Native Script & Code-Switching Preservation**:
   - **Devanagari Script** is strictly preserved for Hindi and Marathi (never forcibly transliterated into Latin).
   - **Latin Script** is preserved for English terms.
   - **Code-Switched Hinglish/Minglish**: Mixed utterances (e.g. *"मेरा name रमेश है and income 2 lakh hai"*) retain both scripts in `transcript_language_segments`, accurately mapping token-level script transitions.

---

## 7. Withdrawal and Deletion Workflow (Requirement 5)

Participants hold an unconditional **Right to be Forgotten**:
1. Participant presents their token or requests withdrawal.
2. `ConsentManager.withdraw_consent(speaker_id)` revokes active consent.
3. `DatasetPipeline.withdraw_speaker_and_purge()` scans `manifest_train.jsonl`, `manifest_val.jsonl`, and `manifest_test.jsonl`.
4. All associated audio files are securely deleted from disk (`os.remove`) or relocated to quarantine.
5. Split manifests are rewritten immediately to ensure zero traces remain in active training splits.

---

## 8. Data Preparation & Ingestion Workflow

```
[Consenting Speaker Session]
            │
            ▼
[Audio Recording (WAV/16kHz)]
            │
            ▼
1. Consent Validation (ConsentManager) ──[No Consent]──> [REJECT]
            │
            ▼ [Active Consent]
2. Pseudonymization (HMAC-SHA256)
            │
            ▼
3. Acoustic Quality Gate (DatasetQualityGate)
   - Corruption check
   - Deduplication (SHA-256)
   - SNR / Clipping / Silence
            │
            ▼
4. Human Review & Script Segmentation (TranscriptVerifier)
            │
            ▼
5. Split Routing:
   ├─ If Verified + Clean Quality + Active Consent ──> [manifest_train.jsonl / val / test]
   └─ If Unverified or Quality Warning            ──> [manifest_quarantine.jsonl]
```
