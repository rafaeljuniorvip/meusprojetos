from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from config.database import execute, execute_one
from datetime import date, time
import calendar

router = APIRouter()

# Store last AI plan result
_last_plan_result = {"status": "idle"}


class CalendarEntryCreate(BaseModel):
    script_id: Optional[int] = None
    project_id: Optional[int] = None
    scheduled_date: str
    scheduled_time: Optional[str] = None
    status: str = "planned"
    platform: str = "instagram"
    notes: Optional[str] = None


class CalendarEntryUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def get_calendar(month: str = None):
    """Get calendar entries. month format: 2026-03"""
    if not month:
        from datetime import datetime
        month = datetime.now().strftime("%Y-%m")

    year, m = map(int, month.split("-"))
    _, days_in_month = calendar.monthrange(year, m)
    start = f"{month}-01"
    end = f"{month}-{days_in_month}"

    entries = execute("""
        SELECT cc.*, p.folder_name, a.project_name, cs.title as script_title, cs.script_type
        FROM content_calendar cc
        LEFT JOIN projects p ON p.id = cc.project_id
        LEFT JOIN creative_scripts cs ON cs.id = cc.script_id
        LEFT JOIN analyses a ON a.project_id = p.id
        WHERE cc.scheduled_date BETWEEN %s AND %s
        ORDER BY cc.scheduled_date, cc.scheduled_time
    """, (start, end), fetch=True)

    return {
        "month": month,
        "days_in_month": days_in_month,
        "entries": entries,
    }


@router.get("/stats")
def calendar_stats(month: str = None):
    if not month:
        from datetime import datetime
        month = datetime.now().strftime("%Y-%m")

    year, m = map(int, month.split("-"))
    _, days_in_month = calendar.monthrange(year, m)
    start = f"{month}-01"
    end = f"{month}-{days_in_month}"

    return execute_one("""
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'planned') as planned,
            COUNT(*) FILTER (WHERE status = 'recorded') as recorded,
            COUNT(*) FILTER (WHERE status = 'edited') as edited,
            COUNT(*) FILTER (WHERE status = 'published') as published,
            COUNT(DISTINCT project_id) as projects_covered
        FROM content_calendar
        WHERE scheduled_date BETWEEN %s AND %s
    """, (start, end))


@router.post("")
def create_entry(req: CalendarEntryCreate):
    entry = execute_one("""
        INSERT INTO content_calendar (script_id, project_id, scheduled_date, scheduled_time, status, platform, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (req.script_id, req.project_id, req.scheduled_date,
          req.scheduled_time, req.status, req.platform, req.notes))
    return {"id": entry["id"], "status": "created"}


@router.put("/{entry_id}")
def update_entry(entry_id: int, req: CalendarEntryUpdate):
    updates = []
    params = []
    for field in ["scheduled_date", "scheduled_time", "status", "notes"]:
        val = getattr(req, field, None)
        if val is not None:
            updates.append(f"{field} = %s")
            params.append(val)
    if not updates:
        return {"status": "no changes"}
    updates.append("updated_at = NOW()")
    params.append(entry_id)
    execute(f"UPDATE content_calendar SET {', '.join(updates)} WHERE id = %s", params)
    return {"status": "updated"}


@router.delete("/{entry_id}")
def delete_entry(entry_id: int):
    execute("DELETE FROM content_calendar WHERE id = %s", (entry_id,))
    return {"status": "deleted"}


@router.post("/auto-schedule")
def auto_schedule(month: str, target: int = 300):
    """Auto-distribute scripts across the month."""
    year, m = map(int, month.split("-"))
    _, days_in_month = calendar.monthrange(year, m)

    # Get projects with analyses, weighted by potential
    projects = execute("""
        SELECT p.id, a.saas_readiness_score, a.monetization_potential
        FROM projects p
        JOIN analyses a ON a.project_id = p.id
        WHERE a.saas_readiness_score IS NOT NULL
        ORDER BY
            CASE a.monetization_potential WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
            a.saas_readiness_score DESC
    """, fetch=True)

    if not projects:
        return {"status": "no projects with analyses"}

    # Check existing entries
    existing = execute_one("""
        SELECT COUNT(*) as count FROM content_calendar
        WHERE scheduled_date BETWEEN %s AND %s
    """, (f"{month}-01", f"{month}-{days_in_month}"))

    remaining = target - (existing["count"] or 0)
    if remaining <= 0:
        return {"status": "month already has enough entries", "existing": existing["count"]}

    per_day = remaining // days_in_month
    extra = remaining % days_in_month
    created = 0
    project_idx = 0

    for day in range(1, days_in_month + 1):
        date_str = f"{month}-{day:02d}"
        count_today = per_day + (1 if day <= extra else 0)

        for _ in range(count_today):
            proj = projects[project_idx % len(projects)]
            execute("""
                INSERT INTO content_calendar (project_id, scheduled_date, status, platform)
                VALUES (%s, %s, 'planned', 'instagram')
            """, (proj["id"], date_str))
            project_idx += 1
            created += 1

    return {"status": "scheduled", "created": created, "month": month}


class AIPlanRequest(BaseModel):
    month: str
    target: int = 300
    model: Optional[str] = None


@router.post("/ai-plan")
def ai_plan_calendar(req: AIPlanRequest, background_tasks: BackgroundTasks):
    global _last_plan_result
    _last_plan_result = {"status": "generating", "month": req.month, "model": req.model}
    background_tasks.add_task(_run_ai_plan, req.month, req.target, req.model)
    return {"status": "generating", "month": req.month}


@router.get("/ai-plan/status")
def ai_plan_status():
    return _last_plan_result


def _run_ai_plan(month, target, model):
    global _last_plan_result
    try:
        from services.calendar_planner import plan_calendar_with_ai
        result = plan_calendar_with_ai(month, target, model)
        _last_plan_result = result
    except Exception as e:
        _last_plan_result = {"status": "error", "error": str(e)}
