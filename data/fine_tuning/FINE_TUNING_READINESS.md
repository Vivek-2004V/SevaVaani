# SEVA VAANI: SPEECH-TO-TEXT FINE-TUNING READINESS CHECK & ARCHITECTURE SPECIFICATION
**Standard Reference**: SV-ASR-FT-001  
**Target Languages**: Hindi (`hi`), Marathi (`mr`), Indian English (`en`), Hindi-English Code-Switching (`hi-en`)  
**Audit Date**: October 2026  
**Auditor**: SevaVaani AI & Speech Engineering Core Team  

---

## 1. Executive Summary & Hardware Readiness Audit

| Parameter | Current Local Host Status | Target Training Environment Required | Verdict |
| :--- | :--- | :--- | :--- |
| **Processor** | Apple M5 (10 CPU cores, arm64) | NVIDIA Ampere/Hopper GPU (A100, H100, or RTX 4090) | ❌ INSUFFICIENT FOR FULL BACKPROP |
| **System Memory** | 16 GB Unified Memory (shared with OS/Display) | 32 GB – 80 GB dedicated GPU VRAM + 64 GB System RAM | ❌ HIGH RISK OF OOM THRASHING |
| **CUDA Acceleration** | None (Apple MPS available, but lacks NeMo CUDA kernels) | NVIDIA CUDA 12.1+, cuDNN 8.9+, TensorRT / FlashAttention-2 | ❌ LOCAL TRAINING PROHIBITED |
| **Training Policy** | **SAFETY GUARDRAIL ENFORCED**: Do not launch expensive training locally. | Reproducible training configuration & remote GPU cluster instructions provided. | ✅ SAFEGUARD ACTIVE |

> [!WARNING]
> Fine-tuning a 600M parameter Conformer or 244M parameter Whisper model on a local Apple Silicon CPU with 16 GB unified RAM would cause catastrophic memory thrashing (>140 hours compute time, severe thermal throttling, and inevitable OOM kernel panics). Training must be launched on a dedicated GPU cluster as documented in Section 6.

---

## 2. Separation of Core Adaptation Tasks

To guarantee privacy, verifiable deterministic execution, and domain safety, SevaVaani strictly separates three adaptation layers. **The speech recognition model is NEVER conflated with the LLM or the voice synthesizer.**

```
[Citizen Audio Input (16kHz WAV)]
              │
              ▼
┌────────────────────────────────────────────────────────┐
│  TASK 1: SPEECH MODEL ADAPTATION (Audio to Text)       │
│  • Model: ai4bharat/indicconformer-600m / Whisper-Small│
│  • Objective: Acoustic modeling, phoneme recognition,  │
│    regional accent robustness & code-switch ASR.       │
│  • Output: Verbatim Spoken Transcript String           │
└────────────────────────────────────────────────────────┘
              │ Verbatim Spoken Transcript
              ▼
┌────────────────────────────────────────────────────────┐
│  TASK 2: LLM ADAPTATION (Text NLU & Slot Extraction)   │
│  • Model: Llama-3-8B-Instruct (QLoRA) / Mistral-7B     │
│  • Objective: Scheme intent parsing, official slot     │
│    extraction (income, district, dates), validation.   │
│  • Output: Structured JSON Application Payload         │
└────────────────────────────────────────────────────────┘
              │ Deterministic Response Text
              ▼
┌────────────────────────────────────────────────────────┐
│  TASK 3: TEXT-TO-SPEECH ADAPTATION (Spoken Response)   │
│  • Model: IndicTTS / VITS Multilingual                 │
│  • Objective: Natural prosody, regional accent voice,  │
│    respectful public-service citizen interaction.      │
│  • Output: Spoken Audio Waveform (24kHz WAV)           │
└────────────────────────────────────────────────────────┘
```

### Task Boundaries Table
| Task Layer | Input | Output | Model Class | Adaptation Technique |
| :--- | :--- | :--- | :--- | :--- |
| **1. Speech Adaptation** | 16kHz mono audio waveform | Verbatim text transcript | Conformer CTC/RNN-T or Whisper Seq2Seq | Acoustic CTC Fine-Tuning / LoRA Rank 16 |
| **2. LLM Adaptation** | Normalized text + scheme context | Structured JSON form fields | Autoregressive LLM | QLoRA Instruction Fine-Tuning |
| **3. TTS Adaptation** | Response text + speaker dialect | 24kHz audio stream | VITS / IndicTTS Acoustic Model | Speaker Embedding & Pitch Adaptation |

---

