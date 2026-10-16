"""FastAPI application entrypoint for ListingWriter."""

import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.models import ListingRequest, ListingResponse, HealthResponse
from app.generator import ListingGenerator
from app.ollama_client import OllamaClient
from app.config import MARKETPLACE_LIMITS, MARKETPLACE_NAMES, OLLAMA_MODEL

app = FastAPI(
    title="ListingWriter",
    description="Open-weight model product listing writer for Amazon, Flipkart, Etsy, and Shopify.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ollama_client = OllamaClient()
generator = ListingGenerator(ollama_client=ollama_client)

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    health = await ollama_client.check_health()
    return HealthResponse(
        status="ok" if health["connected"] else "degraded",
        ollama_connected=health["connected"],
        model=generator.model,
        available_models=health["models"],
    )


@app.get("/api/marketplaces")
async def list_marketplaces():
    return {
        key: {
            "name": MARKETPLACE_NAMES[key],
            "title_limit": MARKETPLACE_LIMITS[key],
        }
        for key in MARKETPLACE_LIMITS
    }


@app.post("/api/generate", response_model=ListingResponse)
async def generate_listing_endpoint(req: ListingRequest):
    try:
        listing = await generator.generate_listing(req)
        return listing
    except Exception as e:
        # Check if it was connection error
        err_msg = str(e)
        if "unreachable" in err_msg.lower() or "connection" in err_msg.lower():
            raise HTTPException(
                status_code=503,
                detail=f"Ollama server is unreachable. Please ensure Ollama is running ('ollama serve'). Error: {err_msg}",
            )
        raise HTTPException(status_code=500, detail=f"Listing generation failed: {err_msg}")


# Mount static assets
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "ListingWriter API is running. Static UI not found."}
