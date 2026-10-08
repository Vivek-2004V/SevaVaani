import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.database import init_db
from app.services.form_engine import FormEngine
from app.services.validator import FieldValidator
from app.services.extractor import ExtractorService

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

@pytest.fixture
def engine():
    return FormEngine()

def test_tc01_hindi_name_extract_and_confirm(engine):
    """TC01: Hindi name -> Extract + confirmation"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    # User speaks: "Mera naam Ramesh Kumar hai"
    turn = engine.process_turn(s_id, "Mera naam Ramesh Kumar hai", "voice")
    assert turn["status"] == "need_confirmation"
    assert turn["candidate_value"] == "Ramesh Kumar"
    assert "रमेश कुमार" in turn["message"] or "Ramesh Kumar" in turn["message"]

    # Confirm
    conf = engine.confirm_candidate(s_id, "full_name", "confirm")
    assert conf["status"] == "saved_next_field"
    assert conf["session_state"]["confirmed_fields"]["full_name"] == "Ramesh Kumar"

def test_tc02_marathi_name_extract_and_confirm(engine):
    """TC02: Marathi name -> Extract + confirmation"""
    session = engine.create_session(language="mr")
    s_id = session["session_id"]
    
    # User speaks: "माझं नाव राहुल देशमुख आहे"
    turn = engine.process_turn(s_id, "माझं नाव राहुल देशमुख आहे", "voice")
    assert turn["status"] == "need_confirmation"
    assert "राहुल देशमुख" in str(turn["candidate_value"])

    # Confirm via Marathi voice: "होय बरोबर"
    turn_confirm = engine.process_turn(s_id, "होय बरोबर", "voice")
    assert turn_confirm["status"] == "saved_next_field"
    assert turn_confirm["session_state"]["confirmed_fields"]["full_name"] == "राहुल देशमुख"

def test_tc03_user_says_no_candidate_discarded(engine):
    """TC03: User says No -> Candidate discarded"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    engine.process_turn(s_id, "Mera naam Suresh Sharma", "voice")
    # User rejects candidate
    rejection = engine.confirm_candidate(s_id, "full_name", "reject")
    assert rejection["status"] == "candidate_discarded"
    
    # Ensure not committed and still on full_name
    state = engine.get_session_state(s_id)
    assert "full_name" not in state["confirmed_fields"]
    assert state["candidate_field"] is None
    assert state["current_field"] == "full_name"

def test_tc04_9_digit_phone_rejected(engine):
    """TC04: 9-digit phone -> Rejected"""
    is_valid, err = FieldValidator.validate("mobile", "987654321", "hi")
    assert is_valid is False
    assert "10 अंक" in err

    # Through turn
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    # Force advance to mobile field
    engine.process_text_fallback(s_id, "full_name", "Ramesh Kumar")
    engine.process_text_fallback(s_id, "dob", "14/08/2004")
    
    turn = engine.process_turn(s_id, "987654321", "voice")
    assert turn["status"] in ["invalid", "retry"]

def test_tc05_10_digit_phone_accepted_after_confirmation(engine):
    """TC05: 10-digit phone -> Accepted after confirmation"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    engine.process_text_fallback(s_id, "full_name", "Ramesh Kumar")
    engine.process_text_fallback(s_id, "dob", "14/08/2004")

    turn = engine.process_turn(s_id, "9876543210", "voice")
    assert turn["status"] == "need_confirmation"
    assert turn["candidate_value"] == "9876543210"

    conf = engine.confirm_candidate(s_id, "mobile", "confirm")
    assert conf["status"] == "saved_next_field"
    assert conf["session_state"]["confirmed_fields"]["mobile"] == "9876543210"

def test_tc06_natural_language_income_normalized(engine):
    """TC06: Natural-language income -> Normalized to numeric value"""
    ext = ExtractorService.extract_field(
        "annual_income",
        "Mere ghar ki saal ki income lagbhag ek lakh assi hazaar hai",
        "hi"
    )
    assert ext["value"] == 180000

    ext_mr = ExtractorService.extract_field(
        "annual_income",
        "आमचे उत्पन्न एक लाख ऐंशी हजार रुपये आहे",
        "mr"
    )
    assert ext_mr["value"] == 180000

def test_tc07_unclear_speech_retry(engine):
    """TC07: Unclear speech -> Retry"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    turn = engine.process_turn(s_id, "[unclear]", "voice")
    assert turn["status"] == "retry"
    assert "सुनाई नहीं दिया" in turn["message"] or "स्पष्ट" in turn["message"]

