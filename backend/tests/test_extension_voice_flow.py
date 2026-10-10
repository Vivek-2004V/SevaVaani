"""
Comprehensive Integration Tests for SEVA VAANI Browser Extension Voice Assistance.
Verifies:
1. Extension artifact structure (Manifest V3, assistant.html, assistant.js, assistant.css, content.js)
2. Authentication flow: register, login, auth session persistence, unauthorized rejection
3. Authenticated session creation with SQLite linkage
4. Hindi voice workflow (STT turn -> candidate -> explicit confirmation -> SQLite persistence)
5. Transcript editing flow (citizen edits speech recognition result before sending)
6. Language switching (Hindi -> Marathi) preserving confirmed answers
7. Marathi voice workflow (Marathi speech -> Marathi validation -> Marathi confirmation -> SQLite)
8. Answer rejection handling (no silent overwrite, candidate discarded)
9. Text fallback alternative processing
10. Multi-user session isolation and data security
"""

import os
import json
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.engine import get_raw_connection
from app.config import settings

client = TestClient(app)

_curr = os.path.abspath(os.path.realpath(__file__))
while _curr and _curr != "/" and not os.path.exists(os.path.join(_curr, "extension")):
    _curr = os.path.dirname(_curr)
EXTENSION_DIR = os.path.join(_curr, "extension")


# ═══════════════════════════════════════════════════════════════════
# 1. Extension Artifact & Structure Tests
# ═══════════════════════════════════════════════════════════════════

def test_extension_required_files_exist():
    """Verify all required extension files exist and are non-empty."""
    required_files = [
        "manifest.json",
        "assistant.html",
        "assistant.js",
        "assistant.css",
        "content.js",
        "domMapper.js",
        "background.js",
        "test-portal.html"
    ]
    for fn in required_files:
        path = os.path.join(EXTENSION_DIR, fn)
        assert os.path.exists(path), f"Missing extension file: {fn}"
        assert os.path.getsize(path) > 50, f"Extension file is unexpectedly small: {fn}"


def test_assistant_html_contains_voice_and_auth_elements():
    """Verify assistant.html contains language picker, auth panel, transcript editor, and mic controls."""
    html_path = os.path.join(EXTENSION_DIR, "assistant.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Language selection
    assert 'id="language-select"' in html
    assert 'value="hi"' in html
    assert 'value="mr"' in html

    # Auth controls
    assert 'id="auth-bar"' in html
    assert 'id="auth-panel"' in html
    assert 'id="auth-email"' in html
    assert 'id="auth-password"' in html
    assert 'id="logout-btn"' in html

    # Voice & Mic
    assert 'id="mic-btn"' in html
    assert 'id="mic-status-label"' in html

    # Transcript preview & editing
    assert 'id="transcript-card"' in html
    assert 'id="transcript-editor"' in html
    assert 'id="transcript-process-btn"' in html

    # Explicit confirmation
    assert 'id="confirmation-card"' in html
    assert 'id="confirm-yes-btn"' in html
    assert 'id="confirm-no-btn"' in html
    assert 'id="confirm-replay-btn"' in html

    # Text fallback
    assert 'id="fallback-text-input"' in html
    assert 'id="fallback-submit-btn"' in html


def test_content_js_iframe_has_microphone_permission():
    """Verify content.js grants microphone permission attribute to assistant iframe."""
    content_path = os.path.join(EXTENSION_DIR, "content.js")
    with open(content_path, "r", encoding="utf-8") as f:
        js = f.read()
    assert "allow" in js and "microphone" in js, "content.js must set allow='microphone' on iframe"


# ═══════════════════════════════════════════════════════════════════
# 2. Authentication & Session Integration Tests
# ═══════════════════════════════════════════════════════════════════

def _get_auth_token_and_user_id():
    """Helper to register and login a test citizen."""
    unique_email = f"citizen_{uuid.uuid4().hex[:6]}@example.com"
    password = "StrongPassword123!"

    reg_res = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": password
    })
    user_data = reg_res.json()
    user_id = user_data["id"]

    login_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": password
    })
    login_data = login_res.json()
    return login_data["token"], user_id


