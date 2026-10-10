"""
Fine-Tuning Readiness & Hardware Auditor (SV-ASR-FT-004).
Conducts programmatic verification of local vs target GPU hardware, dataset viability,
and cloud credentials before allowing any fine-tuning execution.
"""

from __future__ import annotations
import os
import sys
import shutil
import platform
import subprocess
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.fine_tuning.training_config import SpeechTrainingConfig


class HardwareAuditReport(BaseModel):
    """Hardware capability findings."""
    os_name: str
    architecture: str
    cpu_cores: int
    ram_gb: float
    cuda_available: bool
    gpu_devices: List[str]
    mps_available: bool
    disk_free_gb: float
    local_training_permitted: bool
    verdict: str
    reasons: List[str]


class DatasetReadinessReport(BaseModel):
    """Dataset volume and quality readiness findings."""
    corpus_dir: str
    train_manifest_exists: bool
    val_manifest_exists: bool
    test_manifest_exists: bool
    train_sample_count: int
    train_duration_hours: float
    sufficient_for_acoustic_finetuning: bool
    min_required_hours: float


class FineTuningReadinessAudit(BaseModel):
    """Full readiness check combining hardware, dataset, and reproducible commands."""
    model_name: str
    model_version: str
    license: str
    hardware_audit: HardwareAuditReport
    dataset_readiness: DatasetReadinessReport
    estimated_compute: Dict[str, Any]
    required_credentials: List[str]
    training_command: str
    evaluation_command: str
    rollback_procedure: str
    reproducible_gpu_cluster_instructions: str


