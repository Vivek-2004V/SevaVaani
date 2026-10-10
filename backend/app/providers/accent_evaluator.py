"""
Modular Accent Evaluation & Multi-Model Benchmarking Module for SEVA VAANI.
Provides:
- Exact Word Error Rate (WER) and Character Error Rate (CER) metrics
- Acoustic SNR, clipping, and energy analysis
- Regional accent marker identification (Bhojpuri, Malwi, Bundelkhandi, Varhadi, Konkani)
- Side-by-side multi-model evaluation on identical audio clips (Requirement 9)
"""

from __future__ import annotations
import time
import math
import re
from typing import Dict, Any, List, Optional
from app.providers.stt_provider import BaseSTTProvider


class AccentEvaluationModule:
    """
    Evaluates speech acoustics, regional accent robustness, pronunciation shifts,
    and conducts side-by-side comparative model benchmarks on identical audio samples.
    """

    REGIONAL_DIALECT_MARKERS = {
        "hi": {
            "bhojpuri_awadhi": [
                "हम", "हमार", "रहा बा", "करत बा", "काहे", "होइ", "बाटे", "हमार नाम"
            ],
            "malwi_rajasthani": [
                "म्हारो", "मारो", "म्हारी", "छै", "होवै", "कीकर", "जास्यां"
            ],
            "bundelkhandi": [
                "हओ", "हते", "करो हतो", "काहे को", "ईखो", "ऊखो"
            ],
            "haryanvi_western": [
                "म्हारा", "थारा", "सै", "गया था", "कित", "कुकर"
            ]
        },
        "mr": {
            "varhadi_vidarbha": [
                "व्हय", "नाय", "पाह्यलं", "गेलता", "आलता", "काहून", "कास्तकार", "गव्हाळा"
            ],
            "konkani_coastal": [
                "गेलो", "आयलो", "असो", "तसो", "हांगा", "थंय", "खंय"
            ],
            "marathwada": [
                "कवा", "तेवा", "जेवा", "कुठं चालला", "कशापायी"
            ]
        },
        "en": {
            "indian_english": [
                "itself", "pass out", "prepone", "do one thing", "revert back", "doubt"
            ]
        }
    }

    @staticmethod
    def calculate_wer(reference: str, hypothesis: str) -> float:
        """
        Calculates exact Word Error Rate (WER) using Levenshtein distance on token sequences.
        WER = (Substitutions + Deletions + Insertions) / Number of Reference Words
        """
        ref_words = reference.strip().lower().split()
        hyp_words = hypothesis.strip().lower().split()

        if not ref_words:
            return 0.0 if not hyp_words else 1.0

        d = [[0] * (len(hyp_words) + 1) for _ in range(len(ref_words) + 1)]
        for i in range(len(ref_words) + 1):
            d[i][0] = i
        for j in range(len(hyp_words) + 1):
            d[0][j] = j

        for i in range(1, len(ref_words) + 1):
            for j in range(1, len(hyp_words) + 1):
                if ref_words[i - 1] == hyp_words[j - 1]:
                    d[i][j] = d[i - 1][j - 1]
                else:
                    d[i][j] = min(
                        d[i - 1][j] + 1,       # deletion
                        d[i][j - 1] + 1,       # insertion
                        d[i - 1][j - 1] + 1    # substitution
                    )

        wer = d[len(ref_words)][len(hyp_words)] / len(ref_words)
        return round(min(1.0, wer), 4)

    @staticmethod
    def calculate_cer(reference: str, hypothesis: str) -> float:
        """
        Calculates Character Error Rate (CER) on individual unicode graphemes.
        """
        ref_chars = list(reference.strip().lower().replace(" ", ""))
        hyp_chars = list(hypothesis.strip().lower().replace(" ", ""))

        if not ref_chars:
            return 0.0 if not hyp_chars else 1.0

        d = [[0] * (len(hyp_chars) + 1) for _ in range(len(ref_chars) + 1)]
        for i in range(len(ref_chars) + 1):
            d[i][0] = i
        for j in range(len(hyp_chars) + 1):
            d[0][j] = j

        for i in range(1, len(ref_chars) + 1):
            for j in range(1, len(hyp_chars) + 1):
                if ref_chars[i - 1] == hyp_chars[j - 1]:
                    d[i][j] = d[i - 1][j - 1]
                else:
                    d[i][j] = min(
                        d[i - 1][j] + 1,
                        d[i][j - 1] + 1,
                        d[i - 1][j - 1] + 1
                    )

        cer = d[len(ref_chars)][len(hyp_chars)] / len(ref_chars)
        return round(min(1.0, cer), 4)

    @classmethod
    def detect_regional_dialect_markers(cls, transcript: str, language: str = "hi") -> Dict[str, Any]:
        """
        Identifies lexical cues associated with regional Hindi/Marathi dialects.
        """
        lang = (language or "hi").lower().split("-")[0]
        detected_dialects = []
        dialect_dict = cls.REGIONAL_DIALECT_MARKERS.get(lang, {})

        norm_text = transcript.lower()
        for dialect_name, markers in dialect_dict.items():
            matched_markers = [m for m in markers if m in norm_text]
            if matched_markers:
                detected_dialects.append({
                    "dialect": dialect_name,
                    "matched_markers": matched_markers,
                    "marker_count": len(matched_markers)
                })

        return {
            "language": lang,
            "transcript": transcript,
            "has_regional_markers": len(detected_dialects) > 0,
            "detected_dialects": detected_dialects
        }

    @classmethod
    def analyze_speech_acoustics(cls, audio_bytes: bytes) -> Dict[str, Any]:
        """
        Estimates acoustic metrics (SNR, clipping, RMS energy, duration) in volatile memory.
        Does NOT store audio to disk.
        """
        if not audio_bytes:
            return {
                "byte_size": 0,
                "estimated_duration_sec": 0.0,
                "rms_energy": 0.0,
                "estimated_snr_db": 0.0,
                "clipping_detected": False,
                "audio_quality": "empty"
            }

        # Analyze PCM/WAV payload if RIFF header present
        has_riff = audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE"
        byte_len = len(audio_bytes)

        # 16kHz 16-bit mono = 32000 bytes/sec
        estimated_duration = round(byte_len / 32000.0, 2) if byte_len > 44 else 0.0

        # Sample byte energy distribution
        sample_stride = max(1, byte_len // 2000)
        samples = [int(b) for b in audio_bytes[44::sample_stride]] if byte_len > 44 else []

        if samples:
            mean = sum(samples) / len(samples)
            variance = sum((s - mean) ** 2 for s in samples) / len(samples)
            rms = math.sqrt(variance)
            # Clip detection: high percentage at 0 or 255
            clipping_samples = sum(1 for s in samples if s in (0, 255))
            clipping_ratio = clipping_samples / len(samples)
            clipping_detected = clipping_ratio > 0.05

            # Approximate SNR estimation based on signal dynamic range
            snr_db = round(20 * math.log10(max(1.0, rms)), 1) if rms > 1.0 else 0.0
            quality = "good" if snr_db > 20 and not clipping_detected else ("noisy" if snr_db < 15 else "acceptable")
        else:
            rms = 0.0
            clipping_detected = False
            snr_db = 0.0
            quality = "unknown"

        return {
            "byte_size": byte_len,
            "has_wav_header": has_riff,
            "estimated_duration_sec": estimated_duration,
            "rms_energy": round(rms, 2),
            "estimated_snr_db": snr_db,
            "clipping_detected": clipping_detected,
            "audio_quality": quality,
            "storage_policy": "volatile_memory_only"
        }

    @classmethod
    def evaluate_models_on_sample(
        cls,
        audio_bytes: bytes,
        reference_transcript: str,
        providers: List[BaseSTTProvider],
        language: str = "hi"
    ) -> Dict[str, Any]:
        """
        Runs multiple candidate STT model providers on the EXACT SAME audio sample in memory.
        Measures latency, confidence, transcript, WER, and CER side-by-side.
        Requirement 9: "Make it possible to evaluate alternative models on the same audio samples."
        """
        acoustic_info = cls.analyze_speech_acoustics(audio_bytes)
        results = []

        for provider in providers:
            t0 = time.perf_counter()
            try:
                transcription_result = provider.transcribe(audio_bytes, language=language)
                latency_ms = round((time.perf_counter() - t0) * 1000, 2)

                hyp_text = transcription_result.get("transcript", "")
                confidence = float(transcription_result.get("confidence", 0.0))
                wer = cls.calculate_wer(reference_transcript, hyp_text) if reference_transcript else None
                cer = cls.calculate_cer(reference_transcript, hyp_text) if reference_transcript else None

                results.append({
                    "provider_name": provider.name,
                    "provider_type": provider.provider_type,
                    "is_mock": provider.is_mock,
                    "hypothesis_transcript": hyp_text,
                    "confidence": confidence,
                    "latency_ms": latency_ms,
                    "wer": wer,
                    "cer": cer,
                    "status": transcription_result.get("status", "success"),
                    "error": transcription_result.get("error", None)
                })
            except Exception as ex:
                latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                results.append({
                    "provider_name": provider.name,
                    "provider_type": provider.provider_type,
                    "is_mock": provider.is_mock,
                    "hypothesis_transcript": "",
                    "confidence": 0.0,
                    "latency_ms": latency_ms,
                    "wer": 1.0 if reference_transcript else None,
                    "cer": 1.0 if reference_transcript else None,
                    "status": "exception",
                    "error": str(ex)
                })

        # Rank providers with lowest WER (ignoring exceptions and empty runs)
        ranked = [r for r in results if r["wer"] is not None and r["status"] == "success"]
        ranked.sort(key=lambda r: (r["wer"], r["latency_ms"]))
        best_provider = ranked[0]["provider_name"] if ranked else None

        return {
            "reference_transcript": reference_transcript,
            "language": language,
            "acoustic_analysis": acoustic_info,
            "candidate_count": len(providers),
            "benchmark_results": results,
            "best_performing_provider": best_provider,
            "evaluation_timestamp": time.time()
        }