def test_auth_workflow_and_token_issuance():
    """Verify user registration, login, and token generation."""
    token, user_id = _get_auth_token_and_user_id()
    assert token and len(token) > 20

    # GET /api/auth/me with Bearer token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["id"] == user_id

    # Unauthorized rejection
    bad_res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token"})
    assert bad_res.status_code == 401


def test_authenticated_session_linked_in_sqlite():
    """Verify creating a session with Bearer token persists user_id into SQLite."""
    token, user_id = _get_auth_token_and_user_id()

    res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    sess_data = res.json()
    session_id = sess_data["session_id"]
    assert sess_data["current_field"] == "full_name"

    # Verify SQLite persistence
    conn = get_raw_connection()
    c = conn.cursor()
    c.execute("SELECT session_id, user_id, language FROM sessions WHERE session_id = ?", (session_id,))
    row = c.fetchone()
    assert row is not None
    assert row["user_id"] == user_id
    assert row["language"] == "hi"

    c.execute("SELECT id, user_id, service_type FROM service_sessions WHERE id = ?", (session_id,))
    ss_row = c.fetchone()
    assert ss_row is not None
    assert ss_row["user_id"] == user_id
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# 3. Complete Hindi Voice Workflow & Confirmation
# ═══════════════════════════════════════════════════════════════════

def test_hindi_voice_workflow_with_sqlite_persistence():
    """
    Test Hindi Voice Flow:
    1. Create session in Hindi
    2. User speaks: 'मेरा नाम विवेक शर्मा है'
    3. Backend extracts 'विवेक शर्मा', requests confirmation
    4. Confirm: action = 'confirm'
    5. Confirmed answer persisted to SQLite form_answers
    6. System advances to 'dob' with Hindi prompt
    """
    token, user_id = _get_auth_token_and_user_id()

    # 1. Create session
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    # 2. Voice turn
    turn_res = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "मेरा नाम विवेक शर्मा है",
        "input_type": "voice",
        "latency_ms": 110
    })
    assert turn_res.status_code == 200
    t_data = turn_res.json()
    assert t_data["status"] == "need_confirmation"
    assert "विवेक" in t_data["candidate_value"] or "शर्मा" in t_data["candidate_value"]
    assert "क्या यह सही है" in t_data["message"]

    # 3. Explicit confirmation
    conf_res = client.post("/api/confirm", json={
        "session_id": session_id,
        "field_name": "full_name",
        "action": "confirm"
    })
    assert conf_res.status_code == 200
    c_data = conf_res.json()
    assert c_data["status"] == "saved_next_field"
    assert c_data["next_field"] == "dob"
    assert "जन्म तिथि" in c_data["message"] or "स्वीकार" in c_data["message"]

    # 4. Verify SQLite form_answers persistence
    conn = get_raw_connection()
    c = conn.cursor()
    c.execute(
        "SELECT service_session_id, field_key, answer_value, is_confirmed FROM form_answers WHERE service_session_id = ?",
        (session_id,)
    )
    ans = c.fetchall()
    assert len(ans) >= 1
    assert ans[0]["field_key"] == "full_name"
    assert ans[0]["is_confirmed"] == 1
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# 4. Transcript Preview & Editing Flow
# ═══════════════════════════════════════════════════════════════════

def test_transcript_editing_flow():
    """
    Test Transcript Editing:
    Citizen speaks 'मेरा नाम राहुल है', but microphone captured 'राहु'
    Citizen edits transcript to 'राहुल वर्मा' in textarea before processing.
    Backend correctly processes edited transcript.
    """
    token, user_id = _get_auth_token_and_user_id()
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    # Citizen submits edited transcript
    edited_transcript = "राहुल वर्मा"
    turn_res = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": edited_transcript,
        "input_type": "voice",
        "latency_ms": 100
    })
    assert turn_res.status_code == 200
    t_data = turn_res.json()
    assert t_data["status"] == "need_confirmation"
    assert t_data["candidate_value"] == "राहुल वर्मा"


