"""
Evaluation Metrics Engine for Speech & NLU Benchmarking (Prompt 5).
Computes:
1. Word Error Rate (WER)
2. Character Error Rate (CER)
3. Language Identification Accuracy
4. Service-Intent Accuracy
5. Important Entity Extraction Accuracy
6. Numeric-Field Accuracy
7. Clarification Rate
8. End-to-End Task Completion Rate
9. Latency (p50, p95, mean) and Provider Failures
With statistical uncertainty (95% CI) and small sample size guardrails.
"""

from __future__ import annotations
import math
from typing import Dict, Any, List, Optional, Tuple


class EvaluationMetrics:
    """
    Computes rigorous speech recognition, NLU, and conversational task metrics.
    """

    MIN_RELIABLE_SAMPLE_SIZE = 5

    @staticmethod
    def calculate_wer(reference: str, hypothesis: str) -> float:
        """
        Calculates exact Word Error Rate using Levenshtein dynamic programming.
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
        Calculates Character Error Rate on unicode graphemes.
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

    @staticmethod
    def calculate_confidence_interval(success_rate: float, sample_count: int) -> Tuple[float, float, float]:
        """
        Computes 95% Wald confidence interval for binomial proportions.
        Returns: (lower_bound, upper_bound, margin_of_error)
        """
        if sample_count <= 0:
            return 0.0, 0.0, 0.0

        p = max(0.0, min(1.0, success_rate))
        se = math.sqrt((p * (1.0 - p)) / sample_count)
        margin = round(1.96 * se, 4)
        lower = round(max(0.0, p - margin), 4)
        upper = round(min(1.0, p + margin), 4)
        return lower, upper, margin

    @classmethod
    def aggregate_subgroup_metrics(cls, sample_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Aggregates all 9 core benchmark metrics over a set of evaluated sample runs.
        """
        n = len(sample_results)
        if n == 0:
            return {
                "sample_count": 0,
                "is_reliable_sample": False,
                "wer_mean": 0.0,
                "cer_mean": 0.0,
                "lid_accuracy": 0.0,
                "intent_accuracy": 0.0,
                "entity_accuracy": 0.0,
                "numeric_accuracy": 0.0,
                "clarification_rate": 0.0,
                "completion_rate": 0.0,
                "latency_p50_ms": 0.0,
                "latency_p95_ms": 0.0,
                "provider_failures": 0
            }

        # WER & CER
        wer_list = [float(s.get("wer", 0.0)) for s in sample_results]
        cer_list = [float(s.get("cer", 0.0)) for s in sample_results]
        wer_mean = round(sum(wer_list) / n, 4)
        cer_mean = round(sum(cer_list) / n, 4)

        # Accuracy tallies
        lid_hits = sum(1 for s in sample_results if s.get("lid_correct", False))
        intent_hits = sum(1 for s in sample_results if s.get("intent_correct", False))
        entity_scores = [float(s.get("entity_f1", 1.0)) for s in sample_results if s.get("has_entities", False)]
        numeric_scores = [1.0 if s.get("numeric_correct", False) else 0.0 for s in sample_results if s.get("has_numeric", False)]

        lid_acc = round(lid_hits / n, 4)
        intent_acc = round(intent_hits / n, 4)
        entity_acc = round(sum(entity_scores) / len(entity_scores), 4) if entity_scores else 1.0
        numeric_acc = round(sum(numeric_scores) / len(numeric_scores), 4) if numeric_scores else 1.0

        # Clarification & Task Completion
        clarification_hits = sum(1 for s in sample_results if s.get("needs_clarification", False))
        clarification_rate = round(clarification_hits / n, 4)
        completion_hits = sum(1 for s in sample_results if s.get("task_completed", True))
        completion_rate = round(completion_hits / n, 4)

        # Latency & Failures
        latencies = sorted([float(s.get("latency_ms", 0.0)) for s in sample_results])
        p50_idx = int(0.50 * n)
        p95_idx = min(n - 1, int(0.95 * n))
        p50_lat = latencies[p50_idx] if latencies else 0.0
        p95_lat = latencies[p95_idx] if latencies else 0.0
        failures = sum(1 for s in sample_results if s.get("provider_failure", False))

        # 95% Confidence Interval for Task Completion
        lower_ci, upper_ci, margin = cls.calculate_confidence_interval(completion_rate, n)

        is_reliable = n >= cls.MIN_RELIABLE_SAMPLE_SIZE

        return {
            "sample_count": n,
            "is_reliable_sample": is_reliable,
            "warning": None if is_reliable else f"Sample size (N={n}) is below reliable threshold ({cls.MIN_RELIABLE_SAMPLE_SIZE}). Demographic conclusions should not be published.",
            "wer_mean": wer_mean,
            "cer_mean": cer_mean,
            "lid_accuracy": lid_acc,
            "intent_accuracy": intent_acc,
            "entity_accuracy": entity_acc,
            "numeric_accuracy": numeric_acc,
            "clarification_rate": clarification_rate,
            "completion_rate": completion_rate,
            "completion_rate_95_ci": [lower_ci, upper_ci],
            "ci_margin_error": margin,
            "latency_p50_ms": p50_lat,
            "latency_p95_ms": p95_lat,
            "provider_failures": failures
        }
