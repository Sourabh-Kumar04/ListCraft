"""Listing generation engine with marketplace rules enforcement."""

import json
import re
from typing import Dict, Any, List, Optional
from app.config import MARKETPLACE_LIMITS, MARKETPLACE_NAMES, OLLAMA_MODEL
from app.models import ListingRequest, ListingResponse
from app.prompts import build_system_prompt, build_user_prompt
from app.ollama_client import OllamaClient


def clean_markdown_and_parse_json(raw_text: str) -> Dict[str, Any]:
    """Parse JSON from raw LLM output, handling markdown blocks or surrounding text."""
    text = raw_text.strip()

    # Direct parse attempt
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Match ```json ... ``` or ``` ... ```
    code_block_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1))
        except json.JSONDecodeError:
            pass

    # Match outer-most curly braces
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace : last_brace + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # Fallback heuristic parsing if JSON was malformed
    result: Dict[str, Any] = {
        "title": "",
        "bullets": [],
        "description": "",
        "keywords": [],
    }

    # Extract title
    title_match = re.search(r'"title"\s*:\s*"([^"]+)"', text)
    if title_match:
        result["title"] = title_match.group(1)

    # Extract description
    desc_match = re.search(r'"description"\s*:\s*"([^"]+)"', text)
    if desc_match:
        result["description"] = desc_match.group(1)

    # Extract bullets
    bullets_match = re.search(r'"bullets"\s*:\s*\[(.*?)\]', text, re.DOTALL)
    if bullets_match:
        raw_items = re.findall(r'"([^"]+)"', bullets_match.group(1))
        result["bullets"] = [item.strip() for item in raw_items if item.strip()]

    # Extract keywords
    kw_match = re.search(r'"keywords"\s*:\s*\[(.*?)\]', text, re.DOTALL)
    if kw_match:
        raw_kws = re.findall(r'"([^"]+)"', kw_match.group(1))
        result["keywords"] = [k.strip() for k in raw_kws if k.strip()]

    return result


def enforce_title_length(title: str, max_chars: int) -> str:
    """Enforce marketplace title length limit without cutting words in half."""
    clean = re.sub(r"\s+", " ", title.strip())
    if not clean:
        return ""
    if len(clean) <= max_chars:
        return clean

    # Truncate to max_chars
    truncated = clean[:max_chars]

    # Find the last whitespace to avoid mid-word truncation
    last_space = truncated.rfind(" ")
    if last_space > int(max_chars * 0.6):
        truncated = truncated[:last_space]

    # Strip trailing punctuation marks that look ugly at cut-off
    truncated = re.sub(r"[\s,\-\|/:]+$", "", truncated)
    return truncated


def enforce_exactly_5_bullets(
    bullets: Any,
    product: str = "",
    specs: str = "",
    marketplace: str = "amazon",
) -> List[str]:
    """Ensure output contains exactly 5 high-quality bullet points."""
    cleaned_bullets: List[str] = []

    if isinstance(bullets, list):
        for item in bullets:
            if not isinstance(item, str):
                continue
            # Strip list prefixes like "* ", "- ", "1. ", "• "
            cleaned = re.sub(r"^\s*([•\*\-]|\d+[\.\)])\s*", "", item).strip()
            if cleaned and len(cleaned) > 5:
                cleaned_bullets.append(cleaned)
    elif isinstance(bullets, str):
        lines = [line.strip() for line in bullets.split("\n") if line.strip()]
        for line in lines:
            cleaned = re.sub(r"^\s*([•\*\-]|\d+[\.\)])\s*", "", line).strip()
            if cleaned and len(cleaned) > 5:
                cleaned_bullets.append(cleaned)

    # If we have more than 5, take the first 5
    if len(cleaned_bullets) >= 5:
        return cleaned_bullets[:5]

    # If fewer than 5, supplement with high-value product bullets
    fallback_templates = [
        f"PREMIUM CRAFTSMANSHIP: Engineered for {product} with high-grade materials and rigorous quality control for daily reliability.",
        f"PERFECT FOR EVERYDAY USE: Designed to effortlessly fit your routine with durable construction and user-friendly features ({specs[:45]}).",
        f"OPTIMIZED PERFORMANCE: Built to deliver peak performance and convenience, making it a reliable choice for long-term satisfaction.",
        f"THOUGHTFUL DESIGN: Combines modern aesthetics with practical utility, ensuring a seamless user experience.",
        f"CUSTOMER SATISFACTION GUARANTEED: Carefully inspected and packed to ensure it arrives in pristine condition ready to impress.",
    ]

    for template in fallback_templates:
        if len(cleaned_bullets) >= 5:
            break
        cleaned_bullets.append(template)

    return cleaned_bullets[:5]