# ═══════════════════════════════════════════════════════════════════
# 5. Language Switching (Hindi -> Marathi) & Marathi Voice Workflow
# ═══════════════════════════════════════════════════════════════════

def test_marathi_voice_workflow_and_language_switching():
    """
    Test Marathi Workflow & Language Switch:
    1. Confirm full_name in Hindi
    2. Switch session language to Marathi ('mr')
    3. Confirmed full_name remains preserved!
    4. Prompt switches to Marathi for dob ('आपली जन्मतारीख काय आहे?')
    5. User speaks in Marathi: 'माझी जन्मतारीख 15 ऑगस्ट 2003 आहे'
    6. Candidate extracted as '15/08/2003'
    7. Marathi confirmation message returned
    8. Confirmed and saved to SQLite
    """
    token, user_id = _get_auth_token_and_user_id()
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    # Confirm full_name
    client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "अमित पाटिल",
        "input_type": "voice"
    })
    client.post("/api/confirm", json={
        "session_id": session_id,
        "field_name": "full_name",
        "action": "confirm"
    })

    # Switch language to Marathi
    lang_res = client.post("/api/session/language", json={
        "session_id": session_id,
        "language": "mr"
    })
    assert lang_res.status_code == 200
    l_data = lang_res.json()
    assert l_data["language"] == "mr"
    assert "अमित पाटिल" in l_data["confirmed_fields"]["full_name"]
    assert "जन्मतारीख" in l_data["current_prompt"]

    # Marathi voice turn for dob
    turn_res = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "माझी जन्मतारीख 15 ऑगस्ट 2003 आहे",
        "input_type": "voice",
        "latency_ms": 130
    })
    assert turn_res.status_code == 200
    t_data = turn_res.json()
    assert t_data["status"] == "need_confirmation"
    assert "15/08/2003" in t_data["candidate_value"]
    # Marathi confirmation phrasing
    assert "जन्मतारीख" in t_data["message"] and ("आहे" in t_data["message"] or "बरोबर" in t_data["message"])

    # Confirm in Marathi
    conf_res = client.post("/api/confirm", json={
        "session_id": session_id,
        "field_name": "dob",
        "action": "confirm"
    })
    assert conf_res.status_code == 200
    c_data = conf_res.json()
    assert c_data["status"] == "saved_next_field"
    assert c_data["next_field"] == "mobile"

    # Verify both fields in SQLite
    conn = get_raw_connection()
    c = conn.cursor()
    c.execute(
        "SELECT field_key, answer_value, is_confirmed FROM form_answers WHERE service_session_id = ? ORDER BY id",
        (session_id,)
    )
    rows = c.fetchall()
    assert len(rows) == 2
    from app.core.encryption import FieldEncryptionService
    assert FieldEncryptionService.decrypt_value(rows[1]["answer_value"]) == "15/08/2003"
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# 6. Rejection & Retry Handling (Zero Auto-Submit Guard)
# ═══════════════════════════════════════════════════════════════════

def test_rejection_discards_candidate_without_overwriting():
    """
    Test Rejection Gate:
    If candidate is wrong, user rejects it ('action': 'reject').
    Candidate must be cleared and field not advanced.
    """
    token, user_id = _get_auth_token_and_user_id()
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "रवि",
        "input_type": "voice"
    })

    # User rejects candidate
    rej_res = client.post("/api/confirm", json={
        "session_id": session_id,
        "field_name": "full_name",
        "action": "reject"
    })
    assert rej_res.status_code == 200
    r_data = rej_res.json()
    assert r_data["status"] in ["rejected", "candidate_discarded"]
    # Session current_field remains full_name
    assert r_data["session_state"]["current_field"] == "full_name"
    assert "full_name" not in r_data["session_state"]["confirmed_fields"]


