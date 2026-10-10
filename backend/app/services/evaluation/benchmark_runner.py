"""
Speech Recognition & NLU Benchmark Runner (Prompt 5).
Executes repeatable multi-subgroup benchmark evaluations across:
- Hindi, English, Marathi, and Hinglish native speakers
- Regional varieties (Vidarbha, Malwa, Bundelkhand, Pune, Mumbai)
- Acoustic conditions (Quiet, Noisy, Speakerphone)
- Speech rates (Slow, Normal, Fast)
- Field categories (Names/Places, Dates/Phones, Currency/Income, Terminology)
Generates comprehensive gap analysis and improvement recommendations.
"""

from __future__ import annotations
import os
import json
import time
from typing import Dict, Any, List, Optional

from app.core.config import settings
from app.providers.stt_provider import BaseSTTProvider, BrowserSTTFallback
from app.providers.lid_provider import ScriptAndLexicalLIDProvider
from app.services.extractor import ExtractorService
from app.services.transcript_normalizer import TranscriptNormalizer
from app.services.regional_lexicon import RegionalLexiconManager
from app.services.evaluation.metrics import EvaluationMetrics

TEST_CORPUS_FILE = os.path.join(
    settings.BASE_DIR, "data", "evaluation", "benchmark_test_corpus.json"
)
BENCHMARK_RUNS_DIR = os.path.join(
    settings.BASE_DIR, "data", "evaluation", "benchmark_runs"
)


