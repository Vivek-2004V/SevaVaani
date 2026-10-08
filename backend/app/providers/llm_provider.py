import abc
from typing import Dict, Any, Optional

class BaseLLMProvider(abc.ABC):
    @abc.abstractmethod
    def extract_structured_field(self, field_name: str, transcript: str, language: str) -> Dict[str, Any]:
        pass

class StructuredRulesExtractor(BaseLLMProvider):
    """
    Deterministic & rule-based structured extractor complying with TRD Section 12 & 13.
    Guarantees zero hallucinations and predictable extraction.
    """
    def __init__(self):
        from app.services.extractor import ExtractorService
        self.extractor = ExtractorService

    def extract_structured_field(self, field_name: str, transcript: str, language: str) -> Dict[str, Any]:
        return self.extractor.extract_field(field_name, transcript, language)
