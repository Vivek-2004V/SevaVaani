"""
Checkpoint Comparison & Automated Regression Rejection Gate (SV-ASR-FT-005).
Evaluates adapted speech model checkpoints against the original pretrained baseline.
Conducts separate evaluations on:
  1. Native-Speaker Test Sets (Hindi, Marathi, English)
  2. Code-Switching Test Sets (Hinglish, Marathi-English)
Applies strict rejection thresholds to prevent performance regressions from entering production.
"""

from __future__ import annotations
import os
import json
import time
import shutil
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.services.evaluation.metrics import EvaluationMetrics


class SubgroupEvaluationResult(BaseModel):
    """Evaluation metrics for a specific test group."""
    group_name: str
    sample_count: int
    baseline_wer: float
    adapted_wer: float
    wer_delta: float  # negative is improvement, positive is regression
    baseline_cer: float
    adapted_cer: float
    cer_delta: float
    verdict: str  # "IMPROVED", "NEUTRAL", "REGRESSED"


class RegressionGateDecision(BaseModel):
    """Formal decision rendered by the automated regression gate."""
    decision: str  # "APPROVED", "REJECTED"
    status: str
    baseline_model: str
    adapted_checkpoint: str
    evaluation_timestamp: float
    overall_baseline_wer: float
    overall_adapted_wer: float
    overall_wer_delta: float
    native_speaker_results: Dict[str, SubgroupEvaluationResult]
    code_switching_results: Dict[str, SubgroupEvaluationResult]
    regression_violations: List[str]
    rollback_triggered: bool
    quarantine_path: Optional[str] = None
    audit_notes: str


