"""Tests for FastAPI HTTP endpoints with mocked LLM."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_marketplaces_endpoint():
    res = client.get("/api/marketplaces")
    assert res.status_code == 200
    data = res.json()
    assert "amazon" in data
    assert "flipkart" in data
    assert "etsy" in data
    assert "shopify" in data
    assert data["amazon"]["title_limit"] == 200
    assert data["etsy"]["title_limit"] == 140


def test_health_endpoint():
    with patch("app.main.ollama_client.check_health", new_callable=AsyncMock) as mock_health:
        mock_health.return_value = {
            "connected": True,
            "models": ["gemma2:2b"],
            "status": "ready"
        }
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["ollama_connected"] is True
        assert "gemma2:2b" in data["available_models"]


def test_generate_endpoint_with_mocked_llm():
    mock_llm_json = """
    {
      "title": "ProGrip 1L Stainless Steel Water Bottle - Double Wall Vacuum Insulated Flask",
      "bullets": [
        "[24H COLD & 12H HOT]: Advanced double wall vacuum insulation keeps beverages icy or steaming.",
        "[FOOD GRADE 18/8 STEEL]: Durable rust-proof stainless steel maintains fresh flavor with zero metallic taste.",
        "[100% LEAK-PROOF CHUG CAP]: Engineered with a tight silicone gasket and ergonomic carry handle.",
        "[SWEAT-FREE MATTE FINISH]: Durable powder coat offers secure grip and prevents outer condensation.",
        "[ECO-FRIENDLY & BPA-FREE]: Safe for daily hydration, eliminates reliance on single-use plastics."
      ],
      "description": "Stay hydrated all day with the ProGrip 1L Vacuum Insulated Water Bottle. Built for athletes and adventurers alike, this bottle combines rugged 18/8 stainless steel with cutting-edge thermal retention.",
      "keywords": [
        "stainless steel water bottle",
        "vacuum insulated flask",
        "1 liter sports bottle",
        "matte black drinkware",
        "leakproof chug bottle",
        "cold 24 hours thermo"
      ]
    }
    """

    with patch("app.main.generator.client.generate_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = mock_llm_json

        payload = {
            "product": "Stainless Steel Water Bottle",
            "marketplace": "amazon",
            "specs": "1L capacity, vacuum insulated, matte black, keeps cold 24h",
            "category": "Sports & Outdoors",
            "price": "$24.99"
        }

        res = client.post("/api/generate", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert "title" in data
        assert len(data["title"]) <= 200
        assert "bullets" in data
        assert len(data["bullets"]) == 5
        assert "description" in data
        assert len(data["description"]) > 20
        assert "keywords" in data
        assert len(data["keywords"]) >= 5
        assert data["marketplace"] == "Amazon"


def test_generate_validation_error_invalid_marketplace():
    payload = {
        "product": "Water Bottle",
        "marketplace": "unsupported_market_xyz",
        "specs": "1L vacuum insulated"
    }
    res = client.post("/api/generate", json=payload)
    assert res.status_code == 422  # Pydantic validation error


def test_generate_validation_error_missing_specs():
    payload = {
        "product": "Water Bottle",
        "marketplace": "amazon"
        # missing specs
    }
    res = client.post("/api/generate", json=payload)
    assert res.status_code == 422
