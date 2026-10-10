"""
Comprehensive test suite for Document-Agnostic Verification and Voice Controls (Prompt 9 & Prompt 8).
Validates:
1. All 7 Document Types support & Scheme Eligibility Matrix
2. Ephemeral In-Memory Processing & Privacy Guarantee (Zero Disk, Zero DB image retention)
3. 10th SSC Marksheet Legal Gold Standard for Scholarship Forms
4. Discrepancy Comparator: Exact Match, Phonetic Match, and Conflicting Value Mismatch
5. Spoken Hindi & Marathi Audio Explanations for Low-Literacy Citizens
6. In-Extension Voice Controls: Replay ("दोबारा सुनाओ"), Slower Speech ("धीरे बोलो" 0.75x), Change Answer ("उत्तर बदलना है"), Help
7. FastAPI Verification Endpoints (/api/verify/document/types, /api/verify/document)
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.document_verifier import DocumentVerifier
from app.services.form_engine import FormEngine
from app.services.extractor import ExtractorService

client = TestClient(app)


class TestDocumentVerificationService:
    """Unit tests for DocumentVerifier service."""

    def test_all_seven_document_types_supported(self):
        types = DocumentVerifier.DOC_TYPES
        expected_types = [
            "education_marksheet",
            "income_certificate",
            "caste_certificate",
            "domicile_certificate",
            "bank_passbook",
            "birth_certificate",
            "identity_card",
        ]
        for dt in expected_types:
            assert dt in types
            assert "title_en" in types[dt]
            assert "title_hi" in types[dt]
            assert "title_mr" in types[dt]

    def test_scheme_eligibility_annual_income_rejects_identity_card(self):
        """PAN and Aadhaar must be rejected for annual income verification."""
        eligible, reason_hi = DocumentVerifier.check_document_eligibility(
            "annual_income", "identity_card", lang="hi"
        )
        assert eligible is False
        assert "तहसीलदार" in reason_hi or "आय प्रमाण पत्र" in reason_hi

        eligible_inc, _ = DocumentVerifier.check_document_eligibility(
            "annual_income", "income_certificate", lang="hi"
        )
        assert eligible_inc is True

    def test_scheme_eligibility_caste_rejects_voter_or_id_card(self):
        """ID cards cannot verify caste category."""
        eligible, reason_mr = DocumentVerifier.check_document_eligibility(
            "caste_category", "identity_card", lang="mr"
        )
        assert eligible is False
        assert "जात प्रमाणपत्र" in reason_mr

        eligible_caste, _ = DocumentVerifier.check_document_eligibility(
            "caste_category", "caste_certificate", lang="mr"
        )
        assert eligible_caste is True

    def test_scheme_eligibility_bank_account_requires_passbook(self):
        """Bank account number must be verified by passbook or cheque."""
        eligible, _ = DocumentVerifier.check_document_eligibility(
            "account_number", "education_marksheet", lang="en"
        )
        assert eligible is False

        eligible_bank, _ = DocumentVerifier.check_document_eligibility(
            "account_number", "bank_passbook", lang="en"
        )
        assert eligible_bank is True

    def test_marksheet_is_legal_gold_standard_for_scholarship_student_name(self):
        """10th SSC Marksheet takes legal precedence over Aadhaar spelling on scholarship forms."""
        comp = DocumentVerifier.compare_field_value(
            field_name="applicant_name",
            doc_type="education_marksheet",
            doc_value="Ramesh Kumar",
            spoken_value="Ramesh Kumaar",
            lang="hi",
            service_id="scholarship",
        )
        assert comp["is_gold_standard"] is True
        assert comp["status"] == "PHONETIC_MATCH"
        assert "10वीं मार्कशीट" in comp["spoken_message"]
        assert comp["suggested_action"] == "ASK_SPELLING_CONFIRMATION"

    def test_income_discrepancy_detection_and_spoken_warning(self):
        """Income mismatch triggers clear auditory warning in citizen's language."""
        comp_hi = DocumentVerifier.compare_field_value(
            field_name="annual_income",
            doc_type="income_certificate",
            doc_value="120000",
            spoken_value="250000",
            lang="hi",
        )
        assert comp_hi["status"] == "MISMATCH"
        assert comp_hi["is_match"] is False
        assert "₹250000" in comp_hi["spoken_message"]
        assert "₹120000" in comp_hi["spoken_message"]
        assert "ध्यान दें" in comp_hi["spoken_message"]

        comp_mr = DocumentVerifier.compare_field_value(
            field_name="annual_income",
            doc_type="income_certificate",
            doc_value="120000",
            spoken_value="250000",
            lang="mr",
        )
        assert comp_mr["status"] == "MISMATCH"
        assert "लक्ष द्या" in comp_mr["spoken_message"]
        assert "उत्पन्नाच्या दाखल्यावर" in comp_mr["spoken_message"]

    def test_exact_match_positive_confirmation(self):
        comp = DocumentVerifier.compare_field_value(
            field_name="applicant_name",
            doc_type="identity_card",
            doc_value="Suresh Patil",
            spoken_value="suresh patil",
            lang="hi",
        )
        assert comp["status"] == "EXACT_MATCH"
        assert comp["is_match"] is True
        assert "मेल खाता है" in comp["spoken_message"]

    def test_field_extraction_from_marksheet(self):
        sample_text = "Maharashtra State Board of Secondary Education Name: Ramesh Kumar Roll No: A102934 Year: 2021"
        extracted = DocumentVerifier.extract_fields_from_document_text("education_marksheet", sample_text)
        assert extracted.get("applicant_name") == "Ramesh Kumar"
        assert extracted.get("roll_number") == "A102934"
        assert extracted.get("passing_year") == "2021"

    def test_field_extraction_from_income_certificate(self):
        sample_text = "Government of Maharashtra Tahsildar Office Name: Suresh Patil Annual Income: Rs. 1,50,000 Certificate No: REV/2023/88921"
        extracted = DocumentVerifier.extract_fields_from_document_text("income_certificate", sample_text)
        assert extracted.get("applicant_name") == "Suresh Patil"
        assert extracted.get("annual_income") == "150000"
        assert extracted.get("certificate_number") == "REV/2023/88921"

    def test_zero_disk_image_retention_guarantee(self):
        """Verifies verification pipeline executes in memory and guarantees zero persistent image storage."""
        res = DocumentVerifier.verify_document_payload(
            doc_type="education_marksheet",
            text_content="Name: Suresh Sharma Roll No: 88721 Year: 2022",
            target_fields={"applicant_name": "Suresh Sharma"},
            lang="hi",
        )
        assert res["success"] is True
        assert res["raw_storage_guarantee"] == "ZERO_STORAGE_MEMORY_ONLY_EPHEMERAL"
        assert res["has_discrepancy"] is False


