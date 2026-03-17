from fastapi import APIRouter
from config.database import execute

router = APIRouter()


@router.get("/project/{project_id}")
def get_project_timeline(project_id: int, limit: int = 50):
    events = execute("""
        SELECT id, event_type, event_date, summary, metadata
        FROM timeline_snapshots
        WHERE project_id = %s
        ORDER BY event_date DESC
        LIMIT %s
    """, (project_id, limit), fetch=True)
    return events


@router.get("/recent")
def recent_events(limit: int = 30):
    events = execute("""
        SELECT t.id, t.event_type, t.event_date, t.summary, t.metadata,
               p.folder_name, p.id as project_id
        FROM timeline_snapshots t
        JOIN projects p ON p.id = t.project_id
        ORDER BY t.event_date DESC
        LIMIT %s
    """, (limit,), fetch=True)
    return events
