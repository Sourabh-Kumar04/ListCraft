"""Tests for bullet point formatting and strict 5-bullet count enforcement."""

import pytest
from app.generator import enforce_exactly_5_bullets


def test_exactly_5_bullets_from_5_items():
    raw = [
        "[VACUUM INSULATION]: Keeps drinks ice cold for 24 hours.",
        "[PREMIUM STEEL]: Made from 18/8 pro-grade stainless steel.",
        "[LEAK PROOF LID]: Patented chug cap prevents spills in bags.",
        "[SWEAT FREE COATING]: Matte powder coating ensures solid grip.",
        "[ECO FRIENDLY]: 100% BPA-free and eliminates single-use plastics."
    ]
    result = enforce_exactly_5_bullets(raw, product="Water Bottle", specs="1L, stainless steel")
    assert len(result) == 5
    assert result == raw


def test_exactly_5_bullets_when_fewer_provided():
    # Only 2 bullets returned by LLM
    raw = [
        "Keeps drinks ice cold for 24 hours with double-wall insulation.",
        "Made from 18/8 pro-grade stainless steel that never rusts."
    ]
    result = enforce_exactly_5_bullets(raw, product="Water Bottle", specs="1L, stainless steel, matte black")
    assert len(result) == 5
    # First two bullets preserved
    assert "Keeps drinks ice cold" in result[0]
    assert "Made from 18/8" in result[1]
    # Subsequent bullets filled with high-value product context
    assert len(result[2]) > 10
    assert len(result[3]) > 10
    assert len(result[4]) > 10


def test_exactly_5_bullets_when_more_provided():
    # 7 bullets returned by LLM
    raw = [f"Bullet item number {i} detailing features" for i in range(1, 8)]
    result = enforce_exactly_5_bullets(raw, product="Water Bottle", specs="1L")
    assert len(result) == 5
    assert "Bullet item number 1" in result[0]
    assert "Bullet item number 5" in result[4]


def test_bullets_cleaned_of_markdown_prefixes():
    raw = [
        "* [INSULATION]: 24 hours cold",
        "- [STEEL]: 18/8 food-grade steel",
        "1. [LID]: Leak-proof cap",
        "• [FINISH]: Matte black powder coat",
        "5) [BPA FREE]: Safe and sustainable"
    ]
    result = enforce_exactly_5_bullets(raw, product="Bottle", specs="1L")
    assert len(result) == 5
    for item in result:
        assert not item.startswith("*")
        assert not item.startswith("-")
        assert not item.startswith("1.")
        assert not item.startswith("•")
        assert not item.startswith("5)")
