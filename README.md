# ListCraft 🛍️

> **Hacktoberfest Week 2 Project** — *Theme: Side Hustle*  
> An open-weight model product listing writer for e-commerce sellers, D2C brands, and listing agencies.

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)
[![Ollama](https://img.shields.io/badge/Engine-Ollama%20Local-orange.svg)](https://ollama.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 💡 What It Does

**ListCraft** converts raw, messy product information (name, specs, dimensions, materials, price) into marketplace-ready, high-converting product listings in seconds.

For any input product, ListCraft generates:
1. **SEO-Optimized Title**: Tailored to strict marketplace character limits.
2. **Exactly 5 Bullet Points**: Highlighting features, customer benefits, and technical specifications.
3. **Full Product Description**: Formatted copy with appropriate tone and emotional hooks.
4. **Backend Search Keywords**: High-intent search tags, deduplicated and sanitized for seller backend indexing.

### Supported Marketplace Presets

| Marketplace | Title Limit | Tone & Style Guide | Output Focus |
|---|---|---|---|
| **Amazon** | 200 chars | Factual, authoritative, policy-compliant | Feature-benefit headers, zero promotional fluff |
| **Flipkart** | 200 chars | Value-driven, spec-focused, high discovery | Clear Indian e-commerce specs (pack, color, capacity) |
| **Etsy** | 140 chars | Artisanal, conversational, warm, story-driven | Handmade charm, gifting keywords, craftsmanship |
| **Shopify** | Flexible (~160 chars) | Inspiring D2C sales pitch, brand-forward | Problem/solution hook, conversion triggers |

---

## 💼 The Side-Hustle Framing: Who Pays for This?

Creating high-ranking e-commerce listings is tedious, repetitive, and expensive. Many sellers manage dozens or hundreds of SKUs and struggle with strict formatting rules and search visibility:

1. **Marketplace Sellers (Amazon FBA, Flipkart, Etsy shops)**:
   - *Problem*: Sellers launch 10–50 products a month. Writing compliant titles, 5 structured bullets, and backend keywords takes 45–60 minutes per SKU.
   - *Willingness to Pay*: Freelancers and tools charge **$15–$50 per listing**. ListCraft creates listings instantly for $0 API cost.
2. **Direct-to-Consumer (D2C) Brands & Shopify Merchants**:
   - *Problem*: D2C founders need lifestyle-driven, conversion-optimized copy rather than rigid catalog text.
   - *Willingness to Pay*: Monthly subscription ($29–$79/mo) to generate catalog listings across multi-channel expansions.
3. **E-Commerce Catalog & Listing Agencies**:
   - *Problem*: Agencies manage batch uploads for hundreds of clients and need automated generation without leaky third-party proprietary API fees or rate limits.
   - *Willingness to Pay*: White-label software licensing ($199+/mo) or per-catalog batch pricing.

---

## 🧠 Open-Weight Model Architecture

### Exact Open Model Used: `gemma2:2b` (or `gemma2:9b`)

ListCraft is built exclusively on **open-weight, locally hosted Google Gemma models** running via [Ollama](https://ollama.com/) (competing in the Hacktoberfest **Best Use of Gemma** partner category).

#### Why `gemma2:2b`?
- **Zero API Costs & Total Privacy**: No OpenAI, Anthropic, or proprietary APIs. All seller data, upcoming catalog launches, and competitive pricing remain 100% on the seller's machine with zero network egress.
- **Google DeepMind Open Architecture**: Built on Google's lightweight, state-of-the-art Gemma 2 architecture, engineered for nuanced semantic understanding, high-fidelity e-commerce copy, and strict JSON formatting.
- **Ultra-Lean Hardware Footprint**: Consumes only ~1.6 GB of VRAM/RAM, allowing it to run smoothly on standard laptops and developer machines (including 4GB–8GB RAM Linux/WSL environments) with fast local token generation.
- **Drop-in Flexibility**: Users with 16GB+ RAM or dedicated GPUs can seamlessly switch to `gemma2:9b` simply by setting `OLLAMA_MODEL=gemma2:9b`.

---

## 🚀 Quickstart & Setup

### Prerequisites
- Python 3.10+ (tested on Python 3.12 / 3.14)
- [Ollama](https://ollama.com/download) installed locally

### 1. Start Ollama and Pull the Model
```bash
# Start Ollama server in one terminal
ollama serve

# In another terminal, pull the open-weight model
ollama pull gemma2:2b
```
*(Optional: If your machine has 16GB+ RAM and a GPU, you can pull `gemma2:9b` and run `export OLLAMA_MODEL=gemma2:9b`)*

### 2. Install Python Dependencies
```bash
cd 01_Active/listcraft
pip install -r requirements.txt
```

### 3. Run the Application
```bash
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Visit **`http://localhost:8000`** in your browser to access the single-page UI.

---

## 🧪 Running the Test Suite

The test suite validates prompt formatting, character limit enforcement, exact 5-bullet generation, keyword sanitization, API contracts, and live local model end-to-end integration:

```bash
PYTHONPATH=. pytest -v
```

All unit, contract, and integration tests will run and report status.

---

## ⚠️ Honest Limitations

While ListCraft provides production-grade catalog drafting, open-weight models have inherent boundaries:
1. **Dynamic Marketplace API Synced Validation**: ListCraft enforces known character limits (e.g. 200 for Amazon, 140 for Etsy), but marketplace-specific category taxonomy changes (e.g. restricted keywords in medical/pesticide categories) must be reviewed by the seller.
2. **Context Hallucination Risk**: If input specs are extremely sparse (e.g. only "shoes"), the model will extrapolate reasonable everyday features; sellers should always provide accurate raw specifications.
3. **Execution Speed vs. Hardware**: On pure CPU systems without AVX2 or dedicated GPU acceleration, generation may take 5–15 seconds per SKU, compared to 1–2 seconds on an Apple Silicon or NVIDIA RTX GPU.
4. **No Direct Store Publishing**: This MVP generates clean copy and copy-to-clipboard blocks. Direct webhook/REST publishing to Amazon SP-API or Shopify Admin API is planned for future agency tiers.

---

## 📄 License
MIT License. Built with open-source tools for Hacktoberfest 2026.
