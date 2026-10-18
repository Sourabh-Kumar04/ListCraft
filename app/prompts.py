"""Per-marketplace prompt templates and tone guidelines for ListCraft."""

from typing import Dict, Any
from app.config import MARKETPLACE_LIMITS

MARKETPLACE_GUIDELINES: Dict[str, Dict[str, Any]] = {
    "amazon": {
        "name": "Amazon",
        "title_limit": MARKETPLACE_LIMITS["amazon"],
        "tone": "Factual, authoritative, highly structured, compliance-ready",
        "style_instructions": (
            "- Title MUST be <= 200 characters. Formula: [Brand] + [Core Product] + [Key Specs/Materials] + [Size/Color/Model].\n"
            "- Do NOT invent or assume a brand name. Only include a brand name if one is explicitly provided in the product details. If no brand is given, write the title without any brand.\n"
            "- Strictly NO promotional buzzwords in title or bullets (e.g., 'Best Seller', 'Free Shipping', '#1', 'Guarantee').\n"
            "- Exactly 5 bullet points. Each bullet MUST start with a capitalized benefit header in brackets or followed by a colon (e.g., '[VACUUM INSULATION]: Keeps drinks ice-cold for 24 hours...').\n"
            "- Description: Professional, detailed product overview focusing on durability, specifications, and everyday utility.\n"
            "- Keywords: High-volume generic search phrases, synonyms, and use cases without brand names or punctuation."
        ),
    },
    "flipkart": {
        "name": "Flipkart",
        "title_limit": MARKETPLACE_LIMITS["flipkart"],
        "tone": "Value-driven, clear, spec-focused, high discovery",
        "style_instructions": (
            "- Title MUST be <= 200 characters. Formula: [Brand] + [Product Name] + [Key Feature / Capacity] + [Color / Pack Details].\n"
            "- Do NOT invent or assume a brand name. Only include a brand name if one is explicitly provided in the product details. If no brand is given, write the title without any brand.\n"
            "- Clear specifications that Indian online shoppers look for (capacity, material grade, dimensions, usage scenario).\n"
            "- Exactly 5 bullet points highlighting value-for-money, build quality, usability, in-the-box utility, and care instructions.\n"
            "- Description: Engaging narrative focusing on daily utility, reliability, and maintenance tips.\n"
            "- Keywords: High-intent search terms, Hindi-English search queries (hinglish search tags), category keywords."
        ),
    },
    "etsy": {
        "name": "Etsy",
        "title_limit": MARKETPLACE_LIMITS["etsy"],
        "tone": "Artisanal, warm, conversational, handmade/lifestyle aesthetic",
        "style_instructions": (
            "- Title MUST be strictly <= 140 characters. Rich in natural, descriptive long-tail aesthetic keywords separated by pipes or commas.\n"
            "- Do NOT invent or assume a brand name. Only include a brand name if one is explicitly provided in the product details. If no brand is given, write the title without any brand.\n"
            "- Warm, evocative, personal tone celebrating craftsmanship, texture, thoughtful design, and gifting appeal.\n"
            "- Exactly 5 bullet points highlighting handmade feel, sustainable/quality materials, gift packaging, aesthetic charm, and maker care.\n"
            "- Description: Story-driven narrative that paints a sensory picture of how the customer will enjoy or gift the piece.\n"
            "- Keywords: Long-tail gift ideas, aesthetic phrases (e.g., 'minimalist gift', 'eco friendly drinkware', 'matte black aesthetic')."
        ),
    },
    "shopify": {
        "name": "Shopify",
        "title_limit": MARKETPLACE_LIMITS["shopify"],
        "tone": "Brand-forward, inspiring, high-converting D2C direct-sales copy",
        "style_instructions": (
            "- Title: Clean, brand-focused, SEO-friendly headline (recommended <= 160 characters).\n"
            "- Do NOT invent or assume a brand name. Only include a brand name if one is explicitly provided in the product details. If no brand is given, write the title without any brand.\n"
            "- Tone is modern, lifestyle-focused, empowering, and persuasive.\n"
            "- Exactly 5 bullet points highlighting unique value proposition (UVP), lifestyle transformation, premium craftsmanship, and customer peace of mind.\n"
            "- Description: High-converting D2C sales pitch with an emotional hook, feature-to-benefit translation, and confident call-to-action.\n"
            "- Keywords: High-intent commercial keywords, Google Shopping search terms, collection tags."
        ),
    },
}


def build_system_prompt() -> str:
    return (
        "You are ListCraft, an elite e-commerce listing copywriter and SEO specialist. "
        "Your task is to take raw product specifications and produce an optimized, marketplace-compliant product listing. "
        "You must return ONLY a valid, parseable JSON object matching the requested schema. "
        "Do not include markdown code fence formatting (such as ```json) if possible, or include only clean JSON without preamble."
    )


def build_user_prompt(
    product: str,
    marketplace: str,
    specs: str,
    category: str = "",
    price: str = "",
) -> str:
    mkt = marketplace.lower().strip()
    guide = MARKETPLACE_GUIDELINES.get(mkt, MARKETPLACE_GUIDELINES["amazon"])
    title_limit = guide["title_limit"]
    tone = guide["tone"]
    style = guide["style_instructions"]

    category_line = f"Category: {category}\n" if category else ""
    price_line = f"Target Price: {price}\n" if price else ""

    return f"""Create an optimized e-commerce product listing for {guide['name'].upper()}.

PRODUCT DETAILS:
Product Name / Concept: {product}
{category_line}{price_line}Specifications & Features:
{specs}

MARKETPLACE RULES FOR {guide['name'].upper()}:
- Title Character Limit: STRICTLY MAXIMUM {title_limit} CHARACTERS (including spaces). Count your characters carefully!
- Tone: {tone}
{style}

OUTPUT SPECIFICATION:
Respond with ONLY a raw JSON object (valid JSON, no extra commentary) with these exact keys:
{{
  "title": "Optimized product title (must be <= {title_limit} characters)",
  "bullets": [
    "First bullet point (benefit + feature)",
    "Second bullet point",
    "Third bullet point",
    "Fourth bullet point",
    "Fifth bullet point"
  ],
  "description": "Full formatted product description suitable for {guide['name']}",
  "keywords": [
    "keyword 1",
    "keyword 2",
    "keyword 3",
    "keyword 4",
    "keyword 5",
    "keyword 6",
    "keyword 7",
    "keyword 8"
  ]
}}

Remember:
1. "bullets" MUST contain EXACTLY 5 strings.
2. "title" MUST NOT exceed {title_limit} characters.
3. Do NOT invent or assume a brand name. Only include a brand name if one is explicitly provided in the product details. If no brand is given, write the title without any brand.
4. "keywords" should contain 6 to 12 relevant search terms.
"""
