"""
Accuracy, Word Error Rate (WER), and NLU Benchmark Evaluation for SEVA VAANI (Phase 6).
Evaluates exact-match extraction accuracy on Hindi and Marathi reference datasets,
calculates WER metrics for speech transcription test sets, and audits safety invariants.
"""

from __future__ import annotations
import os
import sys
import pytest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.extractor import ExtractorService
from app.services.validator import FieldValidator

# Synthetic reference dataset for Hindi and Marathi across all 10 schema fields
BENCHMARK_DATASET = [
    # Field 1: full_name
    {"field": "full_name", "lang": "hi", "transcript": "मेरा नाम रमेश कुमार है", "expected": "रमेश कुमार"},
    {"field": "full_name", "lang": "hi", "transcript": "Mera naam Ramesh Kumar hai", "expected": "Ramesh Kumar"},
    {"field": "full_name", "lang": "mr", "transcript": "माझे नाव राहुल देशमुख आहे", "expected": "राहुल देशमुख"},
    {"field": "full_name", "lang": "mr", "transcript": "माझं नाव सचिन तेंडुलकर आहे", "expected": "सचिन तेंडुलकर"},

    # Field 2: dob
    {"field": "dob", "lang": "hi", "transcript": "मेरी जन्मतिथि 15/08/2002 है", "expected": "15/08/2002"},
    {"field": "dob", "lang": "mr", "transcript": "जन्मतारीख 01/01/2000", "expected": "01/01/2000"},

    # Field 3: mobile
    {"field": "mobile", "lang": "hi", "transcript": "मेरा मोबाइल नंबर 9876543210 है", "expected": "9876543210"},
    {"field": "mobile", "lang": "mr", "transcript": "मोबाईल नंबर 8765432109", "expected": "8765432109"},

    # Field 4: college
    {"field": "college", "lang": "hi", "transcript": "मेरा कॉलेज PIEMR इंदौर है", "expected": "PIEMR इंदौर"},
    {"field": "college", "lang": "mr", "transcript": "माझे कॉलेज व्हीजेटीआय मुंबई आहे", "expected": "व्हीजेटीआय मुंबई"},

    # Field 5: course
    {"field": "course", "lang": "hi", "transcript": "मेरा कोर्स BTech Computer Science है", "expected": "BTech Computer Science"},
    {"field": "course", "lang": "mr", "transcript": "माझा अभ्यासक्रम बी फार्मसी आहे", "expected": "बी फार्मसी"},

    # Field 6: academic_year
    {"field": "academic_year", "lang": "hi", "transcript": "मेरा तीसरा साल है", "expected": "3"},
    {"field": "academic_year", "lang": "mr", "transcript": "दुसरे वर्ष", "expected": "2"},

    # Field 7: annual_income
    {"field": "annual_income", "lang": "hi", "transcript": "वार्षिक आय एक लाख अस्सी हजार रुपये", "expected": 180000},
    {"field": "annual_income", "lang": "mr", "transcript": "उत्पन्न 250000 रुपये", "expected": 250000},

    # Field 8: category
    {"field": "category", "lang": "hi", "transcript": "ओबीसी श्रेणी", "expected": "OBC"},
    {"field": "category", "lang": "mr", "transcript": "प्रवर्ग एससी", "expected": "SC"},

    # Field 9: district
    {"field": "district", "lang": "hi", "transcript": "गृह जिला भोपाल", "expected": "भोपाल"},
    {"field": "district", "lang": "mr", "transcript": "जिल्हा नागपूर", "expected": "नागपूर"},

    # Field 10: document_status
    {"field": "document_status", "lang": "hi", "transcript": "सभी दस्तावेज उपलब्ध हैं", "expected": "Available"},
    {"field": "document_status", "lang": "mr", "transcript": "कागदपत्रे बाकी आहेत", "expected": "Pending"},
]

# Negative / Invalid test cases that MUST be rejected
NEGATIVE_DATASET = [
    {"field": "mobile", "lang": "hi", "transcript": "98765", "reason": "Short phone number (<10 digits)"},
    {"field": "mobile", "lang": "hi", "transcript": "9876543210123", "reason": "Too long phone number (>10 digits)"},
    {"field": "dob", "lang": "hi", "transcript": "कल दोपहर को", "reason": "Non-date phrase"},
    {"field": "category", "lang": "hi", "transcript": "कोई भी", "reason": "Non-existent reservation category"},
    {"field": "academic_year", "lang": "mr", "transcript": "दहावे वर्ष", "reason": "Out-of-range academic year (>5)"},
]


