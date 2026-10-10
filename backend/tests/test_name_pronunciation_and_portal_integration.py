"""
Comprehensive Test Suite for SEVA VAANI:
- Indian Name Pronunciation, Character-Level Spelling & Aadhaar Name Matching
- Ambiguous Transcript & Zero Silent Overwriting
- Informed Document Consent & Sensitive Aadhaar Masking
- TTS Failure & Cross-Language Voice Protection
- Confirmation Gate & Zero Auto-Submit Contracts
"""

import pytest
import re
from app.models.database import init_db, get_connection
from app.services.name_pronunciation import NamePronunciationService
from app.services.document_verifier import DocumentVerifier
from app.services.form_engine import FormEngine
from app.services.tts_pronunciation import TTSPronunciationService
from app.services.validator import FieldValidator


@pytest.fixture(autouse=True)
def setup_test_db():
    init_db()


# ═══════════════════════════════════════════════════════════════════
# 1. Hindi/Marathi Proper-Name Transcription & Character Breakdown
# ═══════════════════════════════════════════════════════════════════

def test_proper_name_decomposition_and_spaced_characters():
    """Verify that proper names are decomposed character-by-character for screen readers and UI badges."""
    # 1. Latin script name
    res_en = NamePronunciationService.decompose_spelling("Meenakshi")
    chars_en = [c["char"] for c in res_en]
    assert chars_en == ["M", "E", "E", "N", "A", "K", "S", "H", "I"]

    spaced_en = NamePronunciationService.get_spaced_spelling("Meenakshi")
    assert spaced_en == "M - E - E - N - A - K - S - H - I"

    # 2. Devanagari script name
    res_hi = NamePronunciationService.decompose_spelling("मीनाक्षी")
    assert len(res_hi) > 0
    assert any(c["type"] == "devanagari" for c in res_hi)

    # 3. Two-word Indian name
    spaced_full = NamePronunciationService.get_spaced_spelling("Ramesh Kumar")
    assert "R - A - M - E - S - H" in spaced_full
    assert "K - U - M - A - R" in spaced_full


# ═══════════════════════════════════════════════════════════════════
# 2. Ambiguous Transcript (Meenakshi vs Minakshi) & Zero Silent Correction
# ═══════════════════════════════════════════════════════════════════

def test_ambiguous_transcript_detection_never_silently_corrects():
    """
    CRITICAL REQUIREMENT:
    User says 'Meenakshi', recognizer returns 'Minakshi'.
    The system MUST NOT silently replace or approve the name, and must flag ambiguity.
    """
    # Check ambiguity detection
    amb_minakshi = NamePronunciationService.detect_spelling_ambiguity("Minakshi")
    assert amb_minakshi["is_ambiguous"] is True
    assert "Meenakshi" in amb_minakshi["known_official_variants"]
    assert amb_minakshi["recommendation"] == "DOCUMENT_OR_SPELLING_VERIFICATION_RECOMMENDED"

    amb_meenakshi = NamePronunciationService.detect_spelling_ambiguity("Meenakshi")
    assert amb_meenakshi["is_ambiguous"] is True
    assert "Minakshi" in amb_meenakshi["known_official_variants"]

    # Dialogue generation must preserve raw name verbatim and warn about official variants
    dialogue = NamePronunciationService.format_name_confirmation_dialogue("Minakshi", language="hi")
    assert dialogue["name"] == "Minakshi"
    assert "Minakshi" in dialogue["display_prompt"]
    assert "Meenakshi" in dialogue["ambiguity_warning"]
    assert dialogue["is_ambiguous"] is True
    assert len(dialogue["controls"]) == 5


# ═══════════════════════════════════════════════════════════════════
# 3. Name Spelling Correction & Cancellation Workflow
# ═══════════════════════════════════════════════════════════════════

