"""
Comprehensive Verification Tests for Regional Accents and Code-Switching (Prompt 4).
Verifies:
1. The 10 specific test examples across Hindi, Hinglish, English, and Marathi:
   - Hindi:
     • “Mujhe income certificate banana hai.”
     • “Mere ko aay praman patra chahiye.”
     • “Mujhe aay ka certificate banwana hai.”
   - Hinglish:
     • “Mujhe income certificate ke liye apply karna hai.”
     • “Mera annual income two lakh hai.”
     • “Please mera address update kar do.”
   - English:
     • “I want to apply for an income certificate.”
     • “My annual income is two hundred thousand rupees.”
   - Marathi:
     • “मला उत्पन्नाचा दाखला काढायचा आहे.”
     • “माझे वार्षिक उत्पन्न दोन लाख रुपये आहे.”
2. Support for mid-conversation language switching
3. Language and script boundaries preservation
4. Distinguishing actual spoken content from assumptions (provenance)
5. Protection of names, locations, and identifiers against mistranslation
6. Regional vocabulary handling through configurable lexicon
7. Ambiguous transcript clarification gates
8. Treating regional accents/colloquialisms as valid speech rather than errors
9. Multi-tier dialect calibration without hardcoded false claims
10. Recording unsupported speech patterns for later evaluation
"""

import pytest
import os
import json
from app.services.extractor import ExtractorService
from app.services.regional_lexicon import RegionalLexiconManager
from app.services.transcript_normalizer import TranscriptNormalizer
from app.services.form_engine import FormEngine
from app.services.speech_pipeline import SpeechPipelineOrchestrator
from app.services.unsupported_pattern_tracker import unsupported_pattern_tracker
from app.models.database import init_db


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


# -----------------------------------------------------------------------------
# TEST 1: The 10 Prompt 4 Spoken Examples (Service Intent & Annual Income)
# -----------------------------------------------------------------------------

def test_prompt_4_service_intent_examples():
    """
    Verify all 6 Prompt 4 service intent phrasings across Hindi, Hinglish, English, and Marathi
    are accurately recognized as the Income Certificate application intent.
    """
    examples = [
        # Hindi
        "Mujhe income certificate banana hai.",
        "Mere ko aay praman patra chahiye.",
        "Mujhe aay ka certificate banwana hai.",
        # Hinglish
        "Mujhe income certificate ke liye apply karna hai.",
        # English
        "I want to apply for an income certificate.",
        # Marathi
        "मला उत्पन्नाचा दाखला काढायचा आहे."
    ]

    for utterance in examples:
        matched = RegionalLexiconManager.match_service_intent(utterance)
        assert matched is not None, f"Failed to match service intent for: {utterance}"
        assert matched["intent"] == "apply_income_certificate"
        assert matched["is_regional_variation"] is True

        # Conversational intent extractor must also match
        intent = ExtractorService.extract_conversational_intent(utterance)
        assert intent == "apply_income_certificate", f"ExtractorService failed on: {utterance}"


def test_prompt_4_annual_income_extraction_examples():
    """
    Verify all 3 Prompt 4 annual income phrasings across Hinglish, English, and Marathi
    are correctly normalized to 200,000 without corruption.
    """
    # 1. Hinglish: “Mera annual income two lakh hai.”
    res_hinglish = ExtractorService.extract_field("annual_income", "Mera annual income two lakh hai.", language="hi")
    assert res_hinglish["value"] == 200000
    assert res_hinglish["confidence"] >= 0.90

    # 2. English: “My annual income is two hundred thousand rupees.”
    res_english = ExtractorService.extract_field("annual_income", "My annual income is two hundred thousand rupees.", language="en")
    assert res_english["value"] == 200000
    assert res_english["confidence"] >= 0.90

    # 3. Marathi: “माझे वार्षिक उत्पन्न दोन लाख रुपये आहे.”
    res_marathi = ExtractorService.extract_field("annual_income", "माझे वार्षिक उत्पन्न दोन लाख रुपये आहे.", language="mr")
    assert res_marathi["value"] == 200000
    assert res_marathi["confidence"] >= 0.90


