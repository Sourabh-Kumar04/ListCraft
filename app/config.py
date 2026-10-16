import os

# Ollama API configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "120.0"))

# Marketplace Title Character Limits
MARKETPLACE_LIMITS = {
    "amazon": 200,
    "flipkart": 200,
    "etsy": 140,
    "shopify": 160,  # Shopify flexible SEO recommendation
}

MARKETPLACE_NAMES = {
    "amazon": "Amazon",
    "flipkart": "Flipkart",
    "etsy": "Etsy",
    "shopify": "Shopify",
}
