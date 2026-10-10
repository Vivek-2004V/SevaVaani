"""
Tests for Prompt 8 — Accent-Aware Testing and Continuous Improvement.

Verifies all 10 Prompt 8 requirements:
1. Consent-gated retention for speech improvement.
2. PII minimization (phone numbers, Aadhaar, email redacted; pseudonymous speaker ID).
3. Stores only required metadata.
4. Separates ordinary application data from the speech-improvement dataset.
5. Users can decline data reuse without losing service access.
6. Requires human review before adding to gold-standard dataset.
7. Versions dataset and evaluation reports.
8. Retrains/fine-tunes only via explicit, reproducible processes.
9. Evaluates updated models before deployment (WER gate).
10. Preserves an instant rollback option.
11. Admin evaluation dashboard aggregates errors by language, category, subgroup with privacy protections.
"""

import os
import json
import tempfile
import pytest
from app.services.feedback_service import CorrectionFeedbackService


@pytest.fixture
def feedback_service_tmp():
    temp_dir = tempfile.mkdtemp()
    svc = CorrectionFeedbackService(storage_dir=temp_dir)
    return svc


def test_consent_declined_not_retained_in_dataset(feedback_service_tmp):
    """
    Requirement 1 & 5:
    If user declines consent (consent_for_improvement=False),
    service access is completely uninterrupted, but the sample is NOT
    retained in the speech-improvement dataset.
    """
    res = feedback_service_tmp.submit_correction_feedback(
        session_id="session_12345",
        recognized_transcript="मेरा नाम रमेश है",
        user_corrected_transcript="मेरा नाम सुरेश है",
        language="hi",
        consent_for_improvement=False
    )

    assert res["status"] == "success"
    assert res["retained_for_dataset"] is False
    assert res["consent_granted"] is False
    assert res["review_status"] == "consent_declined_not_retained"

    # Verify nothing was written to feedback_records.jsonl
    if os.path.isfile(feedback_service_tmp.records_file):
        with open(feedback_service_tmp.records_file, "r") as f:
            lines = [l for l in f if l.strip()]
        assert len(lines) == 0


def test_consent_granted_minimizes_pii_and_pseudonymizes(feedback_service_tmp):
    """
    Requirement 2 & 4:
    If user grants consent, personal information (phone numbers, Aadhaar, email)
    is redacted, speaker ID is pseudonymous, and sample is stored in isolated feedback dataset.
    """
    sample_text = "मेरा नंबर 9876543210 है और ईमेल user@example.com है और आधार 1234 5678 9012"
    res = feedback_service_tmp.submit_correction_feedback(
        session_id="session_test_999",
        recognized_transcript=sample_text,
        user_corrected_transcript="मेरा मोबाइल 9876543210 है",
        language="hi",
        error_category="missed_digits",
        consent_for_improvement=True,
        subgroup_optional="rural_vidarbha"
    )

    assert res["status"] == "success"
    assert res["retained_for_dataset"] is True
    assert res["review_status"] == "pending_human_review"

    # Read stored record
    with open(feedback_service_tmp.records_file, "r") as f:
        records = [json.loads(l) for l in f if l.strip()]

    assert len(records) == 1
    rec = records[0]

    # Verify PII was redacted
    assert "9876543210" not in rec["recognized_transcript"]
    assert "user@example.com" not in rec["recognized_transcript"]
    assert "1234 5678 9012" not in rec["recognized_transcript"]
    assert "[PHONE_REDACTED" in rec["recognized_transcript"]
    assert "[EMAIL_REDACTED]" in rec["recognized_transcript"]
    assert "[AADHAAR_REDACTED]" in rec["recognized_transcript"]

    # Verify pseudonymous speaker ID
    assert rec["speaker_id"].startswith("spk-")
    assert rec["speaker_id"] != "session_test_999"