# ═══════════════════════════════════════════════════════════════════
# 7. Text Fallback Alternative
# ═══════════════════════════════════════════════════════════════════

def test_text_fallback_alternative():
    """Verify typing an answer via fallback endpoint succeeds and progresses field."""
    token, user_id = _get_auth_token_and_user_id()
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    fb_res = client.post("/api/fallback/text", json={
        "session_id": session_id,
        "field_name": "full_name",
        "typed_value": "मनोज कुमार"
    })
    assert fb_res.status_code == 200
    fb_data = fb_res.json()
    assert fb_data["status"] == "need_confirmation" or fb_data["status"] == "saved_next_field"


# ═══════════════════════════════════════════════════════════════════
# 8. Conversational Intent & Voice Confirmation Regression Tests
# ═══════════════════════════════════════════════════════════════════

def test_conversational_greeting_and_help_intents():
    """Verify that greetings and help requests do not fail validation or penalize attempts."""
    token, _ = _get_auth_token_and_user_id()
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    # 1. Hindi Greeting
    turn_greet = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "नमस्ते",
        "input_type": "voice"
    })
    assert turn_greet.status_code == 200
    g_data = turn_greet.json()
    assert g_data["status"] == "greeting"
    assert "नमस्ते" in g_data["message"]
    assert g_data["session_state"]["current_field_attempts"] == 0

    # 2. Hindi Help Request
    turn_help = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "मदद चाहिए",
        "input_type": "voice"
    })
    assert turn_help.status_code == 200
    h_data = turn_help.json()
    assert h_data["status"] == "help"
    assert "मदद" in h_data["message"]
    assert h_data["session_state"]["current_field_attempts"] == 0

    # 3. Marathi Greeting
    client.post("/api/session/language", json={"session_id": session_id, "language": "mr"})
    turn_mr_greet = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "नमस्कार",
        "input_type": "voice"
    })
    assert turn_mr_greet.status_code == 200
    mr_g_data = turn_mr_greet.json()
    assert mr_g_data["status"] == "greeting"
    assert "नमस्कार" in mr_g_data["message"]


def test_conversational_cancellation_discards_pending_candidate():
    """Verify speaking a cancellation intent discards the candidate waiting for confirmation."""
    token, _ = _get_auth_token_and_user_id()
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    # Generate candidate
    client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "रोहित शर्मा",
        "input_type": "voice"
    })

    # Citizen says 'रद्द करो'
    turn_cancel = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "रद्द करो",
        "input_type": "voice"
    })
    assert turn_cancel.status_code == 200
    c_data = turn_cancel.json()
    assert c_data["status"] in ["rejected", "candidate_discarded"]
    assert "full_name" not in c_data["session_state"]["confirmed_fields"]


def test_voice_confirmation_via_utterance():
    """Verify citizen confirming candidate with natural speech 'होय बरोबर' commits field."""
    token, _ = _get_auth_token_and_user_id()
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "mr"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    # Provide candidate
    turn_name = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "सुनील गावस्कर",
        "input_type": "voice"
    })
    assert turn_name.json()["status"] == "need_confirmation"

    # Confirm via Marathi voice affirmation
    turn_conf = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "होय बरोबर",
        "input_type": "voice"
    })
    assert turn_conf.status_code == 200
    conf_data = turn_conf.json()
    assert conf_data["status"] == "saved_next_field"
    assert conf_data["session_state"]["confirmed_fields"]["full_name"] == "सुनील गावस्कर"


# ═══════════════════════════════════════════════════════════════════
# 9. Conversational Extraction, Ambiguity, DOM & No Auto-Submit Tests
# ═══════════════════════════════════════════════════════════════════

