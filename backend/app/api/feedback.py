"""
Continuous Improvement & Feedback API Router for SEVA VAANI (Prompt 8).

Endpoints:
- POST /api/feedback/report-correction: Citizen reports transcription error with consent
- GET  /api/feedback/admin-metrics: Privacy-preserving aggregate error dashboard
- POST /api/feedback/review-sample: Human review gate for gold-standard dataset
- POST /api/feedback/deploy-gate: Evaluates candidate model before deployment
- POST /api/feedback/rollback: Instant rollback to previous production baseline
"""

from __future__ import annotations
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field

from app.services.feedback_service import feedback_service

router = APIRouter(prefix="/api/feedback", tags=["Continuous Improvement & Feedback"])


class CorrectionReportRequest(BaseModel):
    session_id: str = Field(..., description="Form application session ID")
    recognized_transcript: str = Field(..., description="Original recognized transcript")
    user_corrected_transcript: str = Field(..., description="Citizen's corrected text")
    language: str = Field("hi", description="Spoken language code (hi, mr, en)")
    error_category: str = Field("other", description="Error type: dialect_variation, accent_unrecognized, background_noise, wrong_entity, missed_digits, other")
    consent_for_improvement: bool = Field(False, description="Explicit consent to retain sample for speech recognition improvement")
    field_name: Optional[str] = Field(None, description="Form field during which error occurred")
    region_optional: Optional[str] = Field(None, description="Self-reported regional background (optional)")
    subgroup_optional: Optional[str] = Field(None, description="Dialect subgroup: rural_vidarbha, malwi_nimadi, bhojpuri_influenced, mumbai_colloquial, standard_in")


class ReviewSampleRequest(BaseModel):
    feedback_id: str = Field(..., description="Feedback record ID to review")
    action: str = Field(..., description="'approve_gold_standard' or 'reject'")
    reviewer_id: str = Field("evaluator_1", description="Reviewer identifier")
    verified_transcript: Optional[str] = Field(None, description="Reviewer-corrected transcript if modified")


class DeployGateRequest(BaseModel):
    candidate_model_id: str = Field(..., description="Trained candidate model checkpoint name")
    candidate_model_version: str = Field(..., description="Semantic version string, e.g. 1.1.0")
    candidate_wer: float = Field(..., description="Evaluated Word Error Rate on held-out benchmark")
    candidate_accuracy: float = Field(..., description="Overall field extraction accuracy (0.0 to 1.0)")


@router.post("/report-correction")
def report_correction(payload: CorrectionReportRequest) -> Dict[str, Any]:
    """
    Citizens can report an incorrect transcript after a failed or corrected turn.
    Consent is strictly optional; declining consent does not impair service access.
    """
    return feedback_service.submit_correction_feedback(
        session_id=payload.session_id,
        recognized_transcript=payload.recognized_transcript,
        user_corrected_transcript=payload.user_corrected_transcript,
        language=payload.language,
        error_category=payload.error_category,
        consent_for_improvement=payload.consent_for_improvement,
        field_name=payload.field_name,
        region_optional=payload.region_optional,
        subgroup_optional=payload.subgroup_optional
    )


@router.get("/admin-metrics")
def get_admin_metrics() -> Dict[str, Any]:
    """
    Admin evaluation dashboard showing aggregate transcription errors by language,
    category, and supported evaluation subgroup. Zero speaker PII or audio recordings exposed.
    """
    return feedback_service.get_admin_evaluation_dashboard()


@router.post("/review-sample")
def review_sample(payload: ReviewSampleRequest) -> Dict[str, Any]:
    """
    Human review gate. Only approved consenting samples enter gold-standard training data.
    """
    result = feedback_service.review_sample(
        feedback_id=payload.feedback_id,
        action=payload.action,
        reviewer_id=payload.reviewer_id,
        verified_transcript=payload.verified_transcript
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("message"))
    return result


@router.post("/deploy-gate")
def deploy_model_gate(payload: DeployGateRequest) -> Dict[str, Any]:
    """
    Deployment gate. Automatically checks candidate WER against active baseline.
    Blocks deployment if model regressed.
    """
    return feedback_service.evaluate_and_deploy_model(
        candidate_model_id=payload.candidate_model_id,
        candidate_model_version=payload.candidate_model_version,
        candidate_wer=payload.candidate_wer,
        candidate_accuracy=payload.candidate_accuracy
    )


@router.post("/rollback")
def rollback_model() -> Dict[str, Any]:
    """
    Instant model rollback to previous production baseline checkpoint.
    """
    result = feedback_service.rollback_to_baseline()
    if result.get("status") == "rollback_failed":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result
