"""
Comprehensive Test Suite for Speech Model Fine-Tuning Workflow (Prompt 6).
Verifies:
  1. Pretrained model candidate inspection and license verification
  2. Tripartite task separation (Speech Adaptation vs LLM vs TTS)
  3. Audio format requirements (16kHz mono 16-bit PCM) & transcript normalization
  4. Disjoint speaker partitioning across train, val, and test splits
  5. Configurable training hyperparameters and CLI generator
  6. Checkpoint persistence and metrics tracking
  7. Native-speaker vs code-switching subgroup evaluation
  8. Automated regression rejection gate and rollback triggering
  9. Programmatic readiness auditor and local CPU hardware guardrail
 10. FastAPI endpoint contract responses
"""

import os
import io
import wave
import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.fine_tuning.task_separation import (
    SpeechModelAdaptationSpec,
    LLMAdaptationSpec,
    TTSAdaptationSpec,
    AdaptationPipelineSeparation
)
from app.services.fine_tuning.training_config import SpeechTrainingConfig
from app.services.fine_tuning.manifest_preparer import ManifestPreparer, AudioValidationError
from app.services.fine_tuning.readiness_checker import ReadinessChecker
from app.services.fine_tuning.checkpoint_comparator import CheckpointComparator

client = TestClient(app)


def create_test_wav_bytes(sample_rate: int = 16000, channels: int = 1, duration_sec: float = 1.0) -> bytes:
    """Helper creating valid PCM WAV bytes."""
    buf = io.BytesIO()
    num_frames = int(sample_rate * duration_sec)
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(b"\x00\x00" * num_frames)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Requirement 1 & 2: Task Separation Architecture
# ---------------------------------------------------------------------------

def test_task_separation_specifications():
    """Verifies strict separation of Speech ASR, LLM NLU, and TTS synthesis."""
    separation = AdaptationPipelineSeparation()
    desc = separation.describe_separation()

    assert len(desc["pipeline_stages"]) == 3
    stage_tasks = [s["task"] for s in desc["pipeline_stages"]]
    assert stage_tasks == ["speech_model_adaptation", "llm_adaptation", "tts_adaptation"]

    # Verify Speech Adaptation Scope
    speech_spec = separation.speech_adaptation
    assert speech_spec.validate_scope("audio/wav", "text/plain") is True
    assert speech_spec.validate_scope("text/plain", "application/json") is False
    assert "hi" in speech_spec.target_languages
    assert "mr" in speech_spec.target_languages
    assert "en" in speech_spec.target_languages

    # Verify LLM Adaptation Scope
    llm_spec = separation.llm_adaptation
    assert llm_spec.validate_scope("text/plain", "application/json") is True
    assert llm_spec.validate_scope("audio/wav", "text/plain") is False

    # Verify TTS Adaptation Scope
    tts_spec = separation.tts_adaptation
    assert tts_spec.validate_scope("text/plain", "audio/wav") is True


# ---------------------------------------------------------------------------
# Requirement 3 & 7: Model Selection, License & Configurable Training Settings
# ---------------------------------------------------------------------------

def test_training_config_and_hyperparameters():
    """Verifies configurable training settings for IndicConformer and Whisper."""
    cfg = SpeechTrainingConfig(
        model_name="ai4bharat/indicconformer-600m",
        learning_rate=3e-5,
        per_device_train_batch_size=8,
        gradient_accumulation_steps=4,
        mixed_precision="bf16",
        max_epochs=12,
        lora_rank=32
    )

    assert cfg.model_name == "ai4bharat/indicconformer-600m"
    assert cfg.learning_rate == 3e-5
    assert cfg.effective_batch_size(num_gpus=2) == 64
    assert cfg.lora_rank == 32

    cli_cmd = cfg.generate_cli_command()
    assert "train_speech_model.py" in cli_cmd
    assert "--learning-rate 3e-05" in cli_cmd or "--learning-rate 3e-5" in cli_cmd
    assert "--mixed-precision 'bf16'" in cli_cmd


