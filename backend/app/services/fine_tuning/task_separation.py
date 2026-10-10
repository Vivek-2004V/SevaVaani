"""
Task Separation Architecture Specification (SV-ASR-FT-001).
Strictly separates:
  1. Speech Model Adaptation: Audio waveform to verbatim text transcript.
  2. LLM Adaptation: Text transcript to structured public service form slots.
  3. Text-to-Speech Adaptation: Text response to spoken audio waveform.
Guarantees speech models do not attempt NLU, and LLMs do not ingest raw waveforms.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class SpeechModelAdaptationSpec(BaseModel):
    """Specification for acoustic & language speech recognition fine-tuning."""
    task_name: str = "speech_model_adaptation"
    model_name: str = "ai4bharat/indicconformer-600m"
    input_modality: str = "audio/wav (16000Hz mono PCM_16)"
    output_modality: str = "text/plain (verbatim transcript with language tags)"
    target_languages: List[str] = ["hi", "mr", "en", "hi-en"]
    objective: str = "Acoustic modeling, regional accent robustness, code-switching transcription"
    loss_function: str = "CTC Loss / RNN-T Loss / Seq2Seq Cross-Entropy"
    evaluation_metrics: List[str] = ["WER (Word Error Rate)", "CER (Character Error Rate)"]

    def validate_scope(self, input_type: str, output_type: str) -> bool:
        """Validates that this task handles only audio-to-text transformation."""
        return "audio" in input_type.lower() and "text" in output_type.lower()


class LLMAdaptationSpec(BaseModel):
    """Specification for text understanding and structured extraction fine-tuning."""
    task_name: str = "llm_adaptation"
    model_name: str = "meta-llama/Meta-Llama-3-8B-Instruct"
    input_modality: str = "text/plain (normalized transcript + service schema)"
    output_modality: str = "application/json (structured form fields & confidence scores)"
    target_languages: List[str] = ["hi", "mr", "en", "hi-en"]
    objective: str = "Service intent parsing, slot extraction, official scheme parameter validation"
    adaptation_technique: str = "QLoRA Instruction Tuning (4-bit quantization, rank=16)"
    evaluation_metrics: List[str] = ["Slot F1-Score", "Intent Accuracy", "JSON Schema Validity Rate"]

    def validate_scope(self, input_type: str, output_type: str) -> bool:
        """Validates that this task handles only text-to-structured-data transformation."""
        return "text" in input_type.lower() and "json" in output_type.lower()


class TTSAdaptationSpec(BaseModel):
    """Specification for spoken response acoustic synthesis adaptation."""
    task_name: str = "tts_adaptation"
    model_name: str = "ai4bharat/indictts-vits"
    input_modality: str = "text/plain (response message string + target dialect tag)"
    output_modality: str = "audio/wav (24000Hz mono spoken audio stream)"
    target_languages: List[str] = ["hi", "mr", "en"]
    objective: str = "Natural prosody, regional accent intonation, respectful public-service citizen delivery"
    adaptation_technique: str = "Speaker Embedding Conditioning & Multi-Speaker Acoustic Adaptation"
    evaluation_metrics: List[str] = ["Mean Opinion Score (MOS)", "Mel-Cepstral Distortion (MCD)"]

    def validate_scope(self, input_type: str, output_type: str) -> bool:
        """Validates that this task handles only text-to-audio synthesis."""
        return "text" in input_type.lower() and "audio" in output_type.lower()


class AdaptationPipelineSeparation(BaseModel):
    """Complete tripartite adaptation architecture container."""
    speech_adaptation: SpeechModelAdaptationSpec = Field(default_factory=SpeechModelAdaptationSpec)
    llm_adaptation: LLMAdaptationSpec = Field(default_factory=LLMAdaptationSpec)
    tts_adaptation: TTSAdaptationSpec = Field(default_factory=TTSAdaptationSpec)

    def describe_separation(self) -> Dict[str, Any]:
        """Provides a structured summary of the tripartite task boundaries."""
        return {
            "pipeline_stages": [
                {
                    "stage": 1,
                    "task": self.speech_adaptation.task_name,
                    "model": self.speech_adaptation.model_name,
                    "input": self.speech_adaptation.input_modality,
                    "output": self.speech_adaptation.output_modality,
                    "metrics": self.speech_adaptation.evaluation_metrics,
                },
                {
                    "stage": 2,
                    "task": self.llm_adaptation.task_name,
                    "model": self.llm_adaptation.model_name,
                    "input": self.llm_adaptation.input_modality,
                    "output": self.llm_adaptation.output_modality,
                    "metrics": self.llm_adaptation.evaluation_metrics,
                },
                {
                    "stage": 3,
                    "task": self.tts_adaptation.task_name,
                    "model": self.tts_adaptation.model_name,
                    "input": self.tts_adaptation.input_modality,
                    "output": self.tts_adaptation.output_modality,
                    "metrics": self.tts_adaptation.evaluation_metrics,
                },
            ],
            "isolation_guarantee": (
                "Speech acoustic fine-tuning is strictly isolated from LLM text reasoning. "
                "Audio waveforms are processed solely by the ASR model, and the LLM receives "
                "only normalized text transcripts and schema constraints."
            )
        }
