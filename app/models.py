from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ListingRequest(BaseModel):
    product: str = Field(..., min_length=2, description="Product name or concept")
    marketplace: str = Field(..., description="Target marketplace (amazon, flipkart, etsy, shopify)")
    specs: str = Field(..., min_length=3, description="Features, specs, materials, dimensions")
    category: Optional[str] = Field(default=None, description="Product category")
    price: Optional[str] = Field(default=None, description="Target retail price")

    @field_validator("marketplace")
    @classmethod
    def validate_marketplace(cls, v: str) -> str:
        clean = v.strip().lower()
        valid = {"amazon", "flipkart", "etsy", "shopify"}
        if clean not in valid:
            raise ValueError(f"Marketplace '{v}' is not supported. Choose from: {', '.join(sorted(valid))}")
        return clean


class ListingResponse(BaseModel):
    title: str = Field(..., description="SEO-optimized title respecting marketplace char limit")
    bullets: List[str] = Field(..., min_length=5, max_length=5, description="Exactly 5 compelling benefit/feature bullet points")
    description: str = Field(..., description="Full marketplace product description")
    keywords: List[str] = Field(..., description="Backend search keywords")
    marketplace: str = Field(..., description="Target marketplace name")
    char_count: int = Field(..., description="Title character count")
    char_limit: int = Field(..., description="Marketplace title character limit")
    model: str = Field(..., description="Open-weight model used for generation")


class HealthResponse(BaseModel):
    status: str
    ollama_connected: bool
    model: str
    available_models: List[str]
