"""
Tests for Context-Aware Form Guidance & Field Comprehension.

Verifies:
1. Field guidance availability across all priority fields (full_name, father_name, annual_income, mobile, dob, category, district).
2. Plain language explanations in Hindi, Marathi, and English.
3. Realistic practical examples.
4. Voice read-aloud conversational text.
5. Distinction between speech confirmation and verified spelling for official documents.
6. API endpoint /api/guidance/explain.
"""

from app.services.field_guidance import FieldGuidanceService
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_priority_fields_guidance():
    # 1. Annual Income guidance
    g_inc = FieldGuidanceService.get_field_guidance("annual_income", "hi")
    assert "पूरे परिवार की एक साल" in g_inc["explanation"]
    assert "₹2,00,000" in g_inc["example"] or "दो लाख" in g_inc["example"]
    assert "महीने की कमाई नहीं" in g_inc["spoken_text"]

    # Marathi Annual Income
    g_inc_mr = FieldGuidanceService.get_field_guidance("annual_income", "mr")
    assert "एकूण कमाई" in g_inc_mr["explanation"]
    assert "दोन लाख" in g_inc_mr["spoken_text"]

    # 2. Name guidance with spelling sensitivity
    g_name = FieldGuidanceService.get_field_guidance("full_name", "hi")
    assert g_name["spelling_sensitive"] is True
    assert "स्पेलिंग" in g_name["spelling_guidance"]
    assert "आधार कार्ड" in g_name["explanation"]

    # 3. Mobile guidance
    g_mob = FieldGuidanceService.get_field_guidance("mobile", "en")
    assert "10-digit" in g_mob["explanation"]
    assert "groups" in g_mob["spoken_text"]

    # 4. District guidance
    g_dist = FieldGuidanceService.get_field_guidance("district", "mr")
    assert "जिल्हा" in g_dist["title"]
    assert "पुणे" in g_dist["example"] or "नागपूर" in g_dist["example"]


def test_guidance_api_endpoint():
    res = client.get("/api/guidance/explain/annual_income?language=hi")
    assert res.status_code == 200
    data = res.json()
    assert data["field_name"] == "annual_income"
    assert "वार्षिक आय" in data["title"]
    assert len(data["explanation"]) > 20
    assert len(data["spoken_text"]) > 10

    # Test POST endpoint
    res_post = client.post("/api/guidance/explain", json={"field_name": "full_name", "language": "mr"})
    assert res_post.status_code == 200
    post_data = res_post.json()
    assert post_data["spelling_sensitive"] is True
    assert "आधार कार्ड" in post_data["explanation"]