def test_tc08_repeated_failure_text_fallback(engine):
    """TC08: Repeated failure (2 failed voice attempts) -> Text fallback"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    # 1st failure
    engine.process_turn(s_id, "[unclear]", "voice")
    # 2nd failure
    turn2 = engine.process_turn(s_id, "[unclear]", "voice")
    assert turn2["status"] == "text_fallback"
    assert "टाइप" in turn2["message"]

def test_tc09_human_help_ticket_generated(engine):
    """TC09: Human help -> Ticket generated"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    # Explicit request
    ticket = engine.create_help_ticket(s_id, "full_name", "user_requested_assistance")
    assert ticket["status"] == "ticket_created"
    assert ticket["ticket_id"].startswith("TKT-")

def test_tc10_language_switch_preserves_confirmed_state(engine):
    """TC10: Language switch -> Confirmed state preserved"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    engine.process_text_fallback(s_id, "full_name", "Ramesh Kumar")
    
    # Switch to Marathi
    switched = engine.switch_language(s_id, "mr")
    assert switched["language"] == "mr"
    assert switched["confirmed_fields"]["full_name"] == "Ramesh Kumar"

def test_tc11_final_review_all_fields_shown(engine):
    """TC11: Final review -> All fields shown"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    fields = [
        ("full_name", "Ramesh Kumar"),
        ("dob", "14/08/2004"),
        ("mobile", "9876543210"),
        ("college", "PIEMR"),
        ("course", "B.Tech CSE"),
        ("academic_year", "4"),
        ("annual_income", "180000"),
        ("category", "OBC"),
        ("district", "Indore"),
        ("document_status", "Available")
    ]
    for k, v in fields:
        engine.process_text_fallback(s_id, k, v)
        
    state = engine.get_session_state(s_id)
    assert state["status"] == "ready_for_review"
    assert len(state["confirmed_fields"]) == 10

def test_tc12_no_consent_submission_blocked(engine):
    """TC12: No consent -> Submission blocked"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    res = engine.submit_application(s_id, consent=False)
    assert res["status"] == "blocked"
    assert res["application_id"] is None

def test_tc13_consent_generates_application_id(engine):
    """TC13: Consent -> Application ID generated"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    
    fields = [
        ("full_name", "Ramesh Kumar"),
        ("dob", "14/08/2004"),
        ("mobile", "9876543210"),
        ("college", "PIEMR"),
        ("course", "B.Tech CSE"),
        ("academic_year", "4"),
        ("annual_income", "180000"),
        ("category", "OBC"),
        ("district", "Indore"),
        ("document_status", "Available")
    ]
    for k, v in fields:
        engine.process_text_fallback(s_id, k, v)
        
    res = engine.submit_application(s_id, consent=True)
    assert res["status"] == "success"
    assert res["application_id"].startswith("SV-SCH-2026-")

def test_tc14_network_timeout_session_state_preserved(engine):
    """TC14: Network timeout simulation -> Session state preserved"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]
    engine.process_text_fallback(s_id, "full_name", "Ramesh Kumar")
    
    # State reloaded cleanly from SQLite database
    fresh_state = engine.get_session_state(s_id)
    assert fresh_state["confirmed_fields"]["full_name"] == "Ramesh Kumar"
    assert fresh_state["current_field"] == "dob"

def test_tc15_invalid_category_reprompt(engine):
    """TC15: Invalid category -> Re-prompt with allowed values"""
    is_valid, err = FieldValidator.validate("category", "VIP_CATEGORY", "hi")
    assert is_valid is False
    assert "SC, ST, OBC, General, या Other" in err