# ---------------------------------------------------------------------------
# Requirement 4 & 5: Audio Validation & Transcript Normalization
# ---------------------------------------------------------------------------

def test_audio_validation_constraints(tmp_path):
    """Verifies audio format screening: 16kHz, mono, PCM_16, duration constraints."""
    preparer = ManifestPreparer(output_dir=str(tmp_path))

    # Valid 16kHz mono audio
    valid_wav = tmp_path / "valid.wav"
    valid_wav.write_bytes(create_test_wav_bytes(sample_rate=16000, channels=1, duration_sec=2.0))
    res = preparer.validate_audio_file(str(valid_wav))
    assert res["valid"] is True
    assert res["sample_rate"] == 16000
    assert res["channels"] == 1
    assert res["bit_depth"] == 16

    # Invalid Stereo Audio
    stereo_wav = tmp_path / "stereo.wav"
    stereo_wav.write_bytes(create_test_wav_bytes(sample_rate=16000, channels=2, duration_sec=2.0))
    with pytest.raises(AudioValidationError, match="Invalid channels"):
        preparer.validate_audio_file(str(stereo_wav))

    # Invalid Sample Rate (44.1kHz)
    wrong_sr_wav = tmp_path / "sr44k.wav"
    wrong_sr_wav.write_bytes(create_test_wav_bytes(sample_rate=44100, channels=1, duration_sec=2.0))
    with pytest.raises(AudioValidationError, match="Invalid sample rate"):
        preparer.validate_audio_file(str(wrong_sr_wav))

    # Invalid Duration (< 0.5s)
    too_short_wav = tmp_path / "short.wav"
    too_short_wav.write_bytes(create_test_wav_bytes(sample_rate=16000, channels=1, duration_sec=0.2))
    with pytest.raises(AudioValidationError, match="Invalid duration"):
        preparer.validate_audio_file(str(too_short_wav))


def test_transcript_normalization():
    """Verifies Unicode NFC normalization and language-specific casing."""
    preparer = ManifestPreparer()

    # Hindi transcript normalization
    hindi_raw = "मुझे   आय  प्रमाण पत्र चाहिए!?? "
    hindi_norm = preparer.normalize_transcript(hindi_raw, "hi")
    assert "!" not in hindi_norm
    assert "?" not in hindi_norm
    assert hindi_norm == "मुझे आय प्रमाण पत्र चाहिए"

    # Hinglish code-switching normalization
    hinglish_raw = "Mera Annual Income 2 Lakh Hai... Please Update!"
    hinglish_norm = preparer.normalize_transcript(hinglish_raw, "hi-en")
    assert hinglish_norm == "mera annual income 2 lakh hai please update"

    # Marathi normalization
    marathi_raw = "मला उत्पन्नाचा दाखला हवा आहे. "
    marathi_norm = preparer.normalize_transcript(marathi_raw, "mr")
    assert marathi_norm == "मला उत्पन्नाचा दाखला हवा आहे"


# ---------------------------------------------------------------------------
# Requirement 6: Disjoint Speaker Partitioning
# ---------------------------------------------------------------------------

