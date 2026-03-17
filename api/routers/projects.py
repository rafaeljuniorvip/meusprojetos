from fastapi import APIRouter, Query
from typing import Optional
from config.database import execute, execute_one

router = APIRouter()


@router.get("")
def list_projects(
    search: Optional[str] = None,
    category: Optional[str] = None,
    deployment_status: Optional[str] = None,
    has_git: Optional[bool] = None,
    show_ignored: bool = False,
    sort_by: str = "folder_name",
    order: str = "asc",
    page: int = 1,
    per_page: int = 50,
):
    conditions = []
    params = []

    if not show_ignored:
        conditions.append("p.is_ignored = FALSE")

    if search:
        conditions.append("(p.folder_name ILIKE %s OR a.project_name ILIKE %s OR a.description_short ILIKE %s)")
        params.extend([f"%{search}%"] * 3)
    if category:
        conditions.append("a.category = %s")
        params.append(category)
    if deployment_status:
        conditions.append("a.deployment_status = %s")
        params.append(deployment_status)
    if has_git is not None:
        conditions.append("p.has_git = %s")
        params.append(has_git)

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    allowed_sorts = {
        "folder_name": "p.folder_name",
        "saas_score": "a.saas_readiness_score",
        "category": "a.category",
        "file_count": "p.file_count",
        "monetization": "a.monetization_potential",
        "updated_at": "p.updated_at",
    }
    sort_col = allowed_sorts.get(sort_by, "p.folder_name")
    order_dir = "DESC" if order.lower() == "desc" else "ASC"
    nulls = "NULLS LAST" if order_dir == "DESC" else "NULLS FIRST"

    # Count
    count_row = execute_one(
        f"SELECT COUNT(*) as total FROM projects p LEFT JOIN analyses a ON a.project_id = p.id {where}",
        params or None
    )
    total = count_row["total"]

    offset = (page - 1) * per_page
    params_page = list(params) + [per_page, offset]

    rows = execute(f"""
        SELECT p.id, p.folder_name, p.has_git, p.file_count,
               p.detected_languages, p.has_dockerfile, p.has_stack_docker,
               p.git_commit_count, p.git_last_commit_date, p.updated_at,
               p.databases_used, p.frameworks_used, p.is_ignored,
               a.id as analysis_id, a.project_name, a.description_short,
               a.category, a.subcategory, a.saas_readiness_score,
               a.monetization_potential, a.deployment_status,
               a.tech_stack, a.tags
        FROM projects p
        LEFT JOIN analyses a ON a.project_id = p.id
        {where}
        ORDER BY {sort_col} {order_dir} {nulls}
        LIMIT %s OFFSET %s
    """, params_page or None, fetch=True)

    return {
        "data": rows,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/categories")
def list_categories():
    rows = execute(
        "SELECT DISTINCT category FROM analyses WHERE category IS NOT NULL ORDER BY category",
        fetch=True
    )
    return [r["category"] for r in rows]


@router.get("/{project_id}")
def get_project(project_id: int):
    project = execute_one("""
        SELECT p.*, a.id as analysis_id, a.project_name, a.description_short,
               a.description_long, a.tech_stack, a.category, a.subcategory,
               a.target_audience, a.monetization_potential, a.monetization_ideas,
               a.dev_time_estimate, a.dev_completion_pct, a.features_list,
               a.marketing_hooks, a.saas_readiness_score, a.saas_readiness_notes,
               a.deployment_status, a.related_projects, a.tags,
               a.databases, a.frameworks, a.apis_integrations, a.infrastructure,
               a.llm_model, a.input_tokens, a.output_tokens, a.analyzed_at
        FROM projects p
        LEFT JOIN analyses a ON a.project_id = p.id
        WHERE p.id = %s
    """, (project_id,))
    return project


@router.patch("/{project_id}/ignore")
def toggle_ignore(project_id: int):
    row = execute_one("SELECT is_ignored FROM projects WHERE id = %s", (project_id,))
    if not row:
        return {"error": "not found"}
    new_val = not row["is_ignored"]
    execute("UPDATE projects SET is_ignored = %s WHERE id = %s", (new_val, project_id))
    return {"id": project_id, "is_ignored": new_val}


@router.get("/{project_id}/files")
def get_project_files(project_id: int):
    files = execute(
        "SELECT id, file_name, file_path, content, file_size_bytes, was_truncated FROM project_files WHERE project_id = %s ORDER BY file_path",
        (project_id,), fetch=True
    )
    return files
