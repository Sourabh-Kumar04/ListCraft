"""Tests for backend search keyword extraction and cleanup."""

import pytest
from app.generator import extract_and_clean_keywords


def test_clean_and_deduplicate_keywords():
    raw = [
        "Stainless Steel Bottle!",
        "stainless steel bottle",  # duplicate
        "VACUUM INSULATED",
        "leak proof flask,",
        "gym water bottle",
        "BPA Free"
    ]
    result = extract_and_clean_keywords(raw)
    assert "stainless steel bottle" in result
    assert "vacuum insulated" in result
    assert "leak proof flask" in result
    # Check deduplication
    assert len([k for k in result if k == "stainless steel bottle"]) == 1
    # Check no trailing exclamation or commas
    for kw in result:
        assert "!" not in kw
        assert "," not in kw


def test_keyword_fallback_extraction():
    # Empty keywords provided
    raw = []
    result = extract_and_clean_keywords(
        raw,
        product="Stainless Steel Water Bottle",
        specs="1L vacuum insulated matte black leakproof chug cap"
    )
    assert len(result) >= 5
    # Should contain relevant extracted terms
    joined = " ".join(result)
    assert "bottle" in joined or "stainless" in joined
    assert "insulated" in joined or "vacuum" in joined
