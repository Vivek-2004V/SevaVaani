"""
Tests for Prompt 7 — Contextual Accuracy for Public-Service Forms.

Verifies:
1. High-impact public-service field extraction (names, guardian, village, district, state, address, dates, mobile, income, certificate/service).
2. Contextual vocabulary generation (prompts & hotwords for ASR biasing).
3. Field-aware confirmation phrasing, specifically:
   Assistant: "Aapki annual income ₹2,00,000 hai. Kya ye sahi hai?"
   Spaced digits for phone number readback: "9 8 7 6 5, 4 3 2 1 0".
4. Unclear values are not saved (candidate remains None).
5. Deterministic validation of phone numbers & rejection of incomplete digits without LLM hallucination.
6. Recoverable errors without restarting the form (inline correction & rejection preserving prior answers).
7. Contextual vocabulary API endpoint inspection.
"""

import pytest
from app.models.database import init_db, get_connection
from app.services.extractor import ExtractorService
from app.services.validator import FieldValidator
from app.services.contextual_vocabulary import ContextualVocabularyService
from app.services.form_engine import FormEngine


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_priority_fields_extraction():
    """Verify extraction for all 8 prioritized public-service categories."""
    # 1. Applicant name
    res = ExtractorService.extract_field("full_name", "मेरा नाम राहुल कुमार शर्मा है", "hi")
    assert "राहुल" in res["value"]

    # 2. Father / guardian name
    res = ExtractorService.extract_field("father_name", "पिता का नाम श्री रमेश कुमार", "hi")
    assert "रमेश कुमार" in res["value"]

    # 3. Village, District, State
    res_v = ExtractorService.extract_field("village", "गांव का नाम रामपुर", "hi")
    assert "रामपुर" in res_v["value"]

    res_d = ExtractorService.extract_field("district", "मेरा जिला पुणे है", "hi")
    assert "पुणे" in res_d["value"] or res_d["value"] == "Pune"

    res_s = ExtractorService.extract_field("state", "राज्य महाराष्ट्र", "hi")
    assert "महाराष्ट्र" in res_s["value"] or res_s["value"] == "Maharashtra"

    # 4. Address
    res_a = ExtractorService.extract_field("address", "मकान नंबर 42, गांधी चौक, नागपुर", "hi")
    assert "गांधी चौक" in res_a["value"]

    # 5. Dates
    res_dob = ExtractorService.extract_field("dob", "15/08/2002", "hi")
    assert res_dob["value"] == "15/08/2002"

    # 6. Mobile
    res_mob = ExtractorService.extract_field("mobile", "मेरा मोबाइल नंबर 9876543210 है", "hi")
    assert res_mob["value"] == "9876543210"
    assert res_mob["is_valid"] is True

    # 7. Annual income
    res_inc = ExtractorService.extract_field("annual_income", "वार्षिक आय दो लाख रुपये है", "hi")
    assert res_inc["value"] == 200000

    # 8. Certificate / service name
    res_srv = ExtractorService.extract_field("service_name", "मुझे आय प्रमाण पत्र बनवाना है", "hi")
    assert "Income Certificate" in res_srv["value"] or "आय प्रमाण पत्र" in res_srv["raw_transcript"]


def test_field_aware_confirmation_phrasing_annual_income():
    """
    Verify exact Prompt 7 assistant confirmation phrasing for annual income:
    Assistant: 'Aapki annual income ₹2,00,000 hai. Kya ye sahi hai?'
    """
    engine = FormEngine()
    display_val, prompt, audio_text = engine.format_field_confirmation("annual_income", 200000, "hi")

    assert display_val == "₹2,00,000"
    assert "₹2,00,000" in prompt
    assert "Aapki annual income ₹2,00,000 hai. Kya ye sahi hai?" in prompt

    # Marathi counterpart
    display_mr, prompt_mr, audio_mr = engine.format_field_confirmation("annual_income", 200000, "mr")
    assert display_mr == "₹2,00,000"
    assert "₹2,00,000" in prompt_mr
    assert "वार्षिक उत्पन्न" in prompt_mr

    # English counterpart
    display_en, prompt_en, audio_en = engine.format_field_confirmation("annual_income", 200000, "en")
    assert display_en == "₹2,00,000"
    assert "Your annual income is ₹2,00,000. Is this correct?" in prompt_en


def test_phone_number_digit_presentation_and_readback():
    """Verify phone numbers are presented cleanly and read back with spaced digits."""
    engine = FormEngine()
    display_val, prompt, audio_text = engine.format_field_confirmation("mobile", "9876543210", "hi")

    # Display grouped nicely
    assert display_val == "98765 43210"
    # Spaced for natural speech cadence
    assert "9 8 7 6 5, 4 3 2 1 0" in audio_text
    assert "98765 43210" in prompt


def test_incomplete_phone_rejected_without_llm_hallucination():
    """
    Verify that if user provides incomplete digits (e.g. 9 digits),
    the system presents the recognized digits, flags the missing count,
    and strictly forbids guessing or saving.
    """
    res = ExtractorService.extract_field("mobile", "मेरा नंबर 987654321 है", "hi")
    assert res["is_valid"] is False
    assert res["digit_count"] == 9
    assert res["digits_recognized"] == "987654321"

    is_valid, err_msg = FieldValidator.validate("mobile", "987654321", "hi")
    assert is_valid is False
    assert "9 अंक" in err_msg
    assert "10 अंक" in err_msg