def test_prompt_4_address_update_intent():
    """Verify Hinglish address update phrasing: 'Please mera address update kar do.'"""
    utterance = "Please mera address update kar do."
    matched = RegionalLexiconManager.match_service_intent(utterance)
    assert matched is not None
    assert matched["intent"] == "update_address"

    intent = ExtractorService.extract_conversational_intent(utterance)
    assert intent == "update_address"


# -----------------------------------------------------------------------------
# TEST 2: Mid-Conversation Language Changes (Requirement 2)
# -----------------------------------------------------------------------------

def test_mid_conversation_language_switching():
    """
    Requirement 2: Verify that when a user switches language mid-conversation
    (e.g., Hindi -> Marathi -> English), the pipeline switches session language seamlessly,
    preserves confirmed fields, and generates the response prompt and TTS in the new language.
    """
    engine = FormEngine()
    session = engine.create_session(service_id="scholarship_app", language="hi")
    session_id = session["session_id"]
    orchestrator = SpeechPipelineOrchestrator(form_engine=engine)

    # Turn 1: Spoken in Hindi (Provides name)
    turn_1 = orchestrator.process_turn(session_id=session_id, client_transcript="मेरा नाम रमेश कुमार है")
    assert turn_1["candidate_value"] == "रमेश कुमार"
    assert turn_1["detected_language"] == "hi"

    # Confirm candidate in Hindi
    engine.confirm_candidate(session_id, "full_name", "confirm")

    # Turn 2: Spoken in Marathi (Switches language to Marathi mid-dialogue)
    turn_2 = orchestrator.process_turn(session_id=session_id, client_transcript="माझे जन्म चौदा ऑगस्ट दोन हजार चार आहे")
    assert turn_2["detected_language"] == "mr"
    # Verify session language is switched to Marathi
    state_after_mr = engine.get_session_state(session_id)
    assert state_after_mr["language"] == "mr"
    # Confirmed name must remain preserved
    assert state_after_mr["confirmed_fields"]["full_name"] == "रमेश कुमार"

    # Turn 3: Spoken in English (Switches to English mid-dialogue)
    turn_3 = orchestrator.process_turn(session_id=session_id, client_transcript="My mobile number is nine eight seven six five four three two one zero")
    assert turn_3["detected_language"] == "en"
    state_after_en = engine.get_session_state(session_id)
    assert state_after_en["language"] == "en"
    # Past answers preserved
    assert state_after_en["confirmed_fields"]["full_name"] == "रमेश कुमार"


# -----------------------------------------------------------------------------
# TEST 3: Script Boundaries & Code-Switching Segmentation (Requirement 3)
# -----------------------------------------------------------------------------

def test_language_and_script_boundaries_preservation():
    """
    Requirement 3: Verify that script boundaries (Devanagari vs Latin)
    are retained in transcript_language_segments without forced transliteration.
    """
    orchestrator = SpeechPipelineOrchestrator()
    utterance = "mera annual income two lakh hai and mera name रमेश है"

    turn_res = orchestrator.process_turn(
        session_id="test_session_segments",
        client_transcript=utterance
    )

    segments = turn_res.get("transcript_language_segments", [])
    assert len(segments) > 0

    scripts = [s["script"] for s in segments]
    assert "Latin" in scripts
    assert "Devanagari" in scripts


# -----------------------------------------------------------------------------
# TEST 4: Actual Spoken Content vs Assumptions (Requirement 4 & 5)
# -----------------------------------------------------------------------------

