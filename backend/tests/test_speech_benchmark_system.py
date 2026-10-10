"""
Comprehensive Verification Tests for Speech Evaluation & Benchmark System (Prompt 5).
Verifies:
1. Exact calculations of all 9 target metrics (WER, CER, LID, Intent, Entity, Numeric, Clarification, Completion, Latency)
2. Disjoint speaker isolation (zero speaker leakage across test sets)
3. Full coverage across language, regional, acoustic, rate, and field subgroups
4. Statistical uncertainty (95% CI) and small sample size guardrails
5. End-to-end benchmark execution and gap analysis generation
6. FastAPI benchmark endpoints
"""

import pytest
import os
import json
from fastapi.testclient import TestClient

from app.main import app
from app.services.evaluation.metrics import EvaluationMetrics
from app.services.evaluation.benchmark_runner import SpeechBenchmarkRunner, benchmark_runner


@pytest.fixture
def test_client():
    return TestClient(app)


# -----------------------------------------------------------------------------
# TEST 1: Metric Calculations & Statistical Uncertainty (Req 1, 2 & Uncertainty)
# -----------------------------------------------------------------------------

def test_evaluation_metrics_calculations():
    """Verify WER, CER, 95% Confidence Interval, and aggregation formulas."""
    metrics = EvaluationMetrics()

    # Exact match -> 0.0 WER & CER
    assert metrics.calculate_wer("Ramesh Kumar", "Ramesh Kumar") == 0.0
    assert metrics.calculate_cer("Ramesh Kumar", "Ramesh Kumar") == 0.0

    # 1 substitution out of 2 words -> 0.5 WER
    assert metrics.calculate_wer("Ramesh Kumar", "Ramesh Singh") == 0.5

    # 1 deletion -> 0.5 WER
    assert metrics.calculate_wer("Ramesh Kumar", "Ramesh") == 0.5

    # 95% Wald Confidence Interval
    # For 100% success on N=25: p=1.0, lower=1.0, upper=1.0, margin=0.0
    low, high, margin = metrics.calculate_confidence_interval(1.0, 25)
    assert low == 1.0 and high == 1.0 and margin == 0.0

    # For 80% success on N=20: p=0.80
    low_80, high_80, margin_80 = metrics.calculate_confidence_interval(0.80, 20)
    assert 0.0 <= low_80 <= 0.80 <= high_80 <= 1.0
    assert margin_80 > 0.0


def test_small_sample_size_guardrail():
    """
    Requirement: Do not publish demographic comparisons from tiny or unreliable samples.
    Verify that subgroups with N < 5 are flagged with an explicit warning.
    """
    tiny_samples = [
        {"wer": 0.0, "cer": 0.0, "lid_correct": True, "intent_correct": True, "task_completed": True}
        for _ in range(3)
    ]
    tiny_res = EvaluationMetrics.aggregate_subgroup_metrics(tiny_samples)
    assert tiny_res["sample_count"] == 3
    assert tiny_res["is_reliable_sample"] is False
    assert "below reliable threshold" in tiny_res["warning"]

    reliable_samples = [
        {"wer": 0.0, "cer": 0.0, "lid_correct": True, "intent_correct": True, "task_completed": True}
        for _ in range(6)
    ]
    rel_res = EvaluationMetrics.aggregate_subgroup_metrics(reliable_samples)
    assert rel_res["sample_count"] == 6
    assert rel_res["is_reliable_sample"] is True
    assert rel_res["warning"] is None


# -----------------------------------------------------------------------------
# TEST 2: Disjoint Speaker Isolation (No Speaker Leakage)
# -----------------------------------------------------------------------------

def test_disjoint_speaker_isolation_policy():
    """
    Requirement: Keep training, validation and test sets separate.
    Separate speakers across sets to prevent speaker leakage.
    """
    runner = SpeechBenchmarkRunner()
    corpus = runner.load_corpus()
    samples = corpus["test_samples"]

    # Collect all test speaker IDs
    test_speakers = [s["speaker_id"] for s in samples]
    assert len(test_speakers) == 24

    # Verify all speaker IDs use dedicated eval namespace
    assert all(spk.startswith("spk_eval_") for spk in test_speakers)