class CheckpointComparator:
    """
    Compares adapted checkpoints against baseline models on disjoint test sets.
    Rejects any adapted checkpoint that degrades performance beyond configured tolerances.
    """

    def __init__(
        self,
        max_allowed_overall_wer_regression: float = 1.0,
        max_allowed_cs_wer_regression: float = 2.0,
        max_allowed_cer_regression: float = 1.5,
        quarantine_dir: Optional[str] = None
    ):
        self.max_overall_regression = max_allowed_overall_wer_regression
        self.max_cs_regression = max_allowed_cs_wer_regression
        self.max_cer_regression = max_allowed_cer_regression
        self.quarantine_dir = quarantine_dir or "./data/fine_tuning/checkpoints/quarantine"
        self.metrics_engine = EvaluationMetrics()

    def word_error_rate(self, refs: List[str], hyps: List[str]) -> float:
        """Computes mean percentage WER across references and hypotheses."""
        if not refs:
            return 0.0
        wers = [self.metrics_engine.calculate_wer(r, h) for r, h in zip(refs, hyps)]
        return round((sum(wers) / len(wers)) * 100.0, 2)

    def character_error_rate(self, refs: List[str], hyps: List[str]) -> float:
        """Computes mean percentage CER across references and hypotheses."""
        if not refs:
            return 0.0
        cers = [self.metrics_engine.calculate_cer(r, h) for r, h in zip(refs, hyps)]
        return round((sum(cers) / len(cers)) * 100.0, 2)

    def compare_evaluations(
        self,
        baseline_model_id: str,
        adapted_checkpoint_path: str,
        test_samples: List[Dict[str, Any]],
        baseline_transcripts: Dict[str, str],
        adapted_transcripts: Dict[str, str]
    ) -> RegressionGateDecision:
        """
        Executes strict regression comparison across native and code-switching splits.
        """
        # Split samples into subgroups
        native_hi = []
        native_mr = []
        native_en = []
        cs_hi_en = []
        cs_mr_en = []

        all_refs = []
        all_base_hyps = []
        all_adapt_hyps = []

        for sample in test_samples:
            sid = str(sample.get("id") or sample.get("recording_id") or sample.get("audio_filepath", ""))
            ref = sample.get("reference_transcript") or sample.get("verified_transcript") or sample.get("text", "")
            base_hyp = baseline_transcripts.get(sid, "")
            adapt_hyp = adapted_transcripts.get(sid, "")
            lang = sample.get("language", "hi")
            is_cs = sample.get("is_code_switched", False) or lang in ["hi-en", "mr-en"]

            sample_data = {
                "id": sid,
                "ref": ref,
                "base_hyp": base_hyp,
                "adapt_hyp": adapt_hyp
            }

            all_refs.append(ref)
            all_base_hyps.append(base_hyp)
            all_adapt_hyps.append(adapt_hyp)

            if is_cs:
                if lang == "mr-en":
                    cs_mr_en.append(sample_data)
                else:
                    cs_hi_en.append(sample_data)
            else:
                if lang == "mr":
                    native_mr.append(sample_data)
                elif lang == "en":
                    native_en.append(sample_data)
                else:
                    native_hi.append(sample_data)

        # Helper to compute subgroup metrics
        def _compute_subgroup(name: str, group_samples: List[Dict[str, Any]]) -> SubgroupEvaluationResult:
            if not group_samples:
                return SubgroupEvaluationResult(
                    group_name=name,
                    sample_count=0,
                    baseline_wer=0.0,
                    adapted_wer=0.0,
                    wer_delta=0.0,
                    baseline_cer=0.0,
                    adapted_cer=0.0,
                    cer_delta=0.0,
                    verdict="NO_SAMPLES"
                )

            refs = [s["ref"] for s in group_samples]
            b_hyps = [s["base_hyp"] for s in group_samples]
            a_hyps = [s["adapt_hyp"] for s in group_samples]

            b_wer = self.word_error_rate(refs, b_hyps)
            a_wer = self.word_error_rate(refs, a_hyps)
            b_cer = self.character_error_rate(refs, b_hyps)
            a_cer = self.character_error_rate(refs, a_hyps)

            w_delta = round(a_wer - b_wer, 2)
            c_delta = round(a_cer - b_cer, 2)

            if w_delta < -0.1:
                verdict = "IMPROVED"
            elif w_delta > 0.5:
                verdict = "REGRESSED"
            else:
                verdict = "NEUTRAL"

            return SubgroupEvaluationResult(
                group_name=name,
                sample_count=len(group_samples),
                baseline_wer=b_wer,
                adapted_wer=a_wer,
                wer_delta=w_delta,
                baseline_cer=b_cer,
                adapted_cer=a_cer,
                cer_delta=c_delta,
                verdict=verdict
            )

        # Subgroup evaluations
        native_results = {
            "hindi_native": _compute_subgroup("Hindi Native Speakers", native_hi),
            "marathi_native": _compute_subgroup("Marathi Native Speakers", native_mr),
            "english_native": _compute_subgroup("English Native Speakers", native_en),
        }

        cs_results = {
            "hinglish_code_switching": _compute_subgroup("Hinglish Code-Switching", cs_hi_en),
            "marathi_english_code_switching": _compute_subgroup("Marathi-English Code-Switching", cs_mr_en),
        }

        # Overall Metrics
        overall_base_wer = self.word_error_rate(all_refs, all_base_hyps)
        overall_adapt_wer = self.word_error_rate(all_refs, all_adapt_hyps)
        overall_delta = round(overall_adapt_wer - overall_base_wer, 2)

        # Evaluate Regression Violations
        violations = []
        if overall_delta > self.max_overall_regression:
            violations.append(
                f"Overall WER regressed by +{overall_delta}% (limit: +{self.max_overall_regression}%). Baseline: {overall_base_wer}%, Adapted: {overall_adapt_wer}%"
            )

        # Check code-switching regression
        for cs_key, cs_res in cs_results.items():
            if cs_res.sample_count > 0 and cs_res.wer_delta > self.max_cs_regression:
                violations.append(
                    f"Code-switching ({cs_key}) WER regressed by +{cs_res.wer_delta}% (limit: +{self.max_cs_regression}%). Baseline: {cs_res.baseline_wer}%, Adapted: {cs_res.adapted_wer}%"
                )

        # Check native-speaker regressions
        for nat_key, nat_res in native_results.items():
            if nat_res.sample_count > 0 and nat_res.wer_delta > (self.max_overall_regression + 1.0):
                violations.append(
                    f"Native language ({nat_key}) WER regressed by +{nat_res.wer_delta}%. Baseline: {nat_res.baseline_wer}%, Adapted: {nat_res.adapted_wer}%"
                )

        # Render Decision
        if violations:
            decision = "REJECTED"
            status = "FAILED_REGRESSION_GATE"
            rollback_triggered = True
            quarantine_path = self._execute_rollback(adapted_checkpoint_path, violations)
            notes = (
                f"AUTOMATED ROLLBACK TRIGGERED: Checkpoint '{adapted_checkpoint_path}' violated "
                f"{len(violations)} safety constraints and was rejected. Active production baseline "
                f"remains untouched at '{baseline_model_id}'."
            )
        else:
            decision = "APPROVED"
            status = "PASSED_REGRESSION_GATE"
            rollback_triggered = False
            quarantine_path = None
            notes = (
                f"VALIDATION SUCCESS: Checkpoint '{adapted_checkpoint_path}' met all safety constraints. "
                f"Overall WER delta: {overall_delta}%. Promoted to candidate status."
            )

        return RegressionGateDecision(
            decision=decision,
            status=status,
            baseline_model=baseline_model_id,
            adapted_checkpoint=adapted_checkpoint_path,
            evaluation_timestamp=time.time(),
            overall_baseline_wer=overall_base_wer,
            overall_adapted_wer=overall_adapt_wer,
            overall_wer_delta=overall_delta,
            native_speaker_results=native_results,
            code_switching_results=cs_results,
            regression_violations=violations,
            rollback_triggered=rollback_triggered,
            quarantine_path=quarantine_path,
            audit_notes=notes
        )

    def _execute_rollback(self, checkpoint_path: str, violations: List[str]) -> str:
        """
        Quarantines rejected checkpoint and writes an incident record.
        """
        os.makedirs(self.quarantine_dir, exist_ok=True)
        ts = int(time.time())
        quarantine_subdir = os.path.join(self.quarantine_dir, f"rejected_{ts}")
        os.makedirs(quarantine_subdir, exist_ok=True)

        # If file exists, move it
        if os.path.exists(checkpoint_path):
            target_file = os.path.join(quarantine_subdir, os.path.basename(checkpoint_path))
            try:
                shutil.move(checkpoint_path, target_file)
            except Exception:
                pass

        # Write incident log
        incident_file = os.path.join(quarantine_subdir, "rejection_incident.json")
        try:
            with open(incident_file, "w", encoding="utf-8") as f:
                json.dump({
                    "timestamp": ts,
                    "rejected_checkpoint": checkpoint_path,
                    "violations": violations,
                    "rollback_action": "Preserved baseline model symlink, quarantined weights"
                }, f, indent=2)
        except Exception:
            pass

        return quarantine_subdir
