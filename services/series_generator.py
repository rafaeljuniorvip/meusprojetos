import os
import json
import time

from config.database import execute, execute_one
from services.llm_client import call_openrouter, parse_json_response, get_default_model
from utils import logger


PROMPT_TEMPLATE = None


def _load_prompt():
    global PROMPT_TEMPLATE
    if PROMPT_TEMPLATE is None:
        path = os.path.join(os.path.dirname(__file__), "..", "prompts", "generate_series_launch.txt")
        with open(path, "r") as f:
            PROMPT_TEMPLATE = f.read()
    return PROMPT_TEMPLATE


def generate_series_content(content_type="series_intro", target=300, model=None):
    # Get project overview
    projects = execute("""
        SELECT p.folder_name, a.project_name, a.category, a.saas_readiness_score,
               a.monetization_potential, a.description_short, a.tech_stack, a.deployment_status
        FROM projects p
        JOIN analyses a ON a.project_id = p.id
        WHERE NOT p.is_ignored AND a.saas_readiness_score IS NOT NULL
        ORDER BY a.saas_readiness_score DESC
    """, fetch=True)

    if not projects:
        return None

    # Build overview
    categories = {}
    deployed = 0
    high_potential = 0
    for p in projects:
        cat = p.get("category", "Other")
        categories[cat] = categories.get(cat, 0) + 1
        if p.get("deployment_status") == "deployed":
            deployed += 1
        if p.get("monetization_potential") == "high":
            high_potential += 1

    overview_lines = [
        f"Total: {len(projects)} projetos analisados",
        f"Categorias: {', '.join(f'{k} ({v})' for k, v in sorted(categories.items(), key=lambda x: -x[1])[:8])}",
        f"Deployed em produção: {deployed}",
        f"Alto potencial de monetização: {high_potential}",
        "",
        "Top 15 projetos:",
    ]
    for p in projects[:15]:
        tech = p.get("tech_stack") or []
        if isinstance(tech, str):
            try: tech = json.loads(tech)
            except: tech = []
        overview_lines.append(
            f"  - {p.get('project_name', p['folder_name'])} ({p.get('category', '?')}) "
            f"Score:{p.get('saas_readiness_score', 0)} "
            f"[{', '.join(tech[:3]) if tech else '?'}] "
            f"- {(p.get('description_short') or '')[:80]}"
        )

    template = _load_prompt()
    prompt = template.format(
        total_projects=len(projects),
        target=target,
        projects_overview="\n".join(overview_lines),
        content_type=content_type,
    )

    model = model or get_default_model()
    start = time.time()

    try:
        response = call_openrouter(prompt, model=model, max_tokens=4096)
        duration_ms = int((time.time() - start) * 1000)
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        execute(
            "INSERT INTO run_logs (run_type, status, error_message, duration_ms) VALUES (%s,%s,%s,%s)",
            ("series_generate", "error", str(e), duration_ms)
        )
        raise

    raw = response["content"]
    try:
        data = parse_json_response(raw)
    except Exception as e:
        execute(
            "INSERT INTO run_logs (run_type, status, error_message, duration_ms) VALUES (%s,%s,%s,%s)",
            ("series_generate", "error", f"JSON parse: {e}", duration_ms)
        )
        raise

    # Store in creative_scripts with a null analysis_id approach
    # Use the first project's analysis as reference
    first_analysis = execute_one("SELECT id FROM analyses ORDER BY saas_readiness_score DESC LIMIT 1")

    script = execute_one("""
        INSERT INTO creative_scripts (
            analysis_id, script_type, title, hook_text, script_body,
            visual_notes, hashtags, estimated_duration_sec, llm_model
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        first_analysis["id"] if first_analysis else None,
        content_type,
        data.get("title", ""),
        data.get("hook_text", ""),
        data.get("script_body", ""),
        data.get("visual_notes", "")
            + "\n\n--- LEGENDA ---\n" + data.get("caption", "")
            + "\n\n--- CTAs STORIES ---\n" + "\n".join(data.get("cta_ideas", []))
            + "\n\n--- CONEXÃO COM PRÓXIMO ---\n" + data.get("series_connection", "")
            + "\n\n--- MELHOR HORÁRIO ---\n" + data.get("best_time_to_post", ""),
        json.dumps(data.get("hashtags", []), ensure_ascii=False),
        data.get("estimated_duration_sec", 30),
        response["model"],
    ))

    execute(
        "INSERT INTO run_logs (run_type, status, duration_ms) VALUES (%s,%s,%s)",
        ("series_generate", "success", duration_ms)
    )

    return {
        "script_id": script["id"],
        "data": data,
        "model": response["model"],
        "tokens": response.get("input_tokens", 0) + response.get("output_tokens", 0),
    }
