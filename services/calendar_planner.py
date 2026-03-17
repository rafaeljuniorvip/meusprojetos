import os
import json
import time
import calendar
from datetime import datetime, timezone

from config.database import execute, execute_one
from services.llm_client import call_openrouter, parse_json_response, get_default_model
from utils import logger


PROMPT_TEMPLATE = None


def _load_prompt():
    global PROMPT_TEMPLATE
    if PROMPT_TEMPLATE is None:
        path = os.path.join(os.path.dirname(__file__), "..", "prompts", "plan_calendar.txt")
        with open(path, "r") as f:
            PROMPT_TEMPLATE = f.read()
    return PROMPT_TEMPLATE


def plan_calendar_with_ai(month_str, target=300, model=None):
    """Use LLM to create a strategic content calendar."""
    year, m = map(int, month_str.split("-"))
    _, days_in_month = calendar.monthrange(year, m)
    month_name = datetime(year, m, 1).strftime("%B %Y")

    # Get all projects with analyses, exclude ignored
    projects = execute("""
        SELECT p.id, p.folder_name, a.project_name, a.category, a.subcategory,
               a.saas_readiness_score, a.monetization_potential, a.deployment_status,
               a.description_short, a.tech_stack, a.target_audience,
               a.marketing_hooks, a.features_list
        FROM projects p
        JOIN analyses a ON a.project_id = p.id
        WHERE NOT p.is_ignored
          AND a.saas_readiness_score IS NOT NULL
        ORDER BY
            CASE a.monetization_potential WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
            a.saas_readiness_score DESC
    """, fetch=True)

    if not projects:
        return {"error": "Nenhum projeto analisado encontrado"}

    # Build summary for prompt
    summaries = []
    for p in projects:
        tech = p.get("tech_stack") or []
        if isinstance(tech, str):
            try:
                tech = json.loads(tech)
            except Exception:
                tech = []
        hooks = p.get("marketing_hooks") or []
        if isinstance(hooks, str):
            try:
                hooks = json.loads(hooks)
            except Exception:
                hooks = []

        line = (
            f"- {p['folder_name']} | {p.get('project_name', '')} | "
            f"Cat: {p.get('category', 'N/A')} | "
            f"Score: {p.get('saas_readiness_score', 0)} | "
            f"Potencial: {p.get('monetization_potential', 'N/A')} | "
            f"Status: {p.get('deployment_status', 'N/A')} | "
            f"Tech: {', '.join(tech[:5]) if tech else 'N/A'} | "
            f"Desc: {(p.get('description_short') or 'N/A')[:100]}"
        )
        summaries.append(line)

    projects_summary = "\n".join(summaries)

    template = _load_prompt()
    prompt = template.format(
        total_projects=len(projects),
        target=target,
        month_name=month_name,
        days_in_month=days_in_month,
        projects_summary=projects_summary[:25000],  # Hard cap
    )

    model = model or get_default_model()
    logger.info(f"Planning calendar with {model} for {month_str} ({len(projects)} projects, target={target})")

    start = time.time()
    try:
        response = call_openrouter(prompt, model=model, max_tokens=8192)
        duration_ms = int((time.time() - start) * 1000)
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        execute(
            "INSERT INTO run_logs (run_type, status, error_message, duration_ms) VALUES (%s,%s,%s,%s)",
            ("calendar_plan", "error", str(e), duration_ms)
        )
        raise

    raw = response["content"]
    try:
        data = parse_json_response(raw)
    except Exception as e:
        execute(
            "INSERT INTO run_logs (run_type, status, error_message, duration_ms) VALUES (%s,%s,%s,%s)",
            ("calendar_plan", "error", f"JSON parse: {e}", duration_ms)
        )
        raise

    # Build folder->id map
    folder_map = {p["folder_name"]: p["id"] for p in projects}

    # Clear existing planned entries for this month
    start_date = f"{month_str}-01"
    end_date = f"{month_str}-{days_in_month}"
    execute(
        "DELETE FROM content_calendar WHERE scheduled_date BETWEEN %s AND %s AND status = 'planned'",
        (start_date, end_date)
    )

    # Insert new entries
    created = 0
    schedule = data.get("schedule", [])
    for day_entry in schedule:
        day = day_entry.get("day", 0)
        if day < 1 or day > days_in_month:
            continue
        date_str = f"{month_str}-{day:02d}"

        for entry in day_entry.get("entries", []):
            folder = entry.get("project_folder", "")
            project_id = folder_map.get(folder)
            if not project_id:
                continue

            note = entry.get("note", "")
            script_type = entry.get("script_type", "reels_demo")

            execute("""
                INSERT INTO content_calendar (project_id, scheduled_date, status, platform, notes)
                VALUES (%s, %s, 'planned', 'instagram', %s)
            """, (project_id, date_str, f"[{script_type}] {note}"))
            created += 1

    # Store strategy and themes as a special entry
    strategy = data.get("strategy_summary", "")
    themes = data.get("weekly_themes", [])

    execute(
        "INSERT INTO run_logs (run_type, status, duration_ms) VALUES (%s,%s,%s)",
        ("calendar_plan", "success", duration_ms)
    )

    return {
        "status": "ok",
        "created": created,
        "model": response["model"],
        "strategy": strategy,
        "weekly_themes": themes,
        "input_tokens": response.get("input_tokens", 0),
        "output_tokens": response.get("output_tokens", 0),
    }