def test_disjoint_speaker_splits(tmp_path):
    """Ensures 100% disjoint speaker isolation across train, val, and test splits."""
    preparer = ManifestPreparer(output_dir=str(tmp_path))

    # Create dummy samples across 10 distinct speakers
    samples = []
    for spk_idx in range(10):
        spk_id = f"spk_{spk_idx:03d}"
        for utt_idx in range(4):
            samples.append({
                "audio_filepath": f"/fake/path/{spk_id}_{utt_idx}.wav",
                "verified_transcript": f"Utterance {utt_idx} from speaker {spk_id}",
                "speaker_id_pseudonymous": spk_id,
                "duration_sec": 3.0,
                "language": "hi"
            })

    result = preparer.prepare_manifests_from_corpus(
        samples_list=samples,
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15
    )

    assert result["status"] == "MANIFESTS_GENERATED"
    train_file = result["manifest_files"]["train"]
    val_file = result["manifest_files"]["validation"]
    test_file = result["manifest_files"]["test"]

    # Read back manifests and extract speaker sets
    def get_speakers_from_manifest(fpath):
        spks = set()
        with open(fpath, "r", encoding="utf-8") as f:
            for line in f:
                rec = json.loads(line)
                spks.add(rec["speaker_id_pseudonymous"])
        return spks

    train_spks = get_speakers_from_manifest(train_file)
    val_spks = get_speakers_from_manifest(val_file)
    test_spks = get_speakers_from_manifest(test_file)

    # VERIFY DISJOINT PROPERTY: Zero overlap
    assert len(train_spks.intersection(val_spks)) == 0, "Speaker leakage between train and val!"
    assert len(train_spks.intersection(test_spks)) == 0, "Speaker leakage between train and test!"
    assert len(val_spks.intersection(test_spks)) == 0, "Speaker leakage between val and test!"
    assert len(train_spks) + len(val_spks) + len(test_spks) == 10


# ---------------------------------------------------------------------------
# Requirement 10, 11 & 12: Checkpoint Comparison & Regression Gate
# ---------------------------------------------------------------------------

def test_checkpoint_comparison_approved():
    """Verifies that an adapted checkpoint with lower WER is APPROVED."""
    comparator = CheckpointComparator(max_allowed_overall_wer_regression=1.0)

    test_samples = [
        {"id": "1", "text": "mujhe income certificate chahiye", "language": "hi-en", "is_code_switched": True},
        {"id": "2", "text": "mera address update kar do", "language": "hi-en", "is_code_switched": True},
        {"id": "3", "text": "मुझे आय प्रमाण पत्र चाहिए", "language": "hi", "is_code_switched": False},
        {"id": "4", "text": "मला उत्पन्नाचा दाखला हवा आहे", "language": "mr", "is_code_switched": False},
    ]

    # Baseline has some errors
    baseline_transcripts = {
        "1": "mujhe incom sertificate chahiye",
        "2": "mera adres updat kar do",
        "3": "मुझे आय प्रमाण पत्र",
        "4": "मला उत्पन्नाचा दाखला",
    }

    # Adapted model is accurate
    adapted_transcripts = {
        "1": "mujhe income certificate chahiye",
        "2": "mera address update kar do",
        "3": "मुझे आय प्रमाण पत्र चाहिए",
        "4": "मला उत्पन्नाचा दाखला हवा आहे",
    }

    decision = comparator.compare_evaluations(
        baseline_model_id="ai4bharat/indicconformer-600m",
        adapted_checkpoint_path="/checkpoints/candidate_v1.pt",
        test_samples=test_samples,
        baseline_transcripts=baseline_transcripts,
        adapted_transcripts=adapted_transcripts
    )

    assert decision.decision == "APPROVED"
    assert decision.status == "PASSED_REGRESSION_GATE"
    assert decision.overall_wer_delta < 0  # Improved
    assert decision.rollback_triggered is False
    assert len(decision.regression_violations) == 0