def test_spelling_correction_and_rejection_workflow():
    """
    Tests interactive spelling correction via confirm_candidate:
    - User corrects spelling from 'Minakshi' to 'Meenakshi'
    - Candidate is updated, re-validated, and remains unconfirmed until explicit citizen approval.
    - If user cancels / rejects, candidate is discarded with zero unconfirmed commits.
    """
    engine = FormEngine()
    session = engine.create_session(service_id="scholarship_app", language="hi")
    s_id = session["session_id"]

    # Set initial candidate via turn processing
    turn_res = engine.process_turn(s_id, "मेरा नाम Minakshi है")
    assert turn_res["status"] == "need_confirmation"
    assert turn_res["candidate_value"] == "Minakshi"

    # 1. Citizen edits spelling to official Aadhaar spelling 'Meenakshi'
    edit_res = engine.confirm_candidate(
        session_id=s_id,
        field_name="full_name",
        action="edit_spelling",
        updated_value="Meenakshi"
    )
    assert edit_res["status"] == "need_confirmation"
    assert edit_res["candidate_value"] == "Meenakshi"

    # Verify not yet confirmed in DB
    state_mid = engine.get_session_state(s_id)
    assert "full_name" not in state_mid["confirmed_fields"]
    assert state_mid["candidate_field"]["candidate_value"] == "Meenakshi"

    # 2. Citizen cancels / rejects
    reject_res = engine.confirm_candidate(
        session_id=s_id,
        field_name="full_name",
        action="reject"
    )
    assert reject_res["status"] == "candidate_discarded"
    state_after = engine.get_session_state(s_id)
    assert state_after["candidate_field"] is None
    assert "full_name" not in state_after["confirmed_fields"]


# ═══════════════════════════════════════════════════════════════════
# 4. Sensitive Aadhaar Redaction & Masking
# ═══════════════════════════════════════════════════════════════════

def test_aadhaar_number_masking():
    """Verify that full 12-digit Aadhaar numbers are masked to XXXX-XXXX-1234."""
    # Grouped digits
    raw_1 = "Aadhaar: 1234 5678 9012, Name: Meenakshi"
    masked_1 = NamePronunciationService.mask_aadhaar_number(raw_1)
    assert "1234 5678 9012" not in masked_1
    assert "XXXX-XXXX-9012" in masked_1

    # Dashed digits
    raw_2 = "UID: 9876-5432-1098"
    masked_2 = NamePronunciationService.mask_aadhaar_number(raw_2)
    assert "9876-5432-1098" not in masked_2
    assert "XXXX-XXXX-1098" in masked_2

    # Continuous 12 digits
    raw_3 = "Number is 112233445566"
    masked_3 = NamePronunciationService.mask_aadhaar_number(raw_3)
    assert "112233445566" not in masked_3
    assert "XXXX-XXXX-5566" in masked_3


# ═══════════════════════════════════════════════════════════════════
# 5. Document Informed Consent Gate & Refusal
# ═══════════════════════════════════════════════════════════════════

def test_document_consent_refusal_gate():
    """
    CRITICAL PRIVACY REQUIREMENT:
    If citizen refuses consent (consent_granted=False), document processing must be aborted.
    """
    res_refused = DocumentVerifier.verify_document_payload(
        doc_type="identity_card",
        text_content="Name: Meenakshi, Aadhaar: 1234 5678 9012",
        target_fields={"applicant_name": "Minakshi"},
        lang="hi",
        consent_granted=False
    )
    assert res_refused["success"] is False
    assert res_refused["error"] == "DOCUMENT_CONSENT_REFUSED"

    # When consent is granted, in-memory processing occurs with zero storage
    res_granted = DocumentVerifier.verify_document_payload(
        doc_type="identity_card",
        text_content="Name: Meenakshi, Aadhaar: 1234 5678 9012",
        target_fields={"applicant_name": "Minakshi"},
        lang="hi",
        consent_granted=True
    )
    assert res_granted["success"] is True
    assert res_granted["raw_storage_guarantee"] == "ZERO_STORAGE_MEMORY_ONLY_EPHEMERAL"


# ═══════════════════════════════════════════════════════════════════
# 6. OCR Mismatch & Discrepancy Choices (Minakshi vs Meenakshi)
# ═══════════════════════════════════════════════════════════════════

