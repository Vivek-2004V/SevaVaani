#!/usr/bin/env bash
# ==============================================================================
# SEVA VAANI: REMOTE GPU CLUSTER TRAINING LAUNCHER (SV-ASR-FT-008)
# Target Environment: Ubuntu 22.04 LTS / NVIDIA CUDA 12.1+ / Python 3.10+
# Recommended Instances: AWS EC2 g5.2xlarge (A10G) or p4d.24xlarge (8x A100)
# ==============================================================================

set -euo pipefail

echo "=============================================================================="
echo "SEVA VAANI REMOTE GPU CLUSTER SETUP & TRAINING LAUNCHER"
echo "=============================================================================="

# 1. Verify NVIDIA GPU
if ! command -v nvidia-smi &> /dev/null; then
    echo "ERROR: nvidia-smi not found. This script must be run on an NVIDIA GPU instance."
    exit 1
fi

echo "Detected GPU Hardware:"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

# 2. Check Python & Virtual Environment
PYTHON_BIN=$(which python3)
echo "Using Python: $PYTHON_BIN"

# 3. Install PyTorch & NeMo dependencies if needed
echo "Verifying PyTorch and CUDA bindings..."
$PYTHON_BIN -c "import torch; print('PyTorch Version:', torch.__version__, '| CUDA Available:', torch.cuda.is_available())"

# 4. Set Environment Variables
export HF_TOKEN="${HF_TOKEN:-}"
export WANDB_API_KEY="${WANDB_API_KEY:-}"
export OMP_NUM_THREADS=4

# 5. Manifest Paths
TRAIN_MANIFEST="./data/fine_tuning/manifests/manifest_train.jsonl"
VAL_MANIFEST="./data/fine_tuning/manifests/manifest_val.jsonl"
OUTPUT_DIR="./data/fine_tuning/checkpoints/indicconformer_600m_adapted_$(date +%Y%m%d_%H%M%S)"

if [ ! -f "$TRAIN_MANIFEST" ]; then
    echo "ERROR: Training manifest not found at $TRAIN_MANIFEST."
    echo "Run manifest preparer first: python3 -m app.services.fine_tuning.manifest_preparer"
    exit 1
fi

echo "Starting Speech Model Adaptation Training..."
$PYTHON_BIN scripts/fine_tuning/train_speech_model.py \
  --model-name "ai4bharat/indicconformer-600m" \
  --architecture "conformer" \
  --train-manifest "$TRAIN_MANIFEST" \
  --val-manifest "$VAL_MANIFEST" \
  --output-dir "$OUTPUT_DIR" \
  --learning-rate 5e-5 \
  --batch-size 8 \
  --gradient-accumulation-steps 4 \
  --mixed-precision "bf16" \
  --max-epochs 10 \
  --warmup-steps 500 \
  --early-stopping-patience 3

echo "Training completed. Output saved in: $OUTPUT_DIR"
