"""
Speech Fine-Tuning Configuration & Settings Management (SV-ASR-FT-002).
Defines reproducible, validated training hyperparameters for IndicConformer and Whisper.
"""

from __future__ import annotations
import json
from typing import Dict, Any, Optional, Literal
from pydantic import BaseModel, Field


class SpeechTrainingConfig(BaseModel):
    """
    Standardized configuration for speech-to-text acoustic fine-tuning.
    Compatible with NVIDIA NeMo and Hugging Face Seq2SeqTrainer.
    """
    # Model Metadata
    model_name: str = Field(
        default="ai4bharat/indicconformer-600m",
        description="Pretrained model identifier or path"
    )
    model_architecture: Literal["conformer", "whisper", "wav2vec2"] = Field(
        default="conformer",
        description="Underlying acoustic neural architecture"
    )
    target_languages: list[str] = Field(
        default=["hi", "mr", "en"],
        description="Target languages for adaptation"
    )
    
    # Dataset Manifest Paths
    train_manifest_path: str = Field(
        default="./data/fine_tuning/manifests/manifest_train.jsonl",
        description="Path to train split JSONL manifest"
    )
    val_manifest_path: str = Field(
        default="./data/fine_tuning/manifests/manifest_val.jsonl",
        description="Path to validation split JSONL manifest"
    )
    test_manifest_path: str = Field(
        default="./data/fine_tuning/manifests/manifest_test.jsonl",
        description="Path to held-out test split JSONL manifest"
    )
    
    # Optimization & Hardware Hyperparameters
    learning_rate: float = Field(
        default=5e-5,
        description="Peak learning rate"
    )
    warmup_steps: int = Field(
        default=500,
        description="Linear warmup step count"
    )
    per_device_train_batch_size: int = Field(
        default=8,
        description="Batch size per GPU device"
    )
    gradient_accumulation_steps: int = Field(
        default=4,
        description="Number of update steps to accumulate before backward pass"
    )
    mixed_precision: Literal["no", "fp16", "bf16"] = Field(
        default="bf16",
        description="Floating point precision mode"
    )
    weight_decay: float = Field(
        default=0.01,
        description="AdamW weight decay regularizer"
    )
    max_grad_norm: float = Field(
        default=1.0,
        description="Maximum gradient norm for clipping"
    )
    max_epochs: int = Field(
        default=10,
        description="Maximum total training epochs"
    )
    early_stopping_patience: int = Field(
        default=3,
        description="Validation epochs without improvement before halting"
    )
    
    # Parameter-Efficient Fine-Tuning (PEFT / LoRA)
    use_peft_lora: bool = Field(
        default=True,
        description="Whether to use Low-Rank Adaptation (LoRA)"
    )
    lora_rank: int = Field(
        default=16,
        description="Rank of LoRA decomposition matrices"
    )
    lora_alpha: int = Field(
        default=32,
        description="LoRA scaling factor alpha"
    )
    lora_dropout: float = Field(
        default=0.05,
        description="Dropout probability for LoRA layers"
    )

    # Checkpoint & Tracking
    output_dir: str = Field(
        default="./data/fine_tuning/checkpoints/run_01",
        description="Directory to save checkpoint weights and metadata"
    )
    save_total_limit: int = Field(
        default=3,
        description="Maximum number of top checkpoints to retain"
    )
    metric_for_best_model: str = Field(
        default="eval_wer",
        description="Primary validation metric for checkpoint retention"
    )
    greater_is_better: bool = Field(
        default=False,
        description="Whether higher metric is better (False for WER/CER)"
    )
    logging_steps: int = Field(
        default=25,
        description="Step interval for loss and metric emission"
    )

    def effective_batch_size(self, num_gpus: int = 1) -> int:
        """Calculates total effective batch size across distributed workers."""
        return self.per_device_train_batch_size * self.gradient_accumulation_steps * num_gpus

    def generate_cli_command(self) -> str:
        """Generates reproducible CLI invocation command."""
        return (
            f"python3 scripts/fine_tuning/train_speech_model.py \\\n"
            f"  --model-name '{self.model_name}' \\\n"
            f"  --architecture '{self.model_architecture}' \\\n"
            f"  --train-manifest '{self.train_manifest_path}' \\\n"
            f"  --val-manifest '{self.val_manifest_path}' \\\n"
            f"  --output-dir '{self.output_dir}' \\\n"
            f"  --learning-rate {self.learning_rate} \\\n"
            f"  --batch-size {self.per_device_train_batch_size} \\\n"
            f"  --gradient-accumulation-steps {self.gradient_accumulation_steps} \\\n"
            f"  --mixed-precision '{self.mixed_precision}' \\\n"
            f"  --max-epochs {self.max_epochs} \\\n"
            f"  --warmup-steps {self.warmup_steps} \\\n"
            f"  --early-stopping-patience {self.early_stopping_patience} \\\n"
            f"  --lora-rank {self.lora_rank} \\\n"
            f"  --lora-alpha {self.lora_alpha}"
        )

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()
