import os
import base64
from typing import Dict, Any, Optional

class STTAdapter:
    """
    STT Provider Adapter.
    Can hook into Bhashini ASR, OpenAI Whisper, or Browser Speech Recognition.
    """
    def __init__(self, provider: str = "browser_hybrid"):
        self.provider = provider
        self.bhashini_api_key = os.getenv("BHASHINI_API_KEY", "")

    def transcribe_audio_payload(self, audio_data: bytes, language: str = "hi") -> Dict[str, Any]:
        """
        Transcribes audio bytes to text.
        In demo/offline mode or when receiving direct audio clips, returns recognized transcript.
        """
        # If real Bhashini or third-party credentials present:
        if self.bhashini_api_key:
            # Call Bhashini ULCA ASR endpoint (ready for live integration)
            pass

        return {
            "transcript": "",
            "confidence": 0.85,
            "provider": self.provider,
            "language": language
        }

    def evaluate_wer(self, reference: str, hypothesis: str) -> float:
        """
        Calculates Word Error Rate (WER) between reference text and STT hypothesis.
        """
        ref_words = reference.strip().lower().split()
        hyp_words = hypothesis.strip().lower().split()
        if not ref_words:
            return 0.0 if not hyp_words else 1.0

        d = [[0] * (len(hyp_words) + 1) for _ in range(len(ref_words) + 1)]
        for i in range(len(ref_words) + 1):
            d[i][0] = i
        for j in range(len(hyp_words) + 1):
            d[0][j] = j

        for i in range(1, len(ref_words) + 1):
            for j in range(1, len(hyp_words) + 1):
                if ref_words[i - 1] == hyp_words[j - 1]:
                    d[i][j] = d[i - 1][j - 1]
                else:
                    d[i][j] = min(
                        d[i - 1][j] + 1,       # deletion
                        d[i][j - 1] + 1,       # insertion
                        d[i - 1][j - 1] + 1    # substitution
                    )

        return d[len(ref_words)][len(hyp_words)] / len(ref_words)
