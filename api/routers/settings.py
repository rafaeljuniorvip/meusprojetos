from fastapi import APIRouter
from pydantic import BaseModel
from config.database import execute, execute_one

router = APIRouter()


class SettingUpdate(BaseModel):
    value: str


@router.get("")
def get_all_settings():
    rows = execute("SELECT key, value, updated_at FROM app_settings ORDER BY key", fetch=True)
    return {r["key"]: r["value"] for r in rows}


@router.get("/{key}")
def get_setting(key: str):
    row = execute_one("SELECT value FROM app_settings WHERE key = %s", (key,))
    return {"key": key, "value": row["value"] if row else None}


@router.put("/{key}")
def set_setting(key: str, req: SettingUpdate):
    execute("""
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (%s, %s, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    """, (key, req.value))
    return {"key": key, "value": req.value}