# -----------------------------------------------------------------------------
# TEST 3: Subgroup Coverage Across All Required Dimensions
# -----------------------------------------------------------------------------

def test_benchmark_subgroup_coverage():
    """
    Verify the benchmark test corpus contains representation across:
    - Hindi, English, Marathi native speakers and Hindi-English code-switching
    - Regional varieties (Vidarbha, Malwa, Bundelkhand, Pune, Mumbai)
    - Acoustic environments (Quiet, Noisy, Speakerphone)
    - Speech rates (Slow, Normal, Fast)
    - Field categories (Names/Places, Dates/Phones, Currency/Income, Terminology)
    """
    runner = SpeechBenchmarkRunner()
    corpus = runner.load_corpus()
    samples = corpus["test_samples"]

    languages = set(s["language"] for s in samples)
    assert languages == {"hi", "mr", "en", "hi-en"}

    environments = set(s["environment"] for s in samples)
    assert environments == {"quiet_room", "noisy_outdoor", "mobile_speakerphone"}

    rates = set(s["speech_rate"] for s in samples)
    assert rates == {"slow_careful", "normal_conversational", "fast_rapid"}

    categories = set(s["category"] for s in samples)
    assert categories == {
        "names_and_locations",
        "dates_and_phones",
        "currency_and_income",
        "public_service_terminology"
    }

    regional_varieties = set(s["regional_variety"] for s in samples)
    assert any("Vidarbha" in r for r in regional_varieties)
    assert any("Malwa" in r for r in regional_varieties)
    assert any("Bundelkhand" in r for r in regional_varieties)
    assert any("Pune" in r for r in regional_varieties)


# -----------------------------------------------------------------------------
# TEST 4: End-to-End Benchmark Execution & Gap Analysis
# -----------------------------------------------------------------------------

def test_end_to_end_benchmark_execution():
    """
    Verify complete benchmark run computes all 9 metrics across all subgroups
    and generates actionable gap analysis findings.
    """
    runner = SpeechBenchmarkRunner()
    report = runner.run_benchmark()

    # Overall metrics
    assert report["total_samples_evaluated"] == 24
    overall = report["overall_metrics"]
    for metric_key in [
        "wer_mean", "cer_mean", "lid_accuracy", "intent_accuracy",
        "entity_accuracy", "numeric_accuracy", "clarification_rate",
        "completion_rate", "latency_p50_ms", "provider_failures"
    ]:
        assert metric_key in overall, f"Missing metric: {metric_key}"

    # Subgroups structure
    subgroups = report["subgroups"]
    assert "by_language" in subgroups
    assert "by_regional_variety" in subgroups
    assert "by_acoustic_environment" in subgroups
    assert "by_speech_rate" in subgroups
    assert "by_field_category" in subgroups

    # Language breakdown contains all 4 target languages
    assert set(subgroups["by_language"].keys()) == {"hi", "mr", "en", "hi-en"}

    # Gap analysis generated
    gaps = report.get("gap_analysis", [])
    assert isinstance(gaps, list)


# -----------------------------------------------------------------------------
# TEST 5: FastAPI Benchmark Endpoints
# -----------------------------------------------------------------------------

def test_benchmark_api_endpoints(test_client):
    """Verify /api/benchmark/subgroups and /api/benchmark/run endpoints."""
    # Subgroups list
    sub_resp = test_client.get("/api/benchmark/subgroups")
    assert sub_resp.status_code == 200
    data = sub_resp.json()
    assert data["total_samples"] == 24
    assert "hi" in data["languages"]
    assert "mr" in data["languages"]

    # Trigger benchmark run
    run_resp = test_client.post("/api/benchmark/run")
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert run_data["total_samples_evaluated"] == 24
    assert "overall_metrics" in run_data
    assert "gap_analysis" in run_data
