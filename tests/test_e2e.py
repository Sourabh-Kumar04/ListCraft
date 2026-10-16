"""End-to-End integration test with the REAL local Ollama open model."""

import pytest
import httpx
from app.main import app
from app.config import OLLAMA_HOST, OLLAMA_MODEL
from fastapi.testclient import TestClient

client = TestClient(app)


def is_ollama_ready() -> bool:
    try:
        res = httpx.get(f"{OLLAMA_HOST}/api/tags", timeout=3.0)
        if res.status_code == 200:
            models = [m.get("name") for m in res.json().get("models", [])]
            return any(OLLAMA_MODEL in m for m in models)
        return False
    except Exception:
        return False


@pytest.mark.skipif(not is_ollama_ready(), reason="Local Ollama or model not ready yet")
def test_real_local_model_e2e_amazon():
    """Verify complete listing generation using real local open-weight model."""
    payload = {
        "product": "Stainless Steel Water Bottle",
        "marketplace": "amazon",
        "specs": "1L, vacuum insulated, matte black, keeps cold 24h, hot 12h, BPA free, leak-proof chug cap",
        "category": "Sports & Outdoors / Drinkware",
        "price": "$24.99"
    }

    res = client.post("/api/generate", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Title verification
    assert "title" in data
    assert len(data["title"]) > 10
    assert len(data["title"]) <= 200, f"Title length {len(data['title'])} exceeded limit 200"

    # Exactly 5 bullets verification
    assert "bullets" in data
    assert isinstance(data["bullets"], list)
    assert len(data["bullets"]) == 5, f"Expected 5 bullets, got {len(data['bullets'])}"
    for idx, bullet in enumerate(data["bullets"]):
        assert isinstance(bullet, str)
        assert len(bullet.strip()) > 10, f"Bullet {idx+1} too short: {bullet}"

    # Description verification
    assert "description" in data
    assert len(data["description"].strip()) > 50

    # Keywords verification
    assert "keywords" in data
    assert isinstance(data["keywords"], list)
    assert len(data["keywords"]) >= 5
    for kw in data["keywords"]:
        assert isinstance(kw, str)
        assert len(kw) > 1

    # Metadata verification
    assert data["marketplace"] == "Amazon"
    assert data["char_limit"] == 200
    assert data["char_count"] == len(data["title"])
    assert data["model"] == OLLAMA_MODEL
