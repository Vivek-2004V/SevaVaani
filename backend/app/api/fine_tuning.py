"""
Fine-Tuning & Speech Adaptation API Endpoints (SV-ASR-FT-009).
Provides inspection endpoints for readiness checks, task separation architecture,
manifest preparation, configuration generation, and checkpoint regression comparisons.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, Body

from app.services.fine_tuning.readiness_checker import ReadinessChecker, FineTuningReadinessAudit
from app.services.fine_tuning.task_separation import AdaptationPipelineSeparation
from app.services.fine_tuning.training_config import SpeechTrainingConfig
from app.services.fine_tuning.manifest_preparer import ManifestPreparer
from app.services.fine_tuning.checkpoint_comparator import CheckpointComparator, RegressionGateDecision

router = APIRouter(prefix="/api/fine-tuning", tags=["Speech Model Fine-Tuning"])


@router.get("/readiness", response_model=FineTuningReadinessAudit)
async def get_fine_tuning_readiness():
    """
    Returns documented readiness check listing model metadata, license, hardware requirements,
    dataset size & quality criteria, estimated compute needs, and rollback procedure.
    Blocks unsafe local training on CPU hosts.
    """
    checker = ReadinessChecker()
    return checker.produce_full_readiness_audit()


@router.get("/task-separation")
async def get_task_separation():
    """
    Returns explicit architecture contracts separating Speech Adaptation, LLM Adaptation, and TTS Adaptation.
    """
    pipeline = AdaptationPipelineSeparation()
    return pipeline.describe_separation()


@router.get("/config-template")
async def get_config_template():
    """
    Returns default configurable training hyperparameters and CLI launch command.
    """
    cfg = SpeechTrainingConfig()
    return {
        "configuration": cfg.to_dict(),
        "cli_command": cfg.generate_cli_command()
    }


@router.post("/prepare-manifests")
async def prepare_manifests(
    train_ratio: float = Query(0.70, ge=0.5, le=0.9),
    val_ratio: float = Query(0.15, ge=0.05, le=0.3),
    test_ratio: float = Query(0.15, ge=0.05, le=0.3)
):
    """
    Validates audio format, normalizes transcripts, and partitions the corpus into
    train, validation, and held-out test splits with strict disjoint speaker separation.
    """
    preparer = ManifestPreparer()
    summary = preparer.prepare_manifests_from_corpus(
        train_ratio=train_ratio,
        val_ratio=val_ratio,
        test_ratio=test_ratio
    )
    return summary


@router.post("/compare-checkpoints", response_model=RegressionGateDecision)
async def compare_checkpoints(
    payload: Dict[str, Any] = Body(...)
):
    """
    Compares adapted checkpoint against baseline on disjoint test sets.
    Evaluates native-speaker and code-switching groups independently.
    Rejects adapted checkpoint if it causes unacceptable regressions.
    """
    baseline_id = payload.get("baseline_model", "ai4bharat/indicconformer-600m")
    checkpoint_path = payload.get("adapted_checkpoint", "./data/fine_tuning/checkpoints/checkpoint_best.pt")
    test_samples = payload.get("test_samples", [])
    baseline_transcripts = payload.get("baseline_transcripts", {})
    adapted_transcripts = payload.get("adapted_transcripts", {})
    max_overall_reg = float(payload.get("max_overall_regression", 1.0))
    max_cs_reg = float(payload.get("max_cs_regression", 2.0))

    if not test_samples:
        raise HTTPException(status_code=400, detail="test_samples array must not be empty.")

    comparator = CheckpointComparator(
        max_allowed_overall_wer_regression=max_overall_reg,
        max_allowed_cs_wer_regression=max_cs_reg
    )

    decision = comparator.compare_evaluations(
        baseline_model_id=baseline_id,
        adapted_checkpoint_path=checkpoint_path,
        test_samples=test_samples,
        baseline_transcripts=baseline_transcripts,
        adapted_transcripts=adapted_transcripts
    )
    return decision
