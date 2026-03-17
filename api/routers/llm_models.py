import json
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks
from config.database import execute, execute_one, get_connection
from config.settings import OPENROUTER_API_KEY, OPENROUTER_BASE_URL
import httpx

router = APIRouter()


@router.get("")
def list_models(
    provider: str = None,
    favorite_only: bool = False,
    search: str = None,
    page: int = 1,
    per_page: int = 50,
):
    conditions = ["is_available = TRUE"]
    params = []

    if provider:
        conditions.append("provider = %s")
        params.append(provider)
    if favorite_only:
        conditions.append("is_favorite = TRUE")
    if search:
        conditions.append("(model_name ILIKE %s OR model_id ILIKE %s OR description ILIKE %s)")
        params.extend([f"%{search}%"] * 3)

    where = "WHERE " + " AND ".join(conditions)

    count_row = execute_one(f"SELECT COUNT(*) as total FROM llm_models {where}", params or None)
    total = count_row["total"]

    offset = (page - 1) * per_page
    params_page = list(params) + [per_page, offset]

    rows = execute(f"""
        SELECT id, model_id, model_name, provider, description,
               context_length, max_completion_tokens, modality,
               input_modalities, output_modalities, tokenizer,
               pricing_prompt, pricing_completion, pricing_image,
               supported_parameters, is_favorite, model_created_at, fetched_at
        FROM llm_models {where}
        ORDER BY is_favorite DESC, provider, model_name
        LIMIT %s OFFSET %s
    """, params_page, fetch=True)

    # Convert decimals to float for JSON
    for row in rows:
        for k in ["pricing_prompt", "pricing_completion", "pricing_image"]:
            if row.get(k) is not None:
                row[k] = float(row[k])

    return {
        "data": rows,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/current")
def get_current_model():
    row = execute_one("SELECT value FROM app_settings WHERE key = 'default_model'")
    model_id = row["value"] if row else "google/gemini-2.5-flash"
    model = execute_one("SELECT * FROM llm_models WHERE model_id = %s", (model_id,))
    return {"model_id": model_id, "model": model}


@router.put("/current")
def set_current_model(body: dict):
    model_id = body.get("model_id", "")
    execute("""
        INSERT INTO app_settings (key, value, updated_at) VALUES ('default_model', %s, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    """, (model_id,))
    return {"model_id": model_id}


@router.get("/providers")
def list_providers():
    rows = execute(
        "SELECT DISTINCT provider FROM llm_models WHERE provider IS NOT NULL ORDER BY provider",
        fetch=True
    )
    return [r["provider"] for r in rows]


@router.post("/sync")
def sync_models(background_tasks: BackgroundTasks):
    background_tasks.add_task(_sync_from_openrouter)
    return {"status": "syncing", "message": "Sincronização iniciada em background"}


@router.patch("/{model_db_id}/favorite")
def toggle_favorite(model_db_id: int):
    row = execute_one("SELECT is_favorite FROM llm_models WHERE id = %s", (model_db_id,))
    if not row:
        return {"error": "Model not found"}
    new_val = not row["is_favorite"]
    execute("UPDATE llm_models SET is_favorite = %s WHERE id = %s", (new_val, model_db_id))
    return {"id": model_db_id, "is_favorite": new_val}


def _sync_from_openrouter():
    try:
        with httpx.Client(timeout=60) as client:
            resp = client.get(
                f"{OPENROUTER_BASE_URL}/models",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
            )
            resp.raise_for_status()
            data = resp.json()

        models = data.get("data", [])
        now = datetime.now(timezone.utc)
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                for m in models:
                    model_id = m.get("id", "")
                    name = m.get("name", "")
                    provider = model_id.split("/")[0] if "/" in model_id else "unknown"
                    pricing = m.get("pricing", {})
                    arch = m.get("architecture", {})
                    top_prov = m.get("top_provider", {})
                    created_ts = m.get("created")

                    cur.execute("""
                        INSERT INTO llm_models (
                            model_id, model_name, provider, description,
                            context_length, max_completion_tokens, modality,
                            input_modalities, output_modalities, tokenizer,
                            pricing_prompt, pricing_completion, pricing_image, pricing_request,
                            supported_parameters, model_created_at, fetched_at
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (model_id) DO UPDATE SET
                            model_name = EXCLUDED.model_name,
                            provider = EXCLUDED.provider,
                            description = EXCLUDED.description,
                            context_length = EXCLUDED.context_length,
                            max_completion_tokens = EXCLUDED.max_completion_tokens,
                            modality = EXCLUDED.modality,
                            input_modalities = EXCLUDED.input_modalities,
                            output_modalities = EXCLUDED.output_modalities,
                            tokenizer = EXCLUDED.tokenizer,
                            pricing_prompt = EXCLUDED.pricing_prompt,
                            pricing_completion = EXCLUDED.pricing_completion,
                            pricing_image = EXCLUDED.pricing_image,
                            pricing_request = EXCLUDED.pricing_request,
                            supported_parameters = EXCLUDED.supported_parameters,
                            fetched_at = EXCLUDED.fetched_at
                    """, (
                        model_id,
                        name,
                        provider,
                        (m.get("description") or "")[:2000],
                        m.get("context_length"),
                        top_prov.get("max_completion_tokens"),
                        arch.get("modality"),
                        json.dumps(arch.get("input_modalities", [])),
                        json.dumps(arch.get("output_modalities", [])),
                        arch.get("tokenizer"),
                        float(pricing.get("prompt", 0)) * 1_000_000 if pricing.get("prompt") else None,
                        float(pricing.get("completion", 0)) * 1_000_000 if pricing.get("completion") else None,
                        float(pricing.get("image", 0)) if pricing.get("image") else None,
                        float(pricing.get("request", 0)) if pricing.get("request") else None,
                        json.dumps(m.get("supported_parameters", [])),
                        datetime.fromtimestamp(created_ts, tz=timezone.utc) if created_ts else None,
                        now,
                    ))
                conn.commit()
        finally:
            conn.close()

        # Log
        from config.database import execute as db_execute
        db_execute(
            "INSERT INTO run_logs (run_type, status, duration_ms) VALUES (%s,%s,%s)",
            ("llm_sync", "success", 0)
        )
    except Exception as e:
        from config.database import execute as db_execute
        db_execute(
            "INSERT INTO run_logs (run_type, status, error_message) VALUES (%s,%s,%s)",
            ("llm_sync", "error", str(e))
        )