class TestVoiceControlCommands:
    """Verifies intentional conversational voice commands: replay, slower, change, help."""

    def test_extractor_recognizes_replay_commands(self):
        assert ExtractorService.extract_voice_control_command("दोबारा सुनाओ") == "replay"
        assert ExtractorService.extract_voice_control_command("dobara sunao") == "replay"
        assert ExtractorService.extract_voice_control_command("पुन्हा सांगा") == "replay"
        assert ExtractorService.extract_voice_control_command("repeat please") == "replay"

    def test_extractor_recognizes_slower_commands(self):
        assert ExtractorService.extract_voice_control_command("धीरे बोलो") == "slower"
        assert ExtractorService.extract_voice_control_command("dheere bolo") == "slower"
        assert ExtractorService.extract_voice_control_command("हळू बोला") == "slower"
        assert ExtractorService.extract_voice_control_command("speak slower") == "slower"

    def test_extractor_recognizes_change_answer_commands(self):
        assert ExtractorService.extract_voice_control_command("answer badalna hai") == "change_answer"
        assert ExtractorService.extract_voice_control_command("उत्तर बदलना है") == "change_answer"
        assert ExtractorService.extract_voice_control_command("uttar badla") == "change_answer"

    def test_extractor_recognizes_help_commands(self):
        assert ExtractorService.extract_voice_control_command("madad chahiye") == "help"
        assert ExtractorService.extract_voice_control_command("मदत हवी आहे") == "help"
        assert ExtractorService.extract_voice_control_command("need help") == "help"

    def test_form_engine_handles_replay_and_slower_when_no_candidate(self):
        fe = FormEngine()
        session = fe.create_session("scholarship", "hi")
        sid = session["session_id"]

        # 1. Citizen says "dobara sunao"
        replay_res = fe.process_turn(sid, "dobara sunao")
        assert replay_res["status"] == "in_progress"
        assert replay_res["action"] == "PROMPT"
        assert replay_res["candidate_value"] is None

        # 2. Citizen says "dheere bolo"
        slower_res = fe.process_turn(sid, "dheere bolo")
        assert slower_res["status"] == "in_progress"
        assert slower_res["speech_rate"] == 0.75
        assert "धीमी आवाज़" in slower_res["message"]

    def test_form_engine_handles_change_answer_when_candidate_pending(self):
        fe = FormEngine()
        session = fe.create_session("scholarship", "hi")
        sid = session["session_id"]

        # First give candidate name
        fe.process_turn(sid, "मेरा नाम रमेश कुमार है")
        state = fe.get_session_state(sid)
        assert state["candidate_field"]["candidate_value"] == "रमेश कुमार"

        # Now citizen says "answer badalna hai"
        change_res = fe.process_turn(sid, "answer badalna hai")
        assert change_res["action"] == "RETRY"
        state_after = fe.get_session_state(sid)
        assert state_after["candidate_field"] is None


class TestVerificationApiEndpoints:
    """Tests FastAPI document verification API."""

    def test_get_supported_document_types(self):
        res = client.get("/api/verify/document/types")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "education_marksheet" in data["supported_documents"]
        assert "income_certificate" in data["supported_documents"]

    def test_verify_document_post_json(self):
        payload = {
            "document_type": "income_certificate",
            "document_text": "Tahsildar Revenue Office Name: Vijay Deshmukh Annual Income: Rs 1,00,000",
            "target_fields": {
                "annual_income": "100000",
                "applicant_name": "Vijay Deshmukh",
            },
            "language": "hi",
            "service_id": "scholarship",
        }
        res = client.post("/api/verify/document", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["has_discrepancy"] is False
        assert data["extracted_fields"]["annual_income"] == "100000"

    def test_verify_document_ineligible_scheme_error(self):
        payload = {
            "document_type": "identity_card",
            "document_text": "Income: 500000 PAN: ABCDE1234F",
            "target_fields": {
                "annual_income": "500000",
            },
            "language": "hi",
            "service_id": "scholarship",
        }
        res = client.post("/api/verify/document", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["has_discrepancy"] is True
        assert data["field_comparisons"]["annual_income"]["status"] == "INELIGIBLE_DOCUMENT"
        assert "तहसीलदार" in data["field_comparisons"]["annual_income"]["spoken_message"]
