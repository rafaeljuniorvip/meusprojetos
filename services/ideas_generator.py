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
        path = os.path.join(os.path.dirname(__file__), "..", "prompts", "generate_ideas.txt")
        with open(path, "r") as f:
            PROMPT_TEMPLATE = f.read()
    return PROMPT_TEMPLATE


def generate_ideas(count=10, model=None):
    # Get projects
    projects = execute("""
        SELECT p.folder_name, a.project_name, a.category, a.saas_readiness_score,
               a.monetization_potential, a.description_short, a.deployment_status
        FROM projects p
        JOIN analyses a ON a.project_id = p.id
        WHERE NOT p.is_ignored AND a.saas_readiness_score IS NOT NULL
        ORDER BY a.saas_readiness_score DESC
    """, fetch=True)

    # Build overview
    lines = []
    for p in projects[:25]:
        lines.append(
            f"- {p['folder_name']} | {p.get('project_name', '')} | "
            f"{p.get('category', '?')} | Score:{p.get('saas_readiness_score', 0)} | "
            f"{p.get('monetization_potential', '?')} | "
            f"{(p.get('description_short') or '')[:80]}"
        )

    # Get existing scripts to avoid repetition
    existing = execute("""
        SELECT cs.title, cs.hook_text, cs.script_type
        FROM creative_scripts cs
        ORDER BY cs.generated_at DESC
        LIMIT 50
    """, fetch=True)

    existing_lines = []
    for s in existing:
        existing_lines.append(f"- [{s['script_type']}] {s['title']} - Hook: \"{s['hook_text']}\"")

    template = _load_prompt()
    prompt = template.format(
        total_projects=len(projects),
        target=300,
        projects_overview="\n".join(lines),
        existing_scripts="\n".join(existing_lines) if existing_lines else "Nenhum roteiro gerado ainda.",
        count=count,
    )

    model = model or get_default_model()
    start = time.time()

    try:
        response = call_openrouter(prompt, model=model, max_tokens=6000)
        duration_ms = int((time.time() - start) * 1000)
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        execute(
            "INSERT INTO run_logs (run_type, status, error_message, duration_ms) VALUES (%s,%s,%s,%s)",
            ("ideas_generate", "error", str(e), duration_ms)
        )
        raise

    raw = response["content"]
    try:
        data = parse_json_response(raw)
    except Exception as e:
        execute(
            "INSERT INTO run_logs (run_type, status, error_message, duration_ms) VALUES (%s,%s,%s,%s)",
            ("ideas_generate", "error", f"JSON parse: {e}", duration_ms)
        )
        raise

    execute(
        "INSERT INTO run_logs (run_type, status, duration_ms) VALUES (%s,%s,%s)",
        ("ideas_generate", "success", duration_ms)
    )

    return {
        "ideas": data.get("ideas", []),
        "model": response["model"],
        "tokens": response.get("input_tokens", 0) + response.get("output_tokens", 0),
    }
