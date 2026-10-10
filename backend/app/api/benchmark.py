"""
Speech Benchmark API Router for SEVA VAANI (Prompt 5).
Provides endpoints to trigger repeatable benchmark runs and retrieve subgroup metrics.
"""

from __future__ import annotations
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.evaluation.benchmark_runner import benchmark_runner

router = APIRouter(prefix="/api/benchmark", tags=["Speech Evaluation & Benchmarks"])


class RunBenchmarkRequest(BaseModel):
    provider_name: Optional[str] = Field("browser_native", description="STT provider to benchmark")


@router.post("/run")
def trigger_benchmark_run(payload: Optional[RunBenchmarkRequest] = None) -> Dict[str, Any]:
    """
    Executes a reproducible benchmark evaluation across the entire partitioned test corpus.
    Measures WER, CER, LID, intent, entity, numeric accuracy, latency, and returns gap analysis.
    """
    return benchmark_runner.run_benchmark()


@router.get("/subgroups")
def list_benchmark_subgroups() -> Dict[str, Any]:
    """
    Lists all evaluation subgroups and sample distributions.
    """
    corpus = benchmark_runner.load_corpus()
    samples = corpus.get("test_samples", [])

    return {
        "corpus_version": corpus.get("benchmark_corpus_metadata", {}).get("version", "1.0.0"),
        "total_samples": len(samples),
        "languages": list(set(s["language"] for s in samples)),
        "regional_varieties": list(set(s["regional_variety"] for s in samples)),
        "environments": list(set(s["environment"] for s in samples)),
        "speech_rates": list(set(s["speech_rate"] for s in samples)),
        "categories": list(set(s["category"] for s in samples))
    }
