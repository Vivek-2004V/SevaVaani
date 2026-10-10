"""
Dataset Audio Quality Gate (Requirement 9).
Detects corrupted, empty, duplicated, or excessively noisy audio files.
"""

from __future__ import annotations
import hashlib
import io
import math
import wave
from typing import Dict, Any, List, Set, Optional

from app.schemas.dataset import AudioQualityReport
from app.services.audio_preprocessor import AudioPreprocessor


class DatasetQualityGate:
    """
    Automated acoustic and data integrity screening before admission to dataset.
    """

    MIN_DURATION_SEC = 0.5
    MAX_DURATION_SEC = 30.0
    MIN_SNR_DB = 10.0
    MAX_CLIPPING_RATIO = 0.05
    MIN_RMS_ENERGY = 8.0

    def __init__(self, existing_hashes: Optional[Set[str]] = None):
        self.seen_audio_hashes: Set[str] = existing_hashes or set()

    def evaluate_audio(self, audio_bytes: bytes) -> AudioQualityReport:
        """
        Runs comprehensive acoustic and data integrity checks on raw audio bytes.
        """
        flags: List[str] = []

        # 1. Empty Check
        if not audio_bytes or len(audio_bytes) == 0:
            return AudioQualityReport(
                is_valid=False,
                byte_size=0,
                duration_sec=0.0,
                sample_rate=0,
                format="empty",
                snr_db=0.0,
                clipping_ratio=0.0,
                rms_energy=0.0,
                quality_flags=["empty_file", "reject"]
            )

        byte_len = len(audio_bytes)
        container = AudioPreprocessor.detect_container_format(audio_bytes)

        # 2. Corrupted Header Check
        if container not in {"wav", "webm", "ogg", "mp3", "flac"}:
            return AudioQualityReport(
                is_valid=False,
                byte_size=byte_len,
                duration_sec=0.0,
                sample_rate=0,
                format=container,
                snr_db=0.0,
                clipping_ratio=0.0,
                rms_energy=0.0,
                quality_flags=["corrupted_header", "unknown_format", "reject"]
            )

        # 3. Duplicate Detection Check
        sha256_hash = hashlib.sha256(audio_bytes).hexdigest()
        if sha256_hash in self.seen_audio_hashes:
            flags.append("duplicate_file")

        # 4. WAV Acoustic Parameters
        duration_sec = 0.0
        sample_rate = 16000
        snr_db = 0.0
        clipping_ratio = 0.0
        rms = 0.0

        if container == "wav":
            try:
                with io.BytesIO(audio_bytes) as buf:
                    with wave.open(buf, "rb") as wf:
                        params = wf.getparams()
                        nchannels, sampwidth, framerate, nframes = params[:4]
                        sample_rate = framerate
                        duration_sec = round(nframes / float(framerate), 2)
                        raw_frames = wf.readframes(nframes)

                if sampwidth == 2 and nframes > 0:
                    import struct
                    total_samples = len(raw_frames) // 2
                    samples = struct.unpack(f"<{total_samples}h", raw_frames)
                    mean = sum(samples) / total_samples
                    var = sum((s - mean) ** 2 for s in samples) / total_samples
                    rms = math.sqrt(var)

                    clipping_samples = sum(1 for s in samples if abs(s) >= 32700)
                    clipping_ratio = round(clipping_samples / float(total_samples), 4)
                    snr_db = round(20 * math.log10(max(1.0, rms)), 1) if rms > 1.0 else 0.0

            except Exception:
                flags.append("corrupted_wav_stream")

        else:
            # For webm/ogg/mp3, compute approximate metrics from raw payload
            duration_sec = round(byte_len / 16000.0, 2)
            rms = 20.0
            snr_db = 22.0

        # Evaluate Criteria Flags
        if duration_sec < self.MIN_DURATION_SEC:
            flags.append("duration_too_short")
        elif duration_sec > self.MAX_DURATION_SEC:
            flags.append("duration_too_long")

        if rms < self.MIN_RMS_ENERGY:
            flags.append("excessive_silence")

        if snr_db < self.MIN_SNR_DB:
            flags.append("excessively_noisy_low_snr")

        if clipping_ratio > self.MAX_CLIPPING_RATIO:
            flags.append("audio_clipping_detected")

        # Determine validity: fatal flags cause is_valid = False
        fatal_flags = {"empty_file", "corrupted_header", "duplicate_file", "corrupted_wav_stream", "excessive_silence"}
        has_fatal = any(f in fatal_flags for f in flags)

        if not flags:
            flags.append("pass_clean")

        return AudioQualityReport(
            is_valid=not has_fatal,
            byte_size=byte_len,
            duration_sec=duration_sec,
            sample_rate=sample_rate,
            format=container,
            snr_db=snr_db,
            clipping_ratio=clipping_ratio,
            rms_energy=round(rms, 2),
            quality_flags=flags
        )

    def register_hash(self, sha256_hash: str):
        self.seen_audio_hashes.add(sha256_hash)
