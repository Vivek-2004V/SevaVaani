import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.database import init_db
from app.services.form_engine import FormEngine
from app.services.validator import FieldValidator

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

@pytest.fixture
def engine():
    return FormEngine()

def test_localized_prompts_for_all_languages(engine):
    """Verify that Hindi, Marathi, and English produce complete, non-empty localized prompts for all 10 fields"""
    languages = ["hi", "mr", "en"]
    expected_field_names = [
        "full_name", "dob", "mobile", "college", "course",
        "academic_year", "annual_income", "category", "district", "document_status"
    ]

    for lang in languages:
        session = engine.create_session(language=lang)
        s_id = session["session_id"]
        assert session["language"] == lang
        assert session["current_field"] == "full_name"
        assert len(session["current_prompt"]) > 5

        # Check all fields in schema have prompts and labels in this language
        for f in engine.fields:
            prompt = engine.get_localized_field_text(f, "prompt", lang)
            label = engine.get_localized_field_text(f, "label", lang)
            confirm_tmpl = engine.get_localized_field_text(f, "confirm_template", lang)
            retry_prompt = engine.get_localized_field_text(f, "retry_prompt", lang)

            assert prompt and len(prompt) > 5, f"Missing prompt for {f['name']} in {lang}"
            assert label and len(label) > 1, f"Missing label for {f['name']} in {lang}"
            assert confirm_tmpl and "{value}" in confirm_tmpl, f"Missing confirm template for {f['name']} in {lang}"
            assert retry_prompt and len(retry_prompt) > 5, f"Missing retry prompt for {f['name']} in {lang}"

        # Verify underlying field IDs and sequence match exactly
        assert [f["name"] for f in engine.fields] == expected_field_names

def test_hindi_workflow_step_by_step(engine):
    """Verify Hindi step-by-step extraction, confirmation gate, and progression"""
    session = engine.create_session(language="hi")
    s_id = session["session_id"]

    # 1. Spoken Name
    turn = engine.process_turn(s_id, "मेरा नाम रमेश कुमार है", "voice")
    assert turn["status"] == "need_confirmation"
    assert turn["candidate_value"] in ["रमेश कुमार", "Ramesh Kumar"]
    assert "रमेश कुमार" in turn["message"] or "Ramesh Kumar" in turn["message"]

    # Candidate not yet in confirmed fields
    state = engine.get_session_state(s_id)
    assert "full_name" not in state["confirmed_fields"]

    # 2. Confirm
    conf = engine.confirm_candidate(s_id, "full_name", "confirm")
    assert conf["status"] == "saved_next_field"
    assert conf["session_state"]["confirmed_fields"]["full_name"] in ["रमेश कुमार", "Ramesh Kumar"]
    assert conf["session_state"]["current_field"] == "dob"

def test_marathi_workflow_step_by_step(engine):
    """Verify Marathi step-by-step extraction, rejection, retry, and confirmation"""
    session = engine.create_session(language="mr")
    s_id = session["session_id"]

    # 1. Spoken Name in Marathi
    turn = engine.process_turn(s_id, "माझे नाव राहुल सावंत आहे", "voice")
    assert turn["status"] == "need_confirmation"
    assert "राहुल सावंत" in str(turn["candidate_value"]) or "Rahul" in str(turn["candidate_value"])

    # 2. Reject candidate
    rej = engine.confirm_candidate(s_id, "full_name", "reject")
    assert rej["status"] == "candidate_discarded"
    assert "रद्द" in rej["message"]
    state = engine.get_session_state(s_id)
    assert "full_name" not in state["confirmed_fields"]
    assert state["current_field"] == "full_name"

    # 3. Repeat and confirm
    turn2 = engine.process_turn(s_id, "राहुल सावंत", "voice")
    conf = engine.confirm_candidate(s_id, "full_name", "confirm")
    assert conf["status"] == "saved_next_field"
    assert "full_name" in conf["session_state"]["confirmed_fields"]

def test_english_workflow_step_by_step(engine):
    """Verify English fallback extraction, validation, and confirmation"""
    session = engine.create_session(language="en")
    s_id = session["session_id"]
    assert session["current_prompt"].startswith("Please state your full name")

    turn = engine.process_turn(s_id, "My name is Priya Sharma", "voice")
    assert turn["status"] == "need_confirmation"
    assert turn["candidate_value"] == "Priya Sharma"
    assert "Priya Sharma" in turn["message"]

    conf = engine.confirm_candidate(s_id, "full_name", "confirm")
    assert conf["status"] == "saved_next_field"
    assert conf["session_state"]["confirmed_fields"]["full_name"] == "Priya Sharma"
    assert conf["session_state"]["current_field"] == "dob"

def test_validation_error_messages_localized():
    """Verify FieldValidator provides localized error messages in HI, MR, and EN"""
    # 9 digit mobile
    _, err_hi = FieldValidator.validate("mobile", "987654321", "hi")
    _, err_mr = FieldValidator.validate("mobile", "987654321", "mr")
    _, err_en = FieldValidator.validate("mobile", "987654321", "en")

    assert "10 अंक" in err_hi
    assert "१० अंकी" in err_mr
    assert "10 digits" in err_en

    # Invalid category
    _, cat_hi = FieldValidator.validate("category", "InvalidCat", "hi")
    _, cat_mr = FieldValidator.validate("category", "InvalidCat", "mr")
    _, cat_en = FieldValidator.validate("category", "InvalidCat", "en")

    assert "SC, ST, OBC" in cat_hi
    assert "SC, ST, OBC" in cat_mr
    assert "SC, ST, OBC" in cat_en
