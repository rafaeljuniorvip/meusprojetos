import json
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from config.database import execute, execute_one

router = APIRouter()


class GenerateRequest(BaseModel):
    project_id: int
    script_type: str = "reels_demo"
    model: Optional[str] = None


class GenerateBatchRequest(BaseModel):
    project_ids: list[int]
    script_types: list[str] = ["reels_demo"]
    model: Optional[str] = None


class UpdateScriptRequest(BaseModel):
    title: Optional[str] = None
    hook_text: Optional[str] = None
    script_body: Optional[str] = None
    visual_notes: Optional[str] = None
    hashtags: Optional[list[str]] = None


@router.post("/generate")
def generate_script(req: GenerateRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(_generate, req.project_id, req.script_type, req.model)
    return {"status": "generating", "project_id": req.project_id, "script_type": req.script_type}


@router.post("/generate-batch")
def generate_batch(req: GenerateBatchRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(_generate_batch, req.project_ids, req.script_types, req.model)
    total = len(req.project_ids) * len(req.script_types)
    return {"status": "generating", "total_scripts": total}


@router.get("")
def list_scripts(
    project_id: Optional[int] = None,
    script_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
):
    conditions = []
    params = []

    if project_id:
        conditions.append("p.id = %s")
        params.append(project_id)
    if script_type:
        conditions.append("cs.script_type = %s")
        params.append(script_type)
    if search:
        conditions.append("(cs.title ILIKE %s OR cs.hook_text ILIKE %s OR cs.script_body ILIKE %s)")
        params.extend([f"%{search}%"] * 3)

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    count = execute_one(f"""
        SELECT COUNT(*) as total
        FROM creative_scripts cs
        JOIN analyses a ON a.id = cs.analysis_id
        JOIN projects p ON p.id = a.project_id
        {where}
    """, params or None)

    offset = (page - 1) * per_page
    params_page = list(params) + [per_page, offset]

    rows = execute(f"""
        SELECT cs.id, cs.script_type, cs.title, cs.hook_text, cs.script_body,
               cs.visual_notes, cs.hashtags, cs.estimated_duration_sec,
               cs.llm_model, cs.generated_at,
               a.project_name, p.folder_name, p.id as project_id
        FROM creative_scripts cs
        JOIN analyses a ON a.id = cs.analysis_id
        JOIN projects p ON p.id = a.project_id
        {where}
        ORDER BY cs.generated_at DESC
        LIMIT %s OFFSET %s
    """, params_page, fetch=True)

    return {
        "data": rows,
        "total": count["total"],
        "page": page,
        "per_page": per_page,
        "pages": (count["total"] + per_page - 1) // per_page,
    }


@router.get("/stats")
def script_stats():
    return execute_one("""
        SELECT
            (SELECT COUNT(*) FROM creative_scripts) as total_scripts,
            (SELECT COUNT(DISTINCT a.project_id) FROM creative_scripts cs JOIN analyses a ON a.id = cs.analysis_id) as projects_with_scripts,
            (SELECT COUNT(*) FROM creative_scripts WHERE script_type = 'reels_demo') as demos,
            (SELECT COUNT(*) FROM creative_scripts WHERE script_type = 'reels_tech') as techs,
            (SELECT COUNT(*) FROM creative_scripts WHERE script_type = 'reels_tip') as tips,
            (SELECT COUNT(*) FROM creative_scripts WHERE script_type = 'reels_behind_scenes') as behind_scenes,
            (SELECT COUNT(*) FROM creative_scripts WHERE script_type = 'reels_problem_solution') as problem_solutions
    """)


@router.get("/types")
def script_types():
    return [
        {"id": "reels_demo", "label": "Demo do Projeto", "description": "Mostrar funcionando", "group": "projeto"},
        {"id": "reels_tech", "label": "Explicacao Tech", "description": "Tecnologia por tras", "group": "projeto"},
        {"id": "reels_behind_scenes", "label": "Bastidores", "description": "Processo de desenvolvimento", "group": "projeto"},
        {"id": "reels_tip", "label": "Dica Rapida", "description": "Dica extraida do projeto", "group": "projeto"},
        {"id": "reels_problem_solution", "label": "Problema/Solucao", "description": "Dor que o projeto resolve", "group": "projeto"},
        {"id": "series_intro", "label": "Intro da Serie", "description": "Quem sou eu, o que vou mostrar", "group": "serie"},
        {"id": "series_teaser", "label": "Teaser/Trailer", "description": "Preview rapido de varios projetos", "group": "serie"},
        {"id": "series_engagement", "label": "Engajamento", "description": "Perguntas, enquetes, interacao", "group": "serie"},
        {"id": "series_behind_why", "label": "Minha Historia", "description": "Por que criei +100 projetos", "group": "serie"},
        {"id": "series_weekly_intro", "label": "Abertura de Semana", "description": "O que vem essa semana", "group": "serie"},
        {"id": "series_milestone", "label": "Marco/Conquista", "description": "Comemorando resultados", "group": "serie"},
        {"id": "series_cta_follow", "label": "CTA Seguir", "description": "Video direto pedindo follow", "group": "serie"},
        {"id": "series_collab", "label": "Colaboracao", "description": "Convite para criar juntos", "group": "serie"},
    ]


class SeriesGenerateRequest(BaseModel):
    content_type: str = "series_intro"
    model: Optional[str] = None


@router.post("/generate-series")
def generate_series(req: SeriesGenerateRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(_generate_series, req.content_type, req.model)
    return {"status": "generating", "content_type": req.content_type}


def _generate_series(content_type, model):
    from services.series_generator import generate_series_content
    try:
        generate_series_content(content_type, model=model)
    except Exception as e:
        from utils import logger
        logger.error(f"Series generation error: {e}")


# Store ideas result in memory for polling
_last_ideas_result = {"status": "idle"}


class IdeasRequest(BaseModel):
    count: int = 10
    model: Optional[str] = None


@router.post("/generate-ideas")
def generate_ideas_endpoint(req: IdeasRequest, background_tasks: BackgroundTasks):
    global _last_ideas_result
    _last_ideas_result = {"status": "generating"}
    background_tasks.add_task(_generate_ideas, req.count, req.model)
    return {"status": "generating", "count": req.count}


@router.get("/ideas/status")
def ideas_status():
    return _last_ideas_result


def _generate_ideas(count, model):
    global _last_ideas_result
    try:
        from services.ideas_generator import generate_ideas
        result = generate_ideas(count, model)
        _last_ideas_result = {"status": "ok", **result}
    except Exception as e:
        _last_ideas_result = {"status": "error", "error": str(e)}


@router.get("/{script_id}")
def get_script(script_id: int):
    return execute_one("""
        SELECT cs.*, a.project_name, p.folder_name, p.id as project_id
        FROM creative_scripts cs
        JOIN analyses a ON a.id = cs.analysis_id
        JOIN projects p ON p.id = a.project_id
        WHERE cs.id = %s
    """, (script_id,))


@router.put("/{script_id}")
def update_script(script_id: int, req: UpdateScriptRequest):
    updates = []
    params = []
    if req.title is not None:
        updates.append("title = %s")
        params.append(req.title)
    if req.hook_text is not None:
        updates.append("hook_text = %s")
        params.append(req.hook_text)
    if req.script_body is not None:
        updates.append("script_body = %s")
        params.append(req.script_body)
    if req.visual_notes is not None:
        updates.append("visual_notes = %s")
        params.append(req.visual_notes)
    if req.hashtags is not None:
        updates.append("hashtags = %s")
        params.append(json.dumps(req.hashtags, ensure_ascii=False))

    if not updates:
        return {"status": "no changes"}

    params.append(script_id)
    execute(f"UPDATE creative_scripts SET {', '.join(updates)} WHERE id = %s", params)
    return {"status": "updated", "id": script_id}


@router.delete("/{script_id}")
def delete_script(script_id: int):
    execute("DELETE FROM creative_scripts WHERE id = %s", (script_id,))
    return {"status": "deleted", "id": script_id}


def _generate(project_id, script_type, model):
    from services.script_generator import generate_script
    try:
        generate_script(project_id, script_type, model)
    except Exception as e:
        from utils import logger
        logger.error(f"Script generation error: {e}")


def _generate_batch(project_ids, script_types, model):
    from services.script_generator import generate_batch
    generate_batch(project_ids, script_types, model)
