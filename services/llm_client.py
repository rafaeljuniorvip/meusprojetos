import time
import json
import httpx
from config.settings import OPENROUTER_API_KEY, OPENROUTER_BASE_URL
from utils import logger


def get_default_model():
    try:
        from config.database import execute_one
        row = execute_one("SELECT value FROM app_settings WHERE key = 'default_model'")
        if row:
            return row["value"]
    except Exception:
        pass
    return "google/gemini-2.5-flash"


def call_openrouter(prompt, system_prompt=None, model=None, max_tokens=4096, retries=3):
    model = model or get_default_model()

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://project-cataloger.local",
        "X-Title": "Project Cataloger",
    }

    body = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }

    for attempt in range(retries):
        try:
            with httpx.Client(timeout=120) as client:
                resp = client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=body,
                )

            if resp.status_code == 429:
                wait = 2 ** (attempt + 1)
                logger.warning(f"Rate limited. Waiting {wait}s...")
                time.sleep(wait)
                continue

            resp.raise_for_status()
            data = resp.json()

            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})

            return {
                "content": content,
                "model": data.get("model", model),
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error (attempt {attempt+1}): {e.response.status_code}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise
        except Exception as e:
            logger.error(f"Error (attempt {attempt+1}): {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise


def parse_json_response(content):
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code blocks
        import re
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
        if match:
            return json.loads(match.group(1))
        raise
