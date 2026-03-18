import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from starlette.middleware.sessions import SessionMiddleware
import httpx

from api.routers import projects, stats, timeline, llm_models, actions, scripts, calendar, settings, admin

app = FastAPI(title="Project Cataloger API", version="1.0.0")

SESSION_SECRET = os.getenv("SESSION_SECRET", "catalogador-secret-key-change-me")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
ALLOWED_EMAILS = os.getenv("ALLOWED_EMAILS", "")  # Comma-separated, empty = allow all google

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trust proxy headers (Traefik) so request.url reflects https
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")


# --- Auth helpers ---
def get_current_user(request: Request):
    user = request.session.get("user")
    if not user and GOOGLE_CLIENT_ID:
        return None
    return user


def require_auth(request: Request):
    if not GOOGLE_CLIENT_ID:
        return {"email": "local", "name": "Local Dev"}
    user = request.session.get("user")
    if not user:
        return None
    return user


# --- Auth routes ---
@app.get("/auth/login")
async def auth_login(request: Request):
    if not GOOGLE_CLIENT_ID:
        return RedirectResponse("/")
    redirect_uri = str(request.url_for("auth_callback"))
    # Behind Traefik/reverse proxy, force HTTPS
    if redirect_uri.startswith("http://") and request.headers.get("x-forwarded-proto") == "https":
        redirect_uri = redirect_uri.replace("http://", "https://", 1)
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url)


@app.get("/auth/callback")
async def auth_callback(request: Request, code: str = ""):
    if not code or not GOOGLE_CLIENT_ID:
        return RedirectResponse("/")

    redirect_uri = str(request.url_for("auth_callback"))
    if redirect_uri.startswith("http://") and request.headers.get("x-forwarded-proto") == "https":
        redirect_uri = redirect_uri.replace("http://", "https://", 1)

    async with httpx.AsyncClient() as client:
        token_resp = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            return JSONResponse({"error": "Token exchange failed"}, status_code=400)

        tokens = token_resp.json()
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        if userinfo_resp.status_code != 200:
            return JSONResponse({"error": "Userinfo failed"}, status_code=400)

        userinfo = userinfo_resp.json()

    email = userinfo.get("email", "")

    # Check allowed emails from DB first, then env var as fallback
    allowed_list = []
    try:
        from config.database import execute_one as db_get
        row = db_get("SELECT value FROM app_settings WHERE key = 'allowed_emails'")
        if row and row["value"]:
            allowed_list = [e.strip() for e in row["value"].split(",") if e.strip()]
    except Exception:
        pass

    if not allowed_list and ALLOWED_EMAILS:
        allowed_list = [e.strip() for e in ALLOWED_EMAILS.split(",") if e.strip()]

    if allowed_list and email not in allowed_list:
        return JSONResponse({"error": f"Email {email} nao autorizado"}, status_code=403)

    request.session["user"] = {
        "email": email,
        "name": userinfo.get("name", ""),
        "picture": userinfo.get("picture", ""),
    }
    return RedirectResponse("/")


@app.get("/auth/me")
async def auth_me(request: Request):
    user = request.session.get("user")
    return {
        "authenticated": user is not None or not GOOGLE_CLIENT_ID,
        "user": user,
        "auth_required": bool(GOOGLE_CLIENT_ID),
    }


@app.get("/auth/logout")
async def auth_logout(request: Request):
    request.session.clear()
    return RedirectResponse("/")


# --- API routes ---
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(timeline.router, prefix="/api/timeline", tags=["timeline"])
app.include_router(llm_models.router, prefix="/api/llm-models", tags=["llm-models"])
app.include_router(actions.router, prefix="/api/actions", tags=["actions"])
app.include_router(scripts.router, prefix="/api/scripts", tags=["scripts"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Static files (production) ---
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Don't serve SPA for API or auth routes
        if full_path.startswith("api/") or full_path.startswith("auth/"):
            return JSONResponse({"error": "not found"}, status_code=404)

        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))
