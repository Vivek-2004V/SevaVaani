"""
SEVA VAANI - Document Verification & Mismatch Resolution API
Mounted at /api/verify/document.
Guarantees zero persistent storage of identity documents (in-memory processing only).
"""

from __future__ import annotations
from typing import Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel, Field
import json

from app.services.document_verifier import DocumentVerifier

router = APIRouter(prefix="/api/verify", tags=["Document Verification"])


class DocumentVerifyRequest(BaseModel):
    document_type: str = Field(..., description="Type of document (e.g., education_marksheet, income_certificate)")
    document_text: Optional[str] = Field(None, description="Pre-extracted or client-side OCR text")
    target_fields: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Active spoken or form values to compare")
    language: Optional[str] = Field("hi", description="Citizen language for spoken voice guidance (hi/mr/en)")
    service_id: Optional[str] = Field("scholarship", description="Public service ID for scheme rules")
    session_id: Optional[str] = Field(None, description="Optional session ID to log verification audit trail")
    consent_granted: Optional[bool] = Field(True, description="Explicit informed citizen consent for document processing")


@router.get("/document/types")
def get_supported_document_types():
    """Returns all supported document types and scheme eligibility rules."""
    return {
        "success": True,
        "supported_documents": DocumentVerifier.DOC_TYPES,
        "scheme_rules": DocumentVerifier.SCHEME_FIELD_ELIGIBILITY,
    }


@router.post("/document")
def verify_document_json(payload: DocumentVerifyRequest):
    """
    Verifies document content against active form fields via JSON payload.
    Processes entirely in memory with zero storage.
    Logs verification provenance hash to document_verifications if session_id provided.
    """
    result = DocumentVerifier.verify_document_payload(
        doc_type=payload.document_type,
        text_content=payload.document_text,
        target_fields=payload.target_fields,
        lang=payload.language or "hi",
        service_id=payload.service_id or "scholarship",
        consent_granted=payload.consent_granted if payload.consent_granted is not None else True,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Verification failed"))

    # Log audit trail if session_id provided
    if payload.session_id:
        try:
            import hashlib
            from datetime import datetime
            from app.db.engine import get_raw_connection
            from app.core.config import settings

            extracted = result.get("extracted_fields", {})
            hash_val = hashlib.sha256(json.dumps(extracted, sort_keys=True).encode("utf-8")).hexdigest()
            status_val = "MISMATCH" if result.get("has_discrepancy") else "MATCH"
            disc_count = len(result.get("discrepancies", []))

            conn = get_raw_connection(settings.SQLITE_DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO document_verifications (session_id, document_type, status, extracted_fields_hash, discrepancy_count, verified_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (payload.session_id, payload.document_type, status_val, hash_val, disc_count, datetime.utcnow().isoformat())
            )
            conn.commit()
            conn.close()
        except Exception:
            pass  # Non-blocking audit recording

    return result


@router.post("/document/upload")
async def verify_document_upload(
    document_type: str = Form(...),
    language: str = Form("hi"),
    service_id: str = Form("scholarship"),
    target_fields: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Accepts multipart/form-data upload.
    Reads file content purely into memory buffer, processes OCR text, and immediately discards bytes.
    Zero disk write, zero SQLite write.
    """
    parsed_targets = {}
    if target_fields:
        try:
            parsed_targets = json.loads(target_fields)
        except Exception:
            parsed_targets = {}

    text_content = ""
    if file:
        file_bytes = await file.read()
        try:
            # Check if file is readable text or json
            text_content = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            text_content = ""
        finally:
            # Explicitly delete in-memory byte buffer
            del file_bytes

    result = DocumentVerifier.verify_document_payload(
        doc_type=document_type,
        text_content=text_content,
        target_fields=parsed_targets,
        lang=language,
        service_id=service_id,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Verification failed"))
    return result