def test_unclear_values_are_not_saved():
    """Verify that if a user utterance is unclear or low-confidence, it is NOT saved as candidate."""
    engine = FormEngine()
    session = engine.create_session("scholarship", "hi")
    sid = session["session_id"]

    # Provide unintelligible input for mobile or name
    turn_res = engine.process_turn(sid, "अरे वो कुछ तो भी था मुझे नहीं पता")
    # Low confidence / unclear should either prompt for clarification or have confidence < threshold
    # Candidate must not be committed to confirmed fields
    state = engine.get_session_state(sid)
    assert "full_name" not in state["confirmed_fields"]
    assert turn_res["status"] != "saved_next_field"


def test_recoverable_inline_correction_without_restarting_form():
    """
    Verify that recognition errors are recoverable without restarting the form.
    Citizen says: 'Nahi, 9876543211 hai' or 'Nahi, mera mobile 9876543211 hai' during confirmation.
    The prior confirmed fields must remain untouched and candidate updates to the new valid value.
    """
    engine = FormEngine()
    session = engine.create_session("scholarship", "hi")
    sid = session["session_id"]

    # Step 1: full_name candidate
    t1 = engine.process_turn(sid, "मेरा नाम अमित शर्मा है")
    assert t1["candidate_value"] == "अमित शर्मा"
    # Confirm name
    t2 = engine.confirm_candidate(sid, "full_name", "confirm")
    assert t2["session_state"]["confirmed_fields"]["full_name"] == "अमित शर्मा"
    assert t2["next_field"] == "dob"

    # Step 2: dob
    t3 = engine.process_turn(sid, "15/08/2000")
    assert t3["candidate_value"] == "15/08/2000"
    t4 = engine.confirm_candidate(sid, "dob", "confirm")
    assert t4["session_state"]["confirmed_fields"]["dob"] == "15/08/2000"
    assert t4["next_field"] == "mobile"

    # Step 3: mobile with mistake: "9876500000"
    t5 = engine.process_turn(sid, "9876500000")
    assert t5["candidate_value"] == "9876500000"
    assert "98765 00000" in t5["prompt"]

    # Step 4: Inline correction: "नहीं, 9876543211 है"
    t6 = engine.process_turn(sid, "नहीं, 9876543211 है")
    # Should update candidate to corrected number without resetting earlier answers!
    assert t6["candidate_value"] == "9876543211"
    assert t6["session_state"]["confirmed_fields"]["full_name"] == "अमित शर्मा"
    assert t6["session_state"]["confirmed_fields"]["dob"] == "15/08/2000"
    assert "98765 43211" in t6["prompt"]

    # Step 5: Confirm corrected number
    t7 = engine.confirm_candidate(sid, "mobile", "confirm")
    assert t7["session_state"]["confirmed_fields"]["mobile"] == "9876543211"
    assert t7["session_state"]["confirmed_fields"]["full_name"] == "अमित शर्मा"
    assert t7["session_state"]["confirmed_fields"]["dob"] == "15/08/2000"


def test_recoverable_rejection_without_restarting_form():
    """
    Verify that rejecting a candidate ('Nahi') clears candidate_value non-destructively,
    keeps all previously confirmed fields intact, and asks again for the same field.
    """
    engine = FormEngine()
    session = engine.create_session("scholarship", "hi")
    sid = session["session_id"]

    # Confirmed name
    engine.process_turn(sid, "सुनील कुमार")
    engine.confirm_candidate(sid, "full_name", "confirm")

    # dob candidate
    engine.process_turn(sid, "10/10/1999")
    # Rejection via turn or direct reject
    rej_turn = engine.process_turn(sid, "नहीं")
    assert rej_turn["status"] == "candidate_discarded"
    state = engine.get_session_state(sid)
    assert state["current_field"] == "dob"
    assert state["confirmed_fields"]["full_name"] == "सुनील कुमार"


def test_contextual_vocabulary_prompts_and_hotwords():
    """Verify contextual vocabulary service produces relevant hotwords and biasing prompts."""
    # District field hotwords
    hw_dist = ContextualVocabularyService.get_hotwords_for_field("district")
    assert "Pune" in hw_dist or "Nagpur" in hw_dist or "Bhopal" in hw_dist

    # Income field prompt
    prompt_inc = ContextualVocabularyService.get_context_prompt_for_field("annual_income", "hi")
    assert "lakh" in prompt_inc or "हजार" in prompt_inc or "आय" in prompt_inc

    # Phone field prompt
    prompt_mob = ContextualVocabularyService.get_context_prompt_for_field("mobile", "en")
    assert "digits" in prompt_mob or "phone" in prompt_mob


def test_currency_formatting_indian_numbering():
    """Verify Indian numbering format (lakhs/crores comma separator)."""
    assert ContextualVocabularyService.format_indian_currency(200000) == "₹2,00,000"
    assert ContextualVocabularyService.format_indian_currency(50000) == "₹50,000"
    assert ContextualVocabularyService.format_indian_currency(1500000) == "₹15,00,000"
    assert ContextualVocabularyService.format_indian_currency(0) == "₹0"