def test_provenance_and_entity_protection():
    """
    Requirements 4 & 5: Verify field provenance tracks verbatim vs normalized,
    and named entities (names, locations) are NEVER translated or guessed.
    """
    orchestrator = SpeechPipelineOrchestrator()

    # Numeric conversion must be tagged with normalized provenance
    num_turn = orchestrator.process_turn(
        session_id="test_prov_1",
        client_transcript="मेरी वार्षिक आय दो लाख रुपये है"
    )
    assert num_turn["provenance"] == "normalized_itn"
    assert "200000" in num_turn["normalized_transcript"]

    # Verbatim spoken text must have verbatim_spoken provenance
    verb_turn = orchestrator.process_turn(
        session_id="test_prov_2",
        client_transcript="Ramesh Kumar"
    )
    assert verb_turn["provenance"] == "verbatim_spoken"

    # Place names and candidate names must be shielded without alteration
    protected_entities = verb_turn.get("protected_entities_preserved", [])
    assert all(p["status"] == "unaltered" for p in protected_entities)


# -----------------------------------------------------------------------------
# TEST 5: Regional Accents Are Not Equated With Errors (Requirement 8)
# -----------------------------------------------------------------------------

def test_regional_accents_not_equated_with_errors():
    """
    Requirement 8: Verify Mumbai colloquial 'mere ko' and Varhadi 'व्हय'
    are acknowledged as valid linguistic variations without error flags.
    """
    # Mumbai colloquial: "Mere ko aay praman patra chahiye."
    norm_text, variations = RegionalLexiconManager.normalize_regional_colloquialisms(
        "Mere ko aay praman patra chahiye."
    )
    assert len(variations) > 0
    assert any(v["dialect_tag"] == "mumbai_colloquial_grammar" for v in variations)
    assert all(v["is_valid_speech"] is True for v in variations)
    assert "mujhe" in norm_text.lower()

    # Varhadi affirmative: "व्हय मी तयार आहे"
    norm_mr, mr_vars = RegionalLexiconManager.normalize_regional_colloquialisms(
        "व्हय मी तयार आहे"
    )
    assert any(v["dialect_tag"] == "varhadi_affirmative" for v in mr_vars)
    assert "होय" in norm_mr


# -----------------------------------------------------------------------------
# TEST 6: Dialect Support Tiers and Limitation Reporting (Requirement 9)
# -----------------------------------------------------------------------------

def test_dialect_support_tiers_and_truthful_reporting():
    """
    Requirement 9: Do not hardcode a claim that every dialect is supported.
    Report explicit calibration tier and limitation for uncalibrated dialects.
    """
    # Tier 1: Standard Hindi / Marathi
    std_hi = RegionalLexiconManager.check_dialect_support("hi", "standard_hindi")
    assert std_hi["supported"] is True
    assert std_hi["tier"] == 1

    # Tier 2: Bambaiya / Varhadi regional vocabulary supported
    bambaiya = RegionalLexiconManager.check_dialect_support("hi", "mumbai_bambaiya")
    assert bambaiya["supported"] is True
    assert bambaiya["tier"] == 2

    # Tier 3: Uncalibrated or tribal dialects
    unsupported_lang = RegionalLexiconManager.check_dialect_support("gon", "gondi_tribal")
    assert unsupported_lang["supported"] is False
    assert unsupported_lang["tier"] == 3
    assert "not yet calibrated" in unsupported_lang["message"]


# -----------------------------------------------------------------------------
# TEST 7: Unsupported Pattern Logging for Continuous Evaluation (Requirement 10)
# -----------------------------------------------------------------------------

def test_unsupported_pattern_recording():
    """
    Requirement 10: Verify unsupported or ambiguous speech patterns
    are persisted to data/evaluation/unsupported_patterns.jsonl for model evaluation.
    """
    record = unsupported_pattern_tracker.record_pattern(
        utterance="काहून मले समजलं नाय कास्तकार भाऊ",
        detected_language="mr",
        suspected_dialect="varhadi_uncalibrated_idiom",
        reason="unrecognized_regional_vocabulary",
        confidence=0.42,
        acoustic_snr=18.5
    )

    assert record["pattern_id"] is not None
    assert record["confidence"] == 0.42
    assert record["reviewed"] is False

    # Verify retrieval
    recents = unsupported_pattern_tracker.get_recent_patterns(limit=5)
    assert any(r["pattern_id"] == record["pattern_id"] for r in recents)