def extract_and_clean_keywords(
    raw_keywords: Any,
    product: str = "",
    specs: str = "",
) -> List[str]:
    """Extract, deduplicate, and clean backend search keywords."""
    candidate_list: List[str] = []

    if isinstance(raw_keywords, list):
        candidate_list = [str(k) for k in raw_keywords]
    elif isinstance(raw_keywords, str):
        candidate_list = [k.strip() for k in raw_keywords.replace("\n", ",").split(",")]

    cleaned_keywords: List[str] = []
    seen = set()

    for item in candidate_list:
        # Lowercase and remove punctuation except hyphens/spaces
        term = re.sub(r"[^\w\s-]", "", item.lower()).strip()
        # Remove consecutive spaces
        term = re.sub(r"\s+", " ", term)
        if term and term not in seen and len(term) >= 2 and len(term) <= 40:
            seen.add(term)
            cleaned_keywords.append(term)

    # If keywords are scarce, extract tokens from product and specs
    if len(cleaned_keywords) < 5:
        source_text = f"{product} {specs}"
        tokens = re.findall(r"\b[a-zA-Z0-9-]{3,}\b", source_text.lower())
        stopwords = {
            "and", "for", "with", "the", "this", "that", "from", "are", "have",
            "has", "high", "made", "best", "great", "very", "every", "your"
        }
        for token in tokens:
            if token not in stopwords and token not in seen:
                seen.add(token)
                cleaned_keywords.append(token)
                if len(cleaned_keywords) >= 8:
                    break

    return cleaned_keywords[:12]


class ListingGenerator:
    def __init__(
        self,
        ollama_client: Optional[OllamaClient] = None,
        model: Optional[str] = None,
    ):
        self.client = ollama_client or OllamaClient()
        self.model = model or OLLAMA_MODEL

    async def generate_listing(self, req: ListingRequest) -> ListingResponse:
        """Generate marketplace listing adhering strictly to requirements."""
        mkt = req.marketplace.lower().strip()
        limit = MARKETPLACE_LIMITS.get(mkt, 200)
        mkt_name = MARKETPLACE_NAMES.get(mkt, mkt.title())

        system_prompt = build_system_prompt()
        user_prompt = build_user_prompt(
            product=req.product,
            marketplace=mkt,
            specs=req.specs,
            category=req.category or "",
            price=req.price or "",
        )

        raw_output = await self.client.generate_chat(
            user_prompt=user_prompt,
            system_prompt=system_prompt,
            model=self.model,
            temperature=0.3,
        )

        parsed = clean_markdown_and_parse_json(raw_output)

        raw_title = parsed.get("title") or f"{req.product} - {req.specs[:50]}"
        title = enforce_title_length(raw_title, limit)

        raw_bullets = parsed.get("bullets") or []
        bullets = enforce_exactly_5_bullets(raw_bullets, product=req.product, specs=req.specs, marketplace=mkt)

        description = parsed.get("description", "").strip()
        if not description:
            description = (
                f"Introducing the {req.product}. Crafted with precision and engineered for exceptional quality, "
                f"this product features {req.specs}. Whether you are looking for long-lasting durability or "
                f"everyday convenience, the {req.product} delivers unmatched performance and value."
            )

        raw_keywords = parsed.get("keywords") or []
        keywords = extract_and_clean_keywords(raw_keywords, product=req.product, specs=req.specs)

        return ListingResponse(
            title=title,
            bullets=bullets,
            description=description,
            keywords=keywords,
            marketplace=mkt_name,
            char_count=len(title),
            char_limit=limit,
            model=self.model,
        )
