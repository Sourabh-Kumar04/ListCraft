"""Unit tests for prompt builder across all supported marketplaces."""

import pytest
from app.prompts import build_user_prompt, build_system_prompt, MARKETPLACE_GUIDELINES
from app.config import MARKETPLACE_LIMITS


def test_system_prompt_instructs_json_only():
    sys_prompt = build_system_prompt()
    assert "ListCraft" in sys_prompt
    assert "JSON" in sys_prompt


def test_prompt_builder_amazon():
    prompt = build_user_prompt(
        product="Stainless Steel Water Bottle",
        marketplace="amazon",
        specs="1L capacity, vacuum insulated, matte black, keeps cold 24h",
        category="Sports & Outdoors",
        price="$24.99",
    )
    assert "AMAZON" in prompt
    assert f"MAXIMUM {MARKETPLACE_LIMITS['amazon']} CHARACTERS" in prompt
    assert "Stainless Steel Water Bottle" in prompt
    assert "Factual" in prompt or "compliance" in prompt.lower()
    assert "EXACTLY 5" in prompt


def test_prompt_builder_flipkart():
    prompt = build_user_prompt(
        product="Wireless Bluetooth Headphones",
        marketplace="flipkart",
        specs="Active Noise Cancelling, 40h battery, fast charging",
    )
    assert "FLIPKART" in prompt
    assert f"MAXIMUM {MARKETPLACE_LIMITS['flipkart']} CHARACTERS" in prompt
    assert "Wireless Bluetooth Headphones" in prompt


def test_prompt_builder_etsy():
    prompt = build_user_prompt(
        product="Handmade Ceramic Coffee Mug",
        marketplace="etsy",
        specs="12oz, speckled clay, hand-thrown on potter wheel, matte glaze",
    )
    assert "ETSY" in prompt
    assert f"MAXIMUM {MARKETPLACE_LIMITS['etsy']} CHARACTERS" in prompt
    assert "Artisanal" in prompt or "warm" in prompt.lower()
    assert "140" in prompt


def test_prompt_builder_shopify():
    prompt = build_user_prompt(
        product="Ergonomic Office Chair",
        marketplace="shopify",
        specs="Mesh back, adjustable lumbar support, 3D armrests",
    )
    assert "SHOPIFY" in prompt
    assert "Brand" in prompt or "D2C" in prompt
    assert "EXACTLY 5" in prompt
