"""
Consent-Based Native Speaker Dataset Pipeline Orchestrator (Prompt 3).
Coordinates pseudonymization, consent verification, audio quality screening,
transcript human review validation, restricted storage, and versioned manifest management.
"""

from __future__ import annotations
import os
import json
import time
import uuid
import hashlib
from typing import Dict, Any, List, Optional, Literal

from app.core.config import settings
from app.schemas.dataset import DatasetSample, LanguageSegment
from app.services.dataset.pseudonymizer import SpeakerPseudonymizer
from app.services.dataset.consent_manager import ConsentManager
from app.services.dataset.quality_gate import DatasetQualityGate
from app.services.dataset.transcript_verifier import TranscriptVerifier

CORPUS_ROOT = os.path.join(settings.BASE_DIR, "data", "speech_corpus")
AUDIO_STORAGE_DIR = os.path.join(CORPUS_ROOT, "audio")
MANIFESTS_DIR = os.path.join(CORPUS_ROOT, "manifests")


class DatasetPipeline:
    """
    Production-grade dataset pipeline enforcing consent, privacy, quality,
    and versioned split curation for Indic ASR.
    """

    DATASET_VERSION = "1.0.0"
    ANNOTATION_VERSION = "v1.0"

    def __init__(
        self,
        corpus_dir: Optional[str] = None,
        pseudonymizer: Optional[SpeakerPseudonymizer] = None,
        consent_manager: Optional[ConsentManager] = None
    ):
        self.corpus_dir = corpus_dir or CORPUS_ROOT
        self.audio_dir = os.path.join(self.corpus_dir, "audio")
        self.manifests_dir = os.path.join(self.corpus_dir, "manifests")
        os.makedirs(self.audio_dir, exist_ok=True)
        os.makedirs(self.manifests_dir, exist_ok=True)

        self.pseudonymizer = pseudonymizer or SpeakerPseudonymizer()
        self.consent_manager = consent_manager or ConsentManager()
        self.quality_gate = DatasetQualityGate()
        self._init_hash_index()

    def _get_manifest_path(self, split: str) -> str:
        return os.path.join(self.manifests_dir, f"manifest_{split}.jsonl")

    def _init_hash_index(self):
        """Pre-populates quality gate with existing audio hashes to prevent duplicates."""
        for split in ["train", "validation", "test", "quarantine"]:
            p = self._get_manifest_path(split)
            if os.path.isfile(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        for line in f:
                            if line.strip():
                                rec = json.loads(line)
                                if "audio_hash_sha256" in rec:
                                    self.quality_gate.register_hash(rec["audio_hash_sha256"])
                except Exception:
                    pass

    def ingest_sample(
        self,
        speaker_real_token: str,
        audio_bytes: bytes,
        verified_transcript: str,
        language: str = "hi",
        self_reported_region: Optional[str] = None,
        self_reported_dialect: Optional[str] = None,
        recording_environment: str = "quiet_room",
        reviewer_status: Literal["pending", "verified", "rejected"] = "verified",
        consent_acknowledged: bool = True,
        split_preference: Literal["train", "validation", "test"] = "train"
    ) -> Dict[str, Any]:
        """
        Ingests a new speech sample through the rigorous 5-step safety & quality pipeline:
        1. Consent verification
        2. Pseudonymization
        3. Audio quality gate (empty, duplicate, corruption, noise, clipping)
        4. Transcript human-verification & code-switching analysis
        5. Routing to verified split or quarantine
        """
        now = time.time()
        recording_id = str(uuid.uuid4())

        # Step 1: Pseudonymize Speaker Identity (Requirement 2 & 4)
        speaker_id = self.pseudonymizer.generate_pseudonymous_id(speaker_real_token)

        # Step 2: Informed Consent Verification (Requirement 1, 7 & 8)
        if consent_acknowledged and not self.consent_manager.has_active_consent(speaker_id):
            self.consent_manager.record_consent(speaker_id)

        has_consent = self.consent_manager.has_active_consent(speaker_id)
        if not has_consent:
            return {
                "success": False,
                "error": "Consent missing or revoked. Recordings without active consent are strictly rejected (Requirement 8).",
                "recording_id": None,
                "status": "rejected_no_consent"
            }

        # Step 3: Audio Quality Screening (Requirement 9)
        quality_rep = self.quality_gate.evaluate_audio(audio_bytes)
        audio_hash = hashlib.sha256(audio_bytes).hexdigest()

        # Step 4: Transcript Verification & Code-Switching Segmentation (Requirements 10 & 11)
        is_trans_valid, trans_errors, segments = TranscriptVerifier.validate_for_training_split(
            transcript=verified_transcript,
            reviewer_status=reviewer_status,
            primary_language=language
        )

        # Step 5: Determine Split (Quarantine vs Verified Train/Val/Test)
        quality_passed = quality_rep.is_valid
        target_split: Literal["train", "validation", "test", "quarantine"] = "quarantine"

        if quality_passed and is_trans_valid and has_consent:
            target_split = split_preference
            self.quality_gate.register_hash(audio_hash)
        else:
            target_split = "quarantine"

        # Step 6: Secure Storage (Requirement 3: Restricted Access Storage)
        lang_dir = os.path.join(self.audio_dir, language)
        os.makedirs(lang_dir, exist_ok=True)
        filename = f"{recording_id}.{quality_rep.format if quality_rep.format != 'unknown' else 'bin'}"
        storage_rel_path = os.path.join("audio", language, filename)
        storage_abs_path = os.path.join(self.audio_dir, language, filename)

        with open(storage_abs_path, "wb") as f:
            f.write(audio_bytes)
        # Restrict permissions (0600 - owner read/write only)
        try:
            os.chmod(storage_abs_path, 0o600)
        except Exception:
            pass

        # Step 7: Build Structured Sample Record (Requirement 6 & 12)
        all_flags = list(set(quality_rep.quality_flags + trans_errors))

        sample = DatasetSample(
            recording_id=recording_id,
            speaker_id_pseudonymous=speaker_id,
            language=language,
            self_reported_region_optional=self_reported_region,
            self_reported_dialect_optional=self_reported_dialect,
            recording_environment=recording_environment,
            audio_path=storage_rel_path,
            audio_format=quality_rep.format,
            sample_rate=quality_rep.sample_rate,
            duration_sec=quality_rep.duration_sec,
            audio_hash_sha256=audio_hash,
            raw_transcript=verified_transcript,
            verified_transcript=verified_transcript,
            transcript_language_segments=segments,
            transcription_reviewer_status=reviewer_status,
            consent_status="active",
            license_type="Consent-Restricted Research & Public Service Agreement",
            dataset_split=target_split,
            quality_flags=all_flags,
            dataset_version=self.DATASET_VERSION,
            annotation_version=self.ANNOTATION_VERSION,
            created_at=now,
            updated_at=now
        )

        # Step 8: Append to Split Manifest
        self._append_to_manifest(target_split, sample.dict())

        return {
            "success": True,
            "recording_id": recording_id,
            "speaker_id_pseudonymous": speaker_id,
            "dataset_split": target_split,
            "quality_flags": all_flags,
            "audio_duration_sec": quality_rep.duration_sec,
            "segments_count": len(segments),
            "status": "admitted" if target_split != "quarantine" else "quarantined"
        }

    def _append_to_manifest(self, split: str, record: Dict[str, Any]):
        manifest_path = self._get_manifest_path(split)
        with open(manifest_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    def withdraw_speaker_and_purge(
        self,
        speaker_real_token: str,
        purge_audio_files: bool = True
    ) -> Dict[str, Any]:
        """
        Requirement 5: Complete withdrawal & deletion workflow (Right to be Forgotten).
        Quarantines or permanently deletes all records belonging to this speaker.
        Rewrites manifests to ensure zero contamination of training data.
        """
        speaker_id = self.pseudonymizer.generate_pseudonymous_id(speaker_real_token)
        self.consent_manager.withdraw_consent(speaker_id)

        purged_count = 0
        deleted_files = 0

        # Scan and purge from all active splits
        for split in ["train", "validation", "test"]:
            manifest_path = self._get_manifest_path(split)
            if not os.path.isfile(manifest_path):
                continue

            retained_records = []
            with open(manifest_path, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.strip():
                        continue
                    rec = json.loads(line)
                    if rec.get("speaker_id_pseudonymous") == speaker_id:
                        purged_count += 1
                        if purge_audio_files and "audio_path" in rec:
                            abs_p = os.path.join(self.corpus_dir, rec["audio_path"])
                            if os.path.isfile(abs_p):
                                try:
                                    os.remove(abs_p)
                                    deleted_files += 1
                                except Exception:
                                    pass
                        # Move to quarantine with revoked status
                        rec["consent_status"] = "withdrawn"
                        rec["dataset_split"] = "quarantine"
                        rec["quality_flags"].append("consent_withdrawn")
                        rec["updated_at"] = time.time()
                        self._append_to_manifest("quarantine", rec)
                    else:
                        retained_records.append(rec)

            # Rewrite clean manifest
            with open(manifest_path, "w", encoding="utf-8") as f:
                for r in retained_records:
                    f.write(json.dumps(r, ensure_ascii=False) + "\n")

        return {
            "speaker_id_pseudonymous": speaker_id,
            "purged_records_count": purged_count,
            "deleted_files_count": deleted_files,
            "status": "withdrawn_and_quarantined",
            "message": f"Successfully removed {purged_count} samples from training splits."
        }

    def get_corpus_statistics(self) -> Dict[str, Any]:
        """
        Generates aggregated telemetry on corpus splits, languages, and regional distribution.
        """
        stats = {
            "dataset_version": self.DATASET_VERSION,
            "annotation_version": self.ANNOTATION_VERSION,
            "total_samples": 0,
            "total_duration_hours": 0.0,
            "splits": {"train": 0, "validation": 0, "test": 0, "quarantine": 0},
            "languages": {},
            "regions": {},
            "dialects": {},
            "active_consent_speakers": 0
        }

        total_sec = 0.0
        unique_speakers = set()

        for split in ["train", "validation", "test", "quarantine"]:
            p = self._get_manifest_path(split)
            if not os.path.isfile(p):
                continue
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.strip():
                        continue
                    rec = json.loads(line)
                    stats["total_samples"] += 1
                    stats["splits"][split] += 1
                    total_sec += float(rec.get("duration_sec", 0.0))
                    unique_speakers.add(rec.get("speaker_id_pseudonymous"))

                    # Languages
                    lang = rec.get("language", "unknown")
                    stats["languages"][lang] = stats["languages"].get(lang, 0) + 1

                    # Regions
                    reg = rec.get("self_reported_region_optional")
                    if reg:
                        stats["regions"][reg] = stats["regions"].get(reg, 0) + 1

                    # Dialects
                    dia = rec.get("self_reported_dialect_optional")
                    if dia:
                        stats["dialects"][dia] = stats["dialects"].get(dia, 0) + 1

        stats["total_duration_hours"] = round(total_sec / 3600.0, 3)
        stats["unique_pseudonymous_speakers"] = len(unique_speakers)
        return stats


# Global dataset pipeline instance
dataset_pipeline = DatasetPipeline()