## 3. Pretrained Speech Model Candidates & License Verification

We inspected open pretrained speech recognition models supporting Hindi, Marathi, and English. Two primary candidates genuinely support fine-tuning:

### Candidate A: `ai4bharat/indicconformer-600m` (Primary Recommendation)
- **Model Version**: IndicASR v2 (Conformer-CTC / RNN-T hybrid, 600 Million parameters)
- **Publisher**: AI4Bharat, IIT Madras
- **License**: **MIT License** (Fully open for research, commercial deployment, and custom fine-tuning)
- **Supported Languages**: 22 official Indian languages including Hindi (`hi`), Marathi (`mr`), and Indian English (`en`).
- **Framework**: NVIDIA NeMo / PyTorch
- **Strengths**: Specifically trained on 10,000+ hours of Indic speech across varied regional accents. Native support for Devanagari script output and code-switching tokens.
- **Audio Requirements**:
  - Sample Rate: Exactly 16,000 Hz (16 kHz)
  - Channels: 1 (Mono)
  - Bit Depth: 16-bit signed PCM WAV
  - Duration Filter: 0.5 seconds to 30.0 seconds
  - Minimum Signal-to-Noise Ratio (SNR): >= 15 dB

### Candidate B: `openai/whisper-small` (Secondary Reference Candidate)
- **Model Version**: `openai/whisper-small` (244 Million parameters)
- **Publisher**: OpenAI
- **License**: **Apache 2.0 License** (Open commercial & fine-tuning rights)
- **Supported Languages**: Multilingual (includes Hindi `<|hi|>`, Marathi `<|mr|>`, English `<|en|>`)
- **Framework**: Hugging Face `transformers` + `peft` (LoRA/QLoRA)
- **Strengths**: Robust to conversational background noise; standard Seq2Seq cross-entropy loss pipeline with LoRA adapters (requires only ~12-16 GB VRAM).
- **Audio Requirements**:
  - Sample Rate: 16,000 Hz (automatically converts to 80-channel log-mel spectrogram)
  - Format: 16-bit PCM WAV / FLAC

### Other Evaluated Models (Disqualified for Fine-Tuning)
- **Meta MMS-1B**: Supports Hindi and Marathi via separate CTC language heads, but lacks native mixed Hindi-English code-switching vocabulary.
- **Google Chirp / USM**: Proprietary API-only model. Weights are not downloadable, making custom self-hosted fine-tuning impossible.
- **Bhashini ASR API**: Cloud SaaS endpoint only. Fine-tuning API not available for offline self-hosted government deployments.

---

## 4. Dataset Size & Quality Requirements

Per official AI4Bharat and OpenAI documentation, effective domain adaptation requires:

1. **Volume Requirements**:
   - *Acoustic Adaptation (Regional accents & noise)*: Minimum 10 – 25 hours of curated native-speaker speech per language (~10,000 to 25,000 utterances).
   - *Vocabulary / Domain Adaptation (Public schemes & terminology)*: Minimum 5 – 10 hours of paired domain recordings.
   - *Code-Switching Split*: Minimum 5 hours of conversational Hinglish and Marathi-English audio.
2. **Quality & Audio Standards**:
   - Single-channel (mono) 16kHz WAV format with uniform 16-bit PCM encoding.
   - Leading/trailing silence trimmed to < 200ms.
   - Peak amplitude normalized to -1.0 dBFS (preventing clipping and digital distortion).
   - SNR >= 15 dB (reject low-amplitude or drowned recordings).
3. **Transcript Standardization**:
   - Unicode NFC canonicalization for Devanagari (`\u0900` - `\u097F`).
   - Verbatim transcription without editorial paraphrasing.
   - Numerals spelled out or uniformly normalized via deterministic shielding.
   - Disjoint speaker protocol: Speakers must never overlap between Train, Validation, and Test splits.

---

## 5. Estimated Compute Needs & Resource Planning

### Assumptions:
- Dataset: 50 hours of audio (~45,000 utterances, avg 4.0s duration).
- Epochs: 10 epochs.
- Batch Size: 8 per GPU with gradient accumulation = 4 (Effective batch size = 32).
- Mixed Precision: `bf16` or `fp16`.