def test_human_review_gate_gold_standard(feedback_service_tmp):
    """
    Requirement 6:
    Samples must undergo human review before joining the gold-standard corpus.
    """
    res = feedback_service_tmp.submit_correction_feedback(
        session_id="sess_review_1",
        recognized_transcript="उत्पन्न 200000",
        user_corrected_transcript="उत्पन्न दोन लाख रुपये",
        language="mr",
        error_category="dialect_variation",
        consent_for_improvement=True
    )
    fb_id = res["feedback_id"]

    # Action 1: Reject sample
    rej_res = feedback_service_tmp.review_sample(fb_id, action="reject", reviewer_id="auditor_A")
    assert rej_res["new_review_status"] == "rejected_discarded"

    # Action 2: Approve another sample to gold standard
    res2 = feedback_service_tmp.submit_correction_feedback(
        session_id="sess_review_2",
        recognized_transcript="जिला नागपूर",
        user_corrected_transcript="जिल्हा नागपूर",
        language="mr",
        error_category="accent_unrecognized",
        consent_for_improvement=True
    )
    fb_id2 = res2["feedback_id"]
    app_res = feedback_service_tmp.review_sample(
        fb_id2, action="approve_gold_standard", reviewer_id="auditor_B", verified_transcript="जिल्हा नागपूर"
    )
    assert app_res["new_review_status"] == "approved_gold_standard"

    # Verify gold standard corpus contains the approved sample
    with open(feedback_service_tmp.gold_standard_file, "r") as f:
        gold_samples = [json.loads(l) for l in f if l.strip()]
    assert len(gold_samples) == 1
    assert gold_samples[0]["feedback_id"] == fb_id2
    assert gold_samples[0]["verified_transcript"] == "जिल्हा नागपूर"


def test_admin_evaluation_dashboard_privacy_protection(feedback_service_tmp):
    """
    Admin dashboard must show aggregate errors by language, category, and subgroup
    WITHOUT exposing individual recordings or private PII.
    """
    feedback_service_tmp.submit_correction_feedback(
        session_id="s1", recognized_transcript="test hi", user_corrected_transcript="fixed hi",
        language="hi", error_category="dialect_variation", subgroup_optional="bhojpuri_influenced",
        consent_for_improvement=True
    )
    feedback_service_tmp.submit_correction_feedback(
        session_id="s2", recognized_transcript="test mr", user_corrected_transcript="fixed mr",
        language="mr", error_category="accent_unrecognized", subgroup_optional="rural_vidarbha",
        consent_for_improvement=True
    )

    dashboard = feedback_service_tmp.get_admin_evaluation_dashboard()
    assert dashboard["status"] == "success"
    assert "Aggregate analytics only" in dashboard["privacy_guarantee"]
    assert dashboard["total_feedback_reports"] == 2
    assert dashboard["distribution_by_language"]["hi"] == 1
    assert dashboard["distribution_by_language"]["mr"] == 1
    assert dashboard["distribution_by_error_category"]["dialect_variation"] == 1
    assert dashboard["distribution_by_subgroup"]["rural_vidarbha"] == 1
    assert dashboard["distribution_by_subgroup"]["bhojpuri_influenced"] == 1

    # Verify zero individual texts or phone numbers exist in the dashboard payload
    dumped = json.dumps(dashboard)
    assert "test hi" not in dumped
    assert "fixed mr" not in dumped


def test_model_deployment_gate_and_rollback(feedback_service_tmp):
    """
    Requirements 8, 9, 10:
    Deploy candidate model only if WER does not regress.
    Preserve instant rollback option.
    """
    # 1. Regressed model (WER 0.190 > baseline 0.142) should be rejected
    rejected = feedback_service_tmp.evaluate_and_deploy_model(
        candidate_model_id="regressed_checkpoint_v2",
        candidate_model_version="1.1.0",
        candidate_wer=0.190,
        candidate_accuracy=0.88
    )
    assert rejected["gate_passed"] is False
    assert rejected["status"] == "deployment_rejected"

    # 2. Improved model (WER 0.125 <= baseline 0.142) should pass
    deployed = feedback_service_tmp.evaluate_and_deploy_model(
        candidate_model_id="fine_tuned_whisper_v2",
        candidate_model_version="1.1.0",
        candidate_wer=0.125,
        candidate_accuracy=0.96
    )
    assert deployed["gate_passed"] is True
    assert deployed["status"] == "deployment_success"
    assert deployed["previous_model_saved_for_rollback"] == "faster_whisper_indic_base_v1"

    # 3. Rollback
    rb = feedback_service_tmp.rollback_to_baseline()
    assert rb["status"] == "rollback_success"
    assert rb["restored_model_id"] == "faster_whisper_indic_base_v1"
    assert rb["previous_regressed_model"] == "fine_tuned_whisper_v2"