def test_checkpoint_comparison_rejected_regression_gate(tmp_path):
    """Verifies that an adapted model with regressed WER is REJECTED and rolled back."""
    comparator = CheckpointComparator(
        max_allowed_overall_wer_regression=1.0,
        max_allowed_cs_wer_regression=2.0,
        quarantine_dir=str(tmp_path / "quarantine")
    )

    # Dummy checkpoint file
    ckpt_file = tmp_path / "bad_checkpoint.pt"
    ckpt_file.write_text("dummy model weights")

    test_samples = [
        {"id": "1", "text": "mujhe income certificate chahiye", "language": "hi-en", "is_code_switched": True},
        {"id": "2", "text": "mera annual income two lakh hai", "language": "hi-en", "is_code_switched": True},
    ]

    # Baseline was accurate
    baseline_transcripts = {
        "1": "mujhe income certificate chahiye",
        "2": "mera annual income two lakh hai",
    }

    # Adapted model severely regressed on code-switching
    adapted_transcripts = {
        "1": "mujhe something wrong",
        "2": "mera bad error two",
    }

    decision = comparator.compare_evaluations(
        baseline_model_id="ai4bharat/indicconformer-600m",
        adapted_checkpoint_path=str(ckpt_file),
        test_samples=test_samples,
        baseline_transcripts=baseline_transcripts,
        adapted_transcripts=adapted_transcripts
    )

    assert decision.decision == "REJECTED"
    assert decision.status == "FAILED_REGRESSION_GATE"
    assert decision.rollback_triggered is True
    assert len(decision.regression_violations) > 0
    assert "regressed" in decision.regression_violations[0]
    assert decision.quarantine_path is not None
    assert os.path.isdir(decision.quarantine_path)


# ---------------------------------------------------------------------------
# Readiness Check & Hardware Guardrail
# ---------------------------------------------------------------------------

def test_readiness_audit_guardrail():
    """Verifies documented readiness audit correctly flags local CPU limitation."""
    checker = ReadinessChecker()
    audit = checker.produce_full_readiness_audit()

    assert audit.model_name == "ai4bharat/indicconformer-600m"
    assert "MIT License" in audit.license
    assert "training_command" in audit.model_dump()
    assert "evaluation_command" in audit.model_dump()
    assert "rollback_procedure" in audit.model_dump()

    # Hardware audit checks
    hw = audit.hardware_audit
    assert hw.cpu_cores > 0
    assert hw.ram_gb > 0
    # On this local machine without CUDA GPU, local training must be barred
    assert hw.local_training_permitted is False
    assert hw.verdict == "INSUFFICIENT_LOCAL_HARDWARE_REMOTE_GPU_REQUIRED"


# ---------------------------------------------------------------------------
# API Endpoints Test
# ---------------------------------------------------------------------------

def test_api_readiness_endpoint():
    """Tests GET /api/fine-tuning/readiness."""
    resp = client.get("/api/fine-tuning/readiness")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_name"] == "ai4bharat/indicconformer-600m"
    assert "hardware_audit" in data
    assert data["hardware_audit"]["local_training_permitted"] is False


def test_api_task_separation_endpoint():
    """Tests GET /api/fine-tuning/task-separation."""
    resp = client.get("/api/fine-tuning/task-separation")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["pipeline_stages"]) == 3
    assert data["pipeline_stages"][0]["task"] == "speech_model_adaptation"
    assert data["pipeline_stages"][1]["task"] == "llm_adaptation"
    assert data["pipeline_stages"][2]["task"] == "tts_adaptation"


def test_api_config_template_endpoint():
    """Tests GET /api/fine-tuning/config-template."""
    resp = client.get("/api/fine-tuning/config-template")
    assert resp.status_code == 200
    data = resp.json()
    assert "configuration" in data
    assert data["configuration"]["learning_rate"] == 5e-5
    assert "train_speech_model.py" in data["cli_command"]


def test_api_compare_checkpoints_endpoint():
    """Tests POST /api/fine-tuning/compare-checkpoints."""
    payload = {
        "baseline_model": "ai4bharat/indicconformer-600m",
        "adapted_checkpoint": "/checkpoints/test_ckpt.pt",
        "test_samples": [
            {"id": "t1", "text": "hello test", "language": "en", "is_code_switched": False}
        ],
        "baseline_transcripts": {"t1": "hello test"},
        "adapted_transcripts": {"t1": "hello test"}
    }
    resp = client.post("/api/fine-tuning/compare-checkpoints", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "APPROVED"
    assert data["overall_wer_delta"] == 0.0