### Compute Estimates Table:
| Hardware Target | Model | VRAM per GPU | Training Time (50 hrs) | Est. Cloud Cost | Feasibility |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Local Apple M5 CPU** | Conformer-600M | 16 GB Unified | > 140 Hours | N/A (Local) | ❌ REJECTED (High OOM / Thrash risk) |
| **1x NVIDIA RTX 4090** | Whisper-Small (LoRA) | 24 GB GDDR6X | ~7 - 9 Hours | ~$3.50 (RunPod) | ✅ RECOMMENDED FOR PROTOTYPE |
| **1x NVIDIA A10G** | Whisper-Small (LoRA) | 24 GB GDDR6 | ~8 - 11 Hours | ~$8.00 (AWS g5.2xlarge) | ✅ ENTERPRISE CLOUD OPTION |
| **4x NVIDIA A100 (80GB)** | IndicConformer-600M | 4x 80 GB HBM2e | ~4 - 6 Hours | ~$28.00 (AWS p4d.24xlarge) | ✅ PRODUCTION BENCHMARK CHOICE |

---

## 6. Reproducible Execution Commands

### Prerequisites & Credentials:
```bash
export HF_TOKEN="hf_your_huggingface_token"
export WANDB_API_KEY="your_wandb_api_key_or_disabled"
export CUDA_VISIBLE_DEVICES="0,1,2,3"
```

### A. Manifest Preparation Command (Local or GPU Host)
```bash
# Validates audio, enforces disjoint speaker splits (70/15/15), normalizes transcripts:
python3 -m app.services.fine_tuning.manifest_preparer \
  --corpus-dir ./data/speech_corpus \
  --output-dir ./data/fine_tuning/manifests \
  --split-ratio 0.70 0.15 0.15
```

### B. Speech Model Training Command (GPU Environment)
```bash
python3 scripts/fine_tuning/train_speech_model.py \
  --model-name "ai4bharat/indicconformer-600m" \
  --train-manifest "./data/fine_tuning/manifests/manifest_train.jsonl" \
  --val-manifest "./data/fine_tuning/manifests/manifest_val.jsonl" \
  --output-dir "./data/fine_tuning/checkpoints/indicconformer_adapted_v1" \
  --learning-rate 5e-5 \
  --batch-size 8 \
  --gradient-accumulation-steps 4 \
  --mixed-precision "bf16" \
  --max-epochs 10 \
  --early-stopping-patience 3 \
  --warmup-steps 500
```

### C. Evaluation & Regression Gate Command
```bash
python3 scripts/fine_tuning/evaluate_speech_checkpoint.py \
  --baseline-model "ai4bharat/indicconformer-600m" \
  --adapted-checkpoint "./data/fine_tuning/checkpoints/indicconformer_adapted_v1/checkpoint_best.pt" \
  --test-manifest "./data/fine_tuning/manifests/manifest_test.jsonl" \
  --output-report "./data/fine_tuning/reports/evaluation_comparison.json"
```

---

## 7. Automated Regression Rejection & Rollback Procedure

To protect production reliability, the adapted checkpoint MUST pass an automated regression gate before any traffic can be routed to it.

```
┌─────────────────────────────────────────────────────────────┐
│                 CHECKPOINT EVALUATION GATE                  │
└─────────────────────────────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Native-Speaker Split]          [Code-Switching Split]
   (Hindi, Marathi, English)       (Hinglish, Marathi-English)
            │                                 │
            ▼                                 ▼
   Δ WER <= +1.0% AND                Δ WER <= +2.0% AND
   Overall WER <= Baseline           Entity Recall >= 95%
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                   Is Gate Satisfied?
                   ├── YES ──► Promote Checkpoint to Production
                   └── NO  ──► REJECT CHECKPOINT & TRIGGER ROLLBACK
```

### Rejection Thresholds:
1. **Overall WER Regression**: If `adapted_wer > baseline_wer + 1.0%`, the checkpoint is **REJECTED**.
2. **Code-Switching Regression**: If `adapted_cs_wer > baseline_cs_wer + 2.0%`, the checkpoint is **REJECTED**.
3. **Character Error Rate (Devanagari)**: If `adapted_cer_devanagari > baseline_cer + 1.5%`, the checkpoint is **REJECTED**.

### Rollback Procedure:
If a regression is detected or the gate rejects the checkpoint:
1. **Immediate Disengagement**: Active model symlink `/opt/sevavaani/models/active_stt` remains pointed to `baseline_indicconformer_600m`.
2. **Quarantine Checkpoint**: The rejected checkpoint is moved to `./data/fine_tuning/checkpoints/quarantine/<timestamp>/` with an incident manifest detailing the metric regression.
3. **Audit Log Dispatch**: Log incident to `unsupported_patterns.jsonl` with failure reason and error deltas.
4. **Zero Downtime**: The production speech service continues running on the verified baseline with zero disruption to citizens.
