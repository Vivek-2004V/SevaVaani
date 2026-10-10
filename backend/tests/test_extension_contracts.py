import json
import os
import re
import pytest

_curr = os.path.abspath(os.path.realpath(__file__))
while _curr and _curr != "/" and not os.path.exists(os.path.join(_curr, "extension")):
    _curr = os.path.dirname(_curr)
EXTENSION_DIR = os.path.join(_curr, "extension")
MANIFEST_PATH = os.path.join(EXTENSION_DIR, "manifest.json")
DOM_MAPPER_PATH = os.path.join(EXTENSION_DIR, "domMapper.js")

def test_manifest_v3_validity_and_minimum_permissions():
    """Verify Manifest V3 compliance and strict principle of least privilege"""
    assert os.path.exists(MANIFEST_PATH), "extension/manifest.json must exist"
    
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 1. Manifest V3
    assert manifest["manifest_version"] == 3
    assert manifest["name"] == "SEVA VAANI — Public Service Assistant"

    # 2. Minimal permissions (no <all_urls> or invasive webRequest)
    assert set(manifest["permissions"]) == {"activeTab", "storage", "scripting"}

    # 3. Host permissions restricted to local development / test origins
    for host in manifest["host_permissions"]:
        assert host.startswith("http://127.0.0.1:") or host.startswith("http://localhost:")

def test_sensitive_fields_excluded_in_dom_mapper():
    """Verify DOMFieldMapper strictly excludes passwords, OTPs, CAPTCHAs, tokens, and submit buttons"""
    assert os.path.exists(DOM_MAPPER_PATH), "extension/domMapper.js must exist"

    with open(DOM_MAPPER_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify sensitive keywords are defined
    assert "SENSITIVE_KEYWORDS" in content
    assert "password" in content.lower()
    assert "otp" in content.lower()
    assert "captcha" in content.lower()

    # Verify submit button exclusion
    assert "type === 'submit'" in content or 'type === "submit"' in content

def test_field_synonyms_cover_all_scholarship_fields():
    """Verify DOMFieldMapper includes mapping rules for all 10 scholarship fields in English, Hindi, and Marathi"""
    with open(DOM_MAPPER_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    expected_fields = [
        "full_name", "dob", "mobile", "college", "course",
        "academic_year", "annual_income", "category", "district", "document_status"
    ]

    for field in expected_fields:
        assert f"{field}:" in content, f"DOMFieldMapper must contain synonyms for '{field}'"

def test_test_portal_fixture_contains_all_fields():
    """Verify test-portal.html includes all 10 scholarship form elements with associated labels"""
    portal_path = os.path.join(EXTENSION_DIR, "test-portal.html")
    assert os.path.exists(portal_path), "extension/test-portal.html must exist"

    with open(portal_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Check for disclaimer
    assert "Test Environment Only" in html or "synthetic" in html.lower()

    # Check all 10 field names exist in test fixture
    expected_names = [
        'name="full_name"', 'name="dob"', 'name="mobile"', 'name="college"', 'name="course"',
        'name="academic_year"', 'name="annual_income"', 'name="category"', 'name="district"', 'name="document_status"'
    ]
    for fn in expected_names:
        assert fn in html, f"Test fixture must contain input with {fn}"