def test_spoken_vs_document_name_comparison():
    """
    Tests phonetic spelling variance detection:
    Spoken 'Minakshi' vs Document 'Meenakshi' must return PHONETIC_SPELLING_MISMATCH,
    generate bilingual explanations, and offer citizen options without silent overwrite.
    """
    # 1. Phonetic spelling match with letter difference
    comp_var = NamePronunciationService.compare_spoken_vs_document_name(
        spoken_name="Minakshi",
        document_name="Meenakshi",
        language="hi"
    )
    assert comp_var["status"] == "PHONETIC_SPELLING_MISMATCH"
    assert comp_var["is_match"] is False
    assert comp_var["suggested_action"] == "CHOOSE_NAME_SPELLING"
    assert len(comp_var["options"]) == 3
    assert any(opt["value"] == "Meenakshi" for opt in comp_var["options"])
    assert any(opt["value"] == "Minakshi" for opt in comp_var["options"])

    # 2. Marathi language localized message
    comp_mr = NamePronunciationService.compare_spoken_vs_document_name(
        spoken_name="Minakshi",
        document_name="Meenakshi",
        language="mr"
    )
    assert "कागदपत्रात 'Meenakshi'" in comp_mr["explanation"]

    # 3. Complete mismatch
    comp_mismatch = NamePronunciationService.compare_spoken_vs_document_name(
        spoken_name="Ramesh Kumar",
        document_name="Suresh Patil",
        language="hi"
    )
    assert comp_mismatch["status"] == "NAME_MISMATCH"
    assert comp_mismatch["is_match"] is False


# ═══════════════════════════════════════════════════════════════════
# 7. TTS Failure & Unavailable Voice Handling
# ═══════════════════════════════════════════════════════════════════

def test_tts_voice_isolation_and_unavailable_voice_honesty():
    """
    Verifies that system never plays Marathi speech using an English or Spanish voice.
    If no Marathi voice is available, returns text-display recommendation honestly.
    """
    # Only English voice available in OS
    available_voices = [{"name": "Alex", "lang": "en-US"}]

    res_mr = TTSPronunciationService.resolve_best_voice("mr", available_voices=available_voices)
    assert res_mr["cross_language_switch_prevented"] is True
    assert res_mr["selected_voice"] is None
    assert res_mr["status"] == "no_locale_match_text_display_recommended"

    # When exact Marathi voice is present
    voices_with_mr = [{"name": "Google मराठी", "lang": "mr-IN"}]
    res_mr_ok = TTSPronunciationService.resolve_best_voice("mr", available_voices=voices_with_mr)
    assert res_mr_ok["selected_voice"] == "Google मराठी"
    assert res_mr_ok["status"] == "exact_voice_match"


# ═══════════════════════════════════════════════════════════════════
# 8. Confirmation Gate & Form Autofill
# ═══════════════════════════════════════════════════════════════════

def test_confirmation_gate_commits_only_on_explicit_confirm():
    """Verifies that field value is ONLY committed upon explicit action='confirm'."""
    engine = FormEngine()
    session = engine.create_session(service_id="scholarship_app", language="hi")
    s_id = session["session_id"]

    # Set candidate
    engine.process_turn(s_id, "मेरा नाम रमेश कुमार है")
    state_before = engine.get_session_state(s_id)
    assert "full_name" not in state_before["confirmed_fields"]

    # Explicit citizen confirmation
    conf_res = engine.confirm_candidate(s_id, "full_name", "confirm")
    assert conf_res["status"] == "saved_next_field"

    # Confirmed in DB
    state_after = engine.get_session_state(s_id)
    assert state_after["confirmed_fields"].get("full_name") == "रमेश कुमार"


# ═══════════════════════════════════════════════════════════════════
# 9. DOM Mapping & Zero Auto-Submit Contracts
# ═══════════════════════════════════════════════════════════════════

def test_dom_mapper_security_and_no_auto_submit():
    """Inspects domMapper.js code directly to guarantee zero auto-submits and sensitive field exclusion."""
    import os
    mapper_path = os.path.join(os.path.dirname(__file__), "..", "..", "extension", "domMapper.js")
    with open(mapper_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Must contain sensitive keywords
    for kw in ["password", "otp", "captcha", "cvv", "card", "aadhaar", "pan"]:
        assert kw in content.lower()

    # Must verify filled DOM value equivalence
    assert "actualVal !== expectedVal" in content or "actualVal === expectedVal" in content

    # Must NEVER programmatically submit form
    assert ".submit()" not in content