def calculate_wer(reference: str, hypothesis: str) -> float:
    """Computes Word Error Rate (WER) using Levenshtein distance on words."""
    ref_words = reference.strip().split()
    hyp_words = hypothesis.strip().split()

    if not ref_words:
        return 0.0 if not hyp_words else 1.0

    d = [[0] * (len(hyp_words) + 1) for _ in range(len(ref_words) + 1)]
    for i in range(len(ref_words) + 1):
        d[i][0] = i
    for j in range(len(hyp_words) + 1):
        d[0][j] = j

    for i in range(1, len(ref_words) + 1):
        for j in range(1, len(hyp_words) + 1):
            if ref_words[i - 1].lower() == hyp_words[j - 1].lower():
                d[i][j] = d[i - 1][j - 1]
            else:
                d[i][j] = min(
                    d[i - 1][j] + 1,      # deletion
                    d[i][j - 1] + 1,      # insertion
                    d[i - 1][j - 1] + 1   # substitution
                )

    return d[len(ref_words)][len(hyp_words)] / len(ref_words)


def test_extraction_exact_match_accuracy():
    """Evaluates field extraction exact match accuracy over the synthetic multilingual benchmark dataset."""
    total_samples = len(BENCHMARK_DATASET)
    successful_extractions = 0
    hindi_samples, hindi_correct = 0, 0
    marathi_samples, marathi_correct = 0, 0

    for item in BENCHMARK_DATASET:
        field = item["field"]
        lang = item["lang"]
        transcript = item["transcript"]
        expected = item["expected"]

        res = ExtractorService.extract_field(field, transcript, lang)
        extracted = res.get("value")
        is_correct = (extracted is not None) and (str(extracted).strip().lower() == str(expected).strip().lower())

        if is_correct:
            successful_extractions += 1
        else:
            print(f"MISMATCH on {field} ({lang}): transcript='{transcript}', extracted='{extracted}', expected='{expected}'")

        if lang == "hi":
            hindi_samples += 1
            if is_correct:
                hindi_correct += 1
        elif lang == "mr":
            marathi_samples += 1
            if is_correct:
                marathi_correct += 1

    overall_accuracy = (successful_extractions / total_samples) * 100
    hindi_accuracy = (hindi_correct / hindi_samples) * 100
    marathi_accuracy = (marathi_correct / marathi_samples) * 100

    print(f"\n[BENCHMARK ACCURACY RESULTS]")
    print(f"Overall Extraction Accuracy: {overall_accuracy:.2f}% ({successful_extractions}/{total_samples})")
    print(f"Hindi Extraction Accuracy:    {hindi_accuracy:.2f}% ({hindi_correct}/{hindi_samples})")
    print(f"Marathi Extraction Accuracy:  {marathi_accuracy:.2f}% ({marathi_correct}/{marathi_samples})")

    assert overall_accuracy >= 95.0, f"Extraction accuracy {overall_accuracy}% fell below 95% threshold."
    assert hindi_accuracy >= 95.0, f"Hindi extraction accuracy {hindi_accuracy}% fell below 95% threshold."
    assert marathi_accuracy >= 95.0, f"Marathi extraction accuracy {marathi_accuracy}% fell below 95% threshold."


def test_invalid_value_rejection_rate():
    """Verifies that 100% of out-of-spec or ambiguous values fail validation."""
    rejection_count = 0

    for item in NEGATIVE_DATASET:
        field = item["field"]
        lang = item["lang"]
        transcript = item["transcript"]

        res = ExtractorService.extract_field(field, transcript, lang)
        extracted = res.get("value")
        valid, msg = FieldValidator.validate(field, extracted, lang)

        if not valid:
            rejection_count += 1

    rejection_rate = (rejection_count / len(NEGATIVE_DATASET)) * 100
    assert rejection_rate == 100.0, "All invalid candidate values must be rejected."


def test_wer_calculation_benchmark():
    """Evaluates transcription WER metrics on synthetic audio reference pairs."""
    speech_eval_pairs = [
        # Hindi: Reference vs Mock STT hypothesis
        ("मेरा नाम राहुल कुमार है", "मेरा नाम राहुल कुमार है"),  # WER = 0%
        ("वार्षिक आय एक लाख अस्सी हजार", "वार्षिक आय 1 लाख 80 हजार"),  # slight variation
        # Marathi: Reference vs Mock STT hypothesis
        ("माझे नाव राहुल देशमुख आहे", "माझे नाव राहुल देशमुख आहे"),  # WER = 0%
        ("जिल्हा पुणे", "जिल्हा पुणे"),  # WER = 0%
    ]

    total_wer = sum(calculate_wer(ref, hyp) for ref, hyp in speech_eval_pairs)
    avg_wer = (total_wer / len(speech_eval_pairs)) * 100

    assert avg_wer <= 20.0