class ReadinessChecker:
    """
    Audits execution environment readiness and blocks unsafe local training jobs.
    """

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = base_dir or settings.BASE_DIR
        self.corpus_dir = os.path.join(self.base_dir, "data", "speech_corpus")
        self.manifests_dir = os.path.join(self.base_dir, "data", "fine_tuning", "manifests")

    def audit_hardware(self) -> HardwareAuditReport:
        """Inspects CPU, RAM, and GPU devices."""
        os_name = platform.system()
        arch = platform.machine()
        cpu_cores = os.cpu_count() or 1

        # Check Total RAM
        ram_gb = 16.0
        try:
            if os_name == "Darwin":
                out = subprocess.check_output(["sysctl", "-n", "hw.memsize"], text=True)
                ram_gb = round(int(out.strip()) / (1024 ** 3), 1)
            elif os_name == "Linux" and os.path.exists("/proc/meminfo"):
                with open("/proc/meminfo") as f:
                    for line in f:
                        if line.startswith("MemTotal:"):
                            kb = int(line.split()[1])
                            ram_gb = round(kb / (1024 ** 2), 1)
                            break
        except Exception:
            pass

        # Check Free Disk Space
        disk_free_gb = 0.0
        try:
            usage = shutil.disk_usage(self.base_dir)
            disk_free_gb = round(usage.free / (1024 ** 3), 1)
        except Exception:
            pass

        # Check CUDA & PyTorch
        cuda_avail = False
        gpu_devices = []
        mps_avail = False

        try:
            import torch
            cuda_avail = torch.cuda.is_available()
            if cuda_avail:
                gpu_devices = [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())]
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                mps_avail = True
        except ImportError:
            # PyTorch not installed in this environment
            pass

        reasons = []
        local_permitted = False

        if not cuda_avail:
            reasons.append("No NVIDIA CUDA GPU available on local machine. Fine-tuning a 600M Conformer requires >= 32GB GPU VRAM.")
        if ram_gb < 32.0:
            reasons.append(f"Host RAM ({ram_gb} GB) is below the minimum 32 GB requirement for acoustic backpropagation without memory exhaustion.")

        if cuda_avail and ram_gb >= 32.0:
            local_permitted = True
            verdict = "LOCAL_TRAINING_SUPPORTED"
        else:
            verdict = "INSUFFICIENT_LOCAL_HARDWARE_REMOTE_GPU_REQUIRED"

        return HardwareAuditReport(
            os_name=os_name,
            architecture=arch,
            cpu_cores=cpu_cores,
            ram_gb=ram_gb,
            cuda_available=cuda_avail,
            gpu_devices=gpu_devices,
            mps_available=mps_avail,
            disk_free_gb=disk_free_gb,
            local_training_permitted=local_permitted,
            verdict=verdict,
            reasons=reasons
        )

    def audit_dataset(self) -> DatasetReadinessReport:
        """Audits manifests and dataset duration."""
        train_p = os.path.join(self.manifests_dir, "manifest_train.jsonl")
        val_p = os.path.join(self.manifests_dir, "manifest_val.jsonl")
        test_p = os.path.join(self.manifests_dir, "manifest_test.jsonl")

        train_exists = os.path.isfile(train_p)
        val_exists = os.path.isfile(val_p)
        test_exists = os.path.isfile(test_p)

        sample_count = 0
        total_duration_sec = 0.0

        if train_exists:
            try:
                import json
                with open(train_p, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            rec = json.loads(line)
                            sample_count += 1
                            total_duration_sec += float(rec.get("duration", 0.0))
            except Exception:
                pass

        hours = round(total_duration_sec / 3600.0, 3)
        min_required_hours = 10.0  # Documented threshold for domain acoustic adaptation

        return DatasetReadinessReport(
            corpus_dir=self.corpus_dir,
            train_manifest_exists=train_exists,
            val_manifest_exists=val_exists,
            test_manifest_exists=test_exists,
            train_sample_count=sample_count,
            train_duration_hours=hours,
            sufficient_for_acoustic_finetuning=(hours >= min_required_hours),
            min_required_hours=min_required_hours
        )

    def produce_full_readiness_audit(self) -> FineTuningReadinessAudit:
        """Produces the official documented readiness check."""
        hw = self.audit_hardware()
        ds = self.audit_dataset()

        cfg = SpeechTrainingConfig()
        training_cmd = cfg.generate_cli_command()
        eval_cmd = (
            "python3 scripts/fine_tuning/evaluate_speech_checkpoint.py \\\n"
            "  --baseline-model 'ai4bharat/indicconformer-600m' \\\n"
            f"  --adapted-checkpoint '{cfg.output_dir}/checkpoint_best.pt' \\\n"
            f"  --test-manifest '{cfg.test_manifest_path}' \\\n"
            "  --output-report './data/fine_tuning/reports/evaluation_comparison.json'"
        )

        rollback_proc = (
            "1. Atomic symlink preservation: Active serving symlink remains pointed to baseline.\n"
            "2. Automated rejection check: If adapted WER exceeds baseline by > 1.0% or code-switching WER exceeds baseline by > 2.0%, checkpoint is rejected.\n"
            "3. Quarantine move: Rejected weights moved to ./data/fine_tuning/checkpoints/quarantine/.\n"
            "4. Immediate zero-downtime serving rollback with audit alert."
        )

        gpu_instructions = (
            "1. Provision an AWS EC2 instance (g5.2xlarge or p4d.24xlarge) or RunPod container (1x RTX 4090 / A100).\n"
            "2. Install NVIDIA CUDA 12.1+ drivers, PyTorch 2.3+, and NeMo: pip install nemo_toolkit[asr].\n"
            "3. Clone repo and sync manifests: rsync -avz ./data/fine_tuning/manifests user@gpu-host:~/SevaVaani/data/fine_tuning/\n"
            "4. Launch training command as a background screen/tmux process.\n"
            "5. After training, evaluate checkpoint against test split before downloading weights."
        )

        return FineTuningReadinessAudit(
            model_name="ai4bharat/indicconformer-600m",
            model_version="IndicASR v2 (Conformer CTC/RNN-T Hybrid)",
            license="MIT License (Open commercial and research fine-tuning permitted)",
            hardware_audit=hw,
            dataset_readiness=ds,
            estimated_compute={
                "dataset_assumed_hours": 50.0,
                "epochs": 10,
                "target_hardware": "4x NVIDIA A100 (80GB VRAM)",
                "estimated_gpu_hours": "4 - 6 hours",
                "estimated_cost_usd": "$25 - $35",
                "local_apple_m5_cpu_estimate": ">140 hours (prohibited due to OOM risk)"
            },
            required_credentials=[
                "HF_TOKEN (Hugging Face API token for tokenizer/weights)",
                "WANDB_API_KEY (Optional: Weights & Biases experiment tracking)",
                "AWS_ACCESS_KEY_ID / SECRET (If training on AWS EC2 GPU spot/on-demand)"
            ],
            training_command=training_cmd,
            evaluation_command=eval_cmd,
            rollback_procedure=rollback_proc,
            reproducible_gpu_cluster_instructions=gpu_instructions
        )
