"""Tests for title-length enforcement across different marketplace limits."""

import pytest
from app.generator import enforce_title_length
from app.config import MARKETPLACE_LIMITS


def test_short_title_unchanged():
    title = "Stainless Steel Water Bottle - 1L Vacuum Insulated"
    result = enforce_title_length(title, max_chars=200)
    assert result == title
    assert len(result) <= 200


def test_amazon_title_limit_enforced():
    long_title = (
        "Super Long Luxury Premium Stainless Steel Water Bottle 1L Double Wall Vacuum Insulated "
        "Flask Leak Proof Sports Hydration Bottle Keeps Cold 24 Hours Hot 12 Hours BPA Free Eco Friendly "
        "Matte Black Finish With Extra Wide Mouth For Gym Running Outdoor Travel Hiking Office Work"
    )
    result = enforce_title_length(long_title, max_chars=MARKETPLACE_LIMITS["amazon"])
    assert len(result) <= MARKETPLACE_LIMITS["amazon"]
    assert not result.endswith(" ")
    assert not result.endswith(",")
    assert not result.endswith("-")


def test_etsy_strict_140_limit_enforced():
    long_title = (
        "Handmade Ceramic Mug Speckled Clay Pottery Cup Modern Artisan Coffee Mug "
        "Rustic Boho Gift for Coffee Lover Hand Thrown Stoneware Earthy Glaze Tea Cup"
    )
    assert len(long_title) > 140
    result = enforce_title_length(long_title, max_chars=MARKETPLACE_LIMITS["etsy"])
    assert len(result) <= 140
    # Ensures word boundary wasn't awkwardly cut in half
    last_word = result.split()[-1]
    assert last_word in long_title


def test_empty_or_whitespace_title():
    assert enforce_title_length("   ", 100) == ""
    assert enforce_title_length("", 100) == ""