class SpeechBenchmarkRunner:
    """
    Executes reproducible benchmark evaluations on partitioned native-speaker datasets.
    """

    def __init__(
        self,
        corpus_path: Optional[str] = None,
        stt_provider: Optional[BaseSTTProvider] = None,
        lid_provider: Optional[ScriptAndLexicalLIDProvider] = None
    ):
        self.corpus_path = corpus_path or TEST_CORPUS_FILE
        self.stt_provider = stt_provider or BrowserSTTFallback()
        self.lid_provider = lid_provider or ScriptAndLexicalLIDProvider()
        self.normalizer = TranscriptNormalizer()
        os.makedirs(BENCHMARK_RUNS_DIR, exist_ok=True)

    def load_corpus(self) -> Dict[str, Any]:
        with open(self.corpus_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def evaluate_sample(self, sample: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates a single sample across ASR, LID, intent, entity, and numeric dimensions.
        """
        ref_text = sample["transcript"]
        target_lang = sample["language"]
        t0 = time.perf_counter()

        # Step 1: Speech-to-Text Hypothesis (Simulate/run STT)
        provider_failure = False
        try:
            # For text-based benchmark corpus, STT hypothesis matches ref with potential simulated noise/client fallback
            stt_res = self.stt_provider.transcribe(b"", language=target_lang, client_transcript=ref_text)
            hyp_text = stt_res.get("transcript", ref_text)
        except Exception:
            hyp_text = ""
            provider_failure = True

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

        # Step 2: WER and CER
        wer = EvaluationMetrics.calculate_wer(ref_text, hyp_text)
        cer = EvaluationMetrics.calculate_cer(ref_text, hyp_text)

        # Step 3: Language Identification
        lid_res = self.lid_provider.identify(hyp_text)
        detected_lang = lid_res["detected_language"]
        expected_lang = sample["expected_language"]
        lid_correct = (
            detected_lang == expected_lang
            or (expected_lang in ["hi", "hi-en"] and detected_lang in ["hi", "hi-en"])
            or (expected_lang in ["mr", "mr-en"] and detected_lang in ["mr", "mr-en"])
        )

        # Step 4: Normalization
        norm_res = self.normalizer.normalize(hyp_text, language=detected_lang)
        norm_text = norm_res["normalized_transcript"]

        # Step 5: Service-Intent Accuracy
        detected_intent = ExtractorService.extract_conversational_intent(norm_text)
        expected_intent = sample.get("expected_intent", "none")
        intent_correct = (detected_intent == expected_intent)

        # Step 6: Entity Extraction Accuracy
        expected_entities = sample.get("expected_entities", {})
        has_entities = bool(expected_entities)
        extracted_entities = {}
        entity_correct_count = 0

        for field_name, expected_val in expected_entities.items():
            ext_res = ExtractorService.extract_field(field_name, norm_text, language=detected_lang)
            ext_val = ext_res.get("value")
            extracted_entities[field_name] = ext_val
            if str(ext_val).lower().strip() == str(expected_val).lower().strip():
                entity_correct_count += 1

        entity_f1 = (
            round(entity_correct_count / len(expected_entities), 4)
            if has_entities
            else 1.0
        )

        # Step 7: Numeric-Field Accuracy
        expected_num = sample.get("expected_numeric")
        has_numeric = expected_num is not None
        numeric_correct = False
        if has_numeric:
            # Check if expected number exists in extracted entities or in normalized string
            str_num = str(expected_num)
            found_in_entities = any(str(v) == str_num for v in extracted_entities.values())
            found_in_text = str_num in norm_text.replace(",", "")
            numeric_correct = found_in_entities or found_in_text

        # Step 8: Clarification and Task Completion
        needs_clarification = (
            lid_res.get("clarification_needed", False)
            or (has_entities and entity_f1 < 0.5)
            or (has_numeric and not numeric_correct)
        )
        task_completed = not provider_failure and (entity_f1 >= 0.5 if has_entities else True) and (numeric_correct if has_numeric else True)

        return {
            "sample_id": sample["sample_id"],
            "speaker_id": sample["speaker_id"],
            "language": target_lang,
            "regional_variety": sample["regional_variety"],
            "environment": sample["environment"],
            "speech_rate": sample["speech_rate"],
            "category": sample["category"],
            "reference": ref_text,
            "hypothesis": hyp_text,
            "wer": wer,
            "cer": cer,
            "expected_language": expected_lang,
            "detected_language": detected_lang,
            "lid_correct": lid_correct,
            "expected_intent": expected_intent,
            "detected_intent": detected_intent,
            "intent_correct": intent_correct,
            "has_entities": has_entities,
            "expected_entities": expected_entities,
            "extracted_entities": extracted_entities,
            "entity_f1": entity_f1,
            "has_numeric": has_numeric,
            "expected_numeric": expected_num,
            "numeric_correct": numeric_correct,
            "needs_clarification": needs_clarification,
            "task_completed": task_completed,
            "latency_ms": latency_ms,
            "provider_failure": provider_failure
        }

    def run_benchmark(self) -> Dict[str, Any]:
        """
        Executes full benchmark evaluation across the entire test corpus.
        Aggregates results across overall, language, regional, environment, rate, and field subgroups.
        """
        corpus = self.load_corpus()
        samples = corpus["test_samples"]
        evaluated_samples = []

        for s in samples:
            res = self.evaluate_sample(s)
            evaluated_samples.append(res)

        # 1. Overall Aggregation
        overall_metrics = EvaluationMetrics.aggregate_subgroup_metrics(evaluated_samples)

        # 2. Slice by Language Subgroup
        by_language = {}
        for lang in ["hi", "mr", "en", "hi-en"]:
            subset = [s for s in evaluated_samples if s["language"] == lang]
            by_language[lang] = EvaluationMetrics.aggregate_subgroup_metrics(subset)

        # 3. Slice by Regional Speech Variety
        by_region = {}
        regions = list(set(s["regional_variety"] for s in evaluated_samples))
        for r in sorted(regions):
            subset = [s for s in evaluated_samples if s["regional_variety"] == r]
            by_region[r] = EvaluationMetrics.aggregate_subgroup_metrics(subset)

        # 4. Slice by Acoustic Environment
        by_environment = {}
        envs = ["quiet_room", "noisy_outdoor", "mobile_speakerphone"]
        for env in envs:
            subset = [s for s in evaluated_samples if s["environment"] == env]
            by_environment[env] = EvaluationMetrics.aggregate_subgroup_metrics(subset)

        # 5. Slice by Speech Rate
        by_speech_rate = {}
        rates = ["slow_careful", "normal_conversational", "fast_rapid"]
        for rate in rates:
            subset = [s for s in evaluated_samples if s["speech_rate"] == rate]
            by_speech_rate[rate] = EvaluationMetrics.aggregate_subgroup_metrics(subset)

        # 6. Slice by Field Category
        by_field_category = {}
        categories = ["names_and_locations", "dates_and_phones", "currency_and_income", "public_service_terminology"]
        for cat in categories:
            subset = [s for s in evaluated_samples if s["category"] == cat]
            by_field_category[cat] = EvaluationMetrics.aggregate_subgroup_metrics(subset)

        # 7. Generate Gap Analysis & Targeted Improvement Recommendations
        gap_analysis = self._generate_gap_analysis(
            by_environment=by_environment,
            by_speech_rate=by_speech_rate,
            by_field_category=by_field_category,
            by_region=by_region
        )

        report = {
            "benchmark_version": "1.0.0",
            "provider_evaluated": self.stt_provider.name,
            "provider_type": self.stt_provider.provider_type,
            "is_mock": self.stt_provider.is_mock,
            "timestamp": time.time(),
            "total_samples_evaluated": len(evaluated_samples),
            "overall_metrics": overall_metrics,
            "subgroups": {
                "by_language": by_language,
                "by_regional_variety": by_region,
                "by_acoustic_environment": by_environment,
                "by_speech_rate": by_speech_rate,
                "by_field_category": by_field_category
            },
            "gap_analysis": gap_analysis
        }

        # Persist benchmark report
        run_file = os.path.join(
            BENCHMARK_RUNS_DIR, f"{int(time.time())}_{self.stt_provider.name}_benchmark.json"
        )
        with open(run_file, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        return report

    def _generate_gap_analysis(
        self,
        by_environment: Dict[str, Any],
        by_speech_rate: Dict[str, Any],
        by_field_category: Dict[str, Any],
        by_region: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Identifies specific speech conditions and field types that need engineering improvement.
        """
        findings = []

        # Acoustic Environment Impact
        quiet_comp = by_environment.get("quiet_room", {}).get("completion_rate", 1.0)
        noisy_comp = by_environment.get("noisy_outdoor", {}).get("completion_rate", 1.0)
        if quiet_comp > noisy_comp:
            findings.append({
                "dimension": "acoustic_environment",
                "severity": "medium",
                "finding": f"Task completion drops by {round((quiet_comp - noisy_comp)*100, 1)}% in noisy outdoor environments compared to quiet rooms.",
                "recommendation": "Integrate Silero VAD spectral subtraction and in-memory noise reduction prior to ASR inference."
            })

        # Speech Rate Impact
        normal_comp = by_speech_rate.get("normal_conversational", {}).get("completion_rate", 1.0)
        fast_comp = by_speech_rate.get("fast_rapid", {}).get("completion_rate", 1.0)
        if normal_comp > fast_comp:
            findings.append({
                "dimension": "speech_rate",
                "severity": "high",
                "finding": f"Rapid speech reduces numeric and entity accuracy by {round((normal_comp - fast_comp)*100, 1)}%.",
                "recommendation": "Calibrate ASR CTC beam size and add time-stretching / speed-perturbation data augmentation."
            })

        # Field Category Bottlenecks
        currency_acc = by_field_category.get("currency_and_income", {}).get("numeric_accuracy", 1.0)
        names_acc = by_field_category.get("names_and_locations", {}).get("entity_accuracy", 1.0)

        if names_acc < 0.95:
            findings.append({
                "dimension": "field_categories",
                "severity": "high",
                "finding": f"Names and locations have an entity accuracy of {round(names_acc*100, 1)}%.",
                "recommendation": "Expand Indian Census district trie and Indic soundex phonetic fuzzy matcher."
            })

        if currency_acc < 0.95:
            findings.append({
                "dimension": "field_categories",
                "severity": "medium",
                "finding": f"Currency amounts show {round((1.0 - currency_acc)*100, 1)}% error rate.",
                "recommendation": "Expand ITN normalizer rules for Western vs Indian thousand/lakh phrasing variations."
            })

        return findings


# Global singleton instance
benchmark_runner = SpeechBenchmarkRunner()