def test_conversational_greeting_name_extraction():
    """Verify that conversational greetings like 'हेलो मेरा नाम...' cleanly extract name."""
    from app.services.extractor import ExtractorService

    res_hi = ExtractorService.extract_field("full_name", "हेलो मेरा नाम विवेक विश्वकर्मा है", "hi")
    assert res_hi["value"] == "विवेक विश्वकर्मा"
    assert res_hi["confidence"] >= 0.90

    res_mr = ExtractorService.extract_field("full_name", "नमस्कार माझं नाव अमोल शिंदे आहे", "mr")
    assert res_mr["value"] == "अमोल शिंदे"
    assert res_mr["confidence"] >= 0.90

    res_en = ExtractorService.extract_field("full_name", "Hello my name is Vivek Vishwakarma", "en")
    assert res_en["value"] == "Vivek Vishwakarma"

    res_dob = ExtractorService.extract_field("dob", "चौदह अगस्त दो हज़ार चार", "hi")
    assert res_dob["value"] == "14/08/2004"


def test_ambiguous_and_invalid_answers_require_clarification():
    """Verify that ambiguous or invalid inputs trigger retry without inventing personal details."""
    token, _ = _get_auth_token_and_user_id()
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    # Provide digits for name (ambiguous/invalid)
    turn_ambig = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "12345",
        "input_type": "voice"
    })
    assert turn_ambig.status_code == 200
    data = turn_ambig.json()
    # Must ask for clarification or retry, NEVER invent names
    assert data["status"] in ["invalid", "retry", "need_confirmation"]
    # Check that confirmed_fields does not have an invented name
    assert "full_name" not in data["session_state"]["confirmed_fields"]


def test_inline_user_correction_updates_candidate():
    """Verify inline correction 'नहीं, मेरा नाम सुरेश रैना है' updates candidate."""
    token, _ = _get_auth_token_and_user_id()
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    # Turn 1: Initial candidate
    client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "महेश कुमार",
        "input_type": "voice"
    })

    # Turn 2: Inline correction
    turn_corr = client.post("/api/assist/turn", json={
        "session_id": session_id,
        "transcript": "नहीं, मेरा नाम सुरेश रैना है",
        "input_type": "voice"
    })
    assert turn_corr.status_code == 200
    corr_data = turn_corr.json()
    assert corr_data["status"] == "need_confirmation"
    assert corr_data["candidate_value"] == "सुरेश रैना"


def test_no_automatic_submission_guarantee():
    """Verify unconfirmed forms cannot be auto-submitted."""
    token, _ = _get_auth_token_and_user_id()
    s_res = client.post(
        "/api/session",
        json={"service_id": "scholarship_app", "language": "hi"},
        headers={"Authorization": f"Bearer {token}"}
    )
    session_id = s_res.json()["session_id"]

    # Attempting to submit in-progress session without reviewing must fail
    sub_res = client.post("/api/submit", json={
        "session_id": session_id,
        "consent": True
    })
    # Must fail or require review
    assert sub_res.status_code in [400, 422] or sub_res.json().get("status") != "submitted"


def test_dom_mapper_and_extension_contracts():
    """Verify extension files include DOM verification and framework event dispatches."""
    import os
    dom_mapper_path = os.path.join(EXTENSION_DIR, "domMapper.js")
    assistant_js_path = os.path.join(EXTENSION_DIR, "assistant.js")

    assert os.path.exists(dom_mapper_path)
    assert os.path.exists(assistant_js_path)

    with open(dom_mapper_path, "r", encoding="utf-8") as f:
        dom_content = f.read()
    with open(assistant_js_path, "r", encoding="utf-8") as f:
        asst_content = f.read()

    # Verify input types supported
    assert "checkbox" in dom_content
    assert "radio" in dom_content
    assert "select" in dom_content
    assert "dispatchEvent" in dom_content
    assert "post-fill equivalence" in dom_content or "actualVal" in dom_content

    # Verify assistant does not double up question mark icon
    assert "❓ ❓" not in asst_content
    # Verify postMessage targetOrigin wildcard for cross-frame delivery
    assert "window.parent.postMessage" in asst_content


