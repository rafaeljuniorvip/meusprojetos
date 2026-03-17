from fastapi import APIRouter
from pydantic import BaseModel
from config.database import execute, execute_one

router = APIRouter()


class AllowedEmailsUpdate(BaseModel):
    emails: list[str]


@router.get("/allowed-emails")
def get_allowed_emails():
    row = execute_one("SELECT value FROM app_settings WHERE key = 'allowed_emails'")
    emails = []
    if row and row["value"]:
        emails = [e.strip() for e in row["value"].split(",") if e.strip()]
    return {"emails": emails}


@router.put("/allowed-emails")
def set_allowed_emails(req: AllowedEmailsUpdate):
    value = ",".join(e.strip() for e in req.emails if e.strip())
    execute("""
        INSERT INTO app_settings (key, value, updated_at) VALUES ('allowed_emails', %s, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    """, (value,))
    return {"emails": req.emails, "status": "updated"}


@router.post("/allowed-emails/add")
def add_email(body: dict):
    email = body.get("email", "").strip()
    if not email:
        return {"error": "email required"}
    row = execute_one("SELECT value FROM app_settings WHERE key = 'allowed_emails'")
    current = row["value"] if row and row["value"] else ""
    emails = [e.strip() for e in current.split(",") if e.strip()]
    if email not in emails:
        emails.append(email)
    value = ",".join(emails)
    execute("""
        INSERT INTO app_settings (key, value, updated_at) VALUES ('allowed_emails', %s, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    """, (value,))
    return {"emails": emails}


@router.post("/allowed-emails/remove")
def remove_email(body: dict):
    email = body.get("email", "").strip()
    row = execute_one("SELECT value FROM app_settings WHERE key = 'allowed_emails'")
    current = row["value"] if row and row["value"] else ""
    emails = [e.strip() for e in current.split(",") if e.strip() and e.strip() != email]
    value = ",".join(emails)
    execute("""
        INSERT INTO app_settings (key, value, updated_at) VALUES ('allowed_emails', %s, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    """, (value,))
    return {"emails": emails}
