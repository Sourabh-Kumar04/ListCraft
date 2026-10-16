"""Ollama HTTP client for local open-weight model text generation."""

import httpx
from typing import Dict, Any, List, Optional
from app.config import OLLAMA_HOST, OLLAMA_MODEL, OLLAMA_TIMEOUT


class OllamaClient:
    def __init__(self, host: str = OLLAMA_HOST, default_model: str = OLLAMA_MODEL, timeout: float = OLLAMA_TIMEOUT):
        self.host = host.rstrip("/")
        self.default_model = default_model
        self.timeout = timeout

    async def check_health(self) -> Dict[str, Any]:
        """Check if Ollama server is running and list installed models."""
        url = f"{self.host}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    return {
                        "connected": True,
                        "models": models,
                        "status": "ready" if models else "no_models_installed"
                    }
                return {
                    "connected": False,
                    "models": [],
                    "status": f"ollama_error_status_{res.status_code}"
                }
        except Exception as e:
            return {
                "connected": False,
                "models": [],
                "status": f"unreachable: {str(e)}"
            }

    async def generate_chat(
        self,
        user_prompt: str,
        system_prompt: str = "",
        model: Optional[str] = None,
        temperature: float = 0.3,
    ) -> str:
        """Call Ollama chat API to generate response using open-weight model."""
        target_model = model or self.default_model
        url = f"{self.host}/api/chat"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model": target_model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise RuntimeError(
                    f"Ollama API error {res.status_code}: {res.text}. "
                    f"Ensure model '{target_model}' is pulled ('ollama pull {target_model}') and Ollama is running."
                )
            data = res.json()
            message = data.get("message", {})
            content = message.get("content", "")
            return content.strip()
