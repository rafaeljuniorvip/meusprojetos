from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from config.database import execute, execute_one

router = APIRouter()


class ScanRequest(BaseModel):
    project: Optional[str] = None


class AnalyzeRequest(BaseModel):
    project: Optional[str] = None
    model: Optional[str] = None


@router.post("/scan")
def trigger_scan(req: ScanRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(_run_scan, req.project)
    return {"status": "started", "project": req.project or "all"}


@router.post("/analyze")
def trigger_analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(_run_analyze, req.project, req.model)
    return {"status": "started", "project": req.project or "all", "model": req.model}


@router.get("/logs")
def get_logs(limit: int = 50):
    return execute("""
        SELECT rl.*, p.folder_name
        FROM run_logs rl
        LEFT JOIN projects p ON p.id = rl.project_id
        ORDER BY rl.created_at DESC
        LIMIT %s
    """, (limit,), fetch=True)


def _run_scan(project_name=None):
    from services.scanner import scan_project, scan_all
    try:
        if project_name:
            scan_project(project_name)
        else:
            scan_all()
    except Exception as e:
        execute(
            "INSERT INTO run_logs (run_type, status, error_message) VALUES (%s,%s,%s)",
            ("scan", "error", str(e))
        )


def _run_analyze(project_name=None, model=None):
    from services.project_analyzer import analyze_project, analyze_all
    try:
        if project_name:
            proj = execute_one("SELECT id FROM projects WHERE folder_name = %s", (project_name,))
            if proj:
                analyze_project(proj["id"], model=model)
        else:
            analyze_all(model=model)
    except Exception as e:
        execute(
            "INSERT INTO run_logs (run_type, status, error_message) VALUES (%s,%s,%s)",
            ("analyze", "error", str(e))
        )
