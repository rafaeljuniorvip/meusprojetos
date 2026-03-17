import os
import json
import time
from datetime import datetime, timezone

from config.database import execute, execute_one
from config.settings import SCAN_DELAY_SECONDS
from services.llm_client import call_openrouter, parse_json_response
from utils import logger


PROMPT_TEMPLATE = None


def _load_prompt():
    global PROMPT_TEMPLATE
    if PROMPT_TEMPLATE is None:
        path = os.path.join(os.path.dirname(__file__), "..", "prompts", "generate_reels.txt")
        with open(path, "r") as f:
            PROMPT_TEMPLATE = f.read()
    return PROMPT_TEMPLATE


def generate_script(project_id, script_type="reels_demo", model=None):
    # Get project + analysis
    project = execute_one("""
        SELECT p.folder_name, a.*
        FROM projects p
        JOIN analyses a ON a.project_id = p.id
        WHERE p.id = %s
        ORDER BY a.analyzed_at DESC LIMIT 1
    """, (project_id,))

    if not project:
        logger.error(f"No analysis found for project {project_id}")
        return None

    # Build prompt
    template = _load_prompt()

    def to_str(val):
        if isinstance(val, list):
            return ", ".join(str(v) for v in val)
        if isinstance(val, str):
            try:
                parsed = json.loads(val)
                if isinstance(parsed, list):
                    return ", ".join(str(v) for v in parsed)
            except Exception:
                pass
        return str(val or "N/A")

    prompt = template.format(
        project_name=project.get("project_name") or project.get("folder_name"),
        category=project.get("category") or "N/A",
        description=project.get("description_short") or "N/A",
        tech_stack=to_str(project.get("tech_stack")),
        features=to_str(project.get("features_list")),
        target_audience=project.get("target_audience") or "N/A",
        monetization_potential=project.get("monetization_potential") or "N/A",
        monetization_ideas=to_str(project.get("monetization_ideas")),
        existing_hooks=to_str(project.get("marketing_hooks")),
        script_type=script_type,
    )

    start = time.time()
    try:
        response = call_openrouter(prompt, model=model)
        duration_ms = int((time.time() - start) * 1000)
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        execute(
            "INSERT INTO run_logs (run_type, project_id, status, error_message, duration_ms) VALUES (%s,%s,%s,%s,%s)",
            ("generate", project_id, "error", str(e), duration_ms)
        )
        raise

    raw = response["content"]
    try:
        data = parse_json_response(raw)
    except Exception as e:
        execute(
            "INSERT INTO run_logs (run_type, project_id, status, error_message, duration_ms) VALUES (%s,%s,%s,%s,%s)",
            ("generate", project_id, "error", f"JSON parse: {e}", duration_ms)
        )
        logger.error(f"Failed to parse script response: {e}")
        return None

    analysis_id = project.get("id")

    script = execute_one("""
        INSERT INTO creative_scripts (
            analysis_id, script_type, title, hook_text, script_body,
            visual_notes, hashtags, estimated_duration_sec, llm_model
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
    """, (
        analysis_id,
        script_type,
        data.get("title", ""),
        data.get("hook_text", ""),
        data.get("script_body", ""),
        data.get("visual_notes", ""),
        json.dumps(data.get("hashtags", []), ensure_ascii=False),
        data.get("estimated_duration_sec", 30),
        response["model"],
    ))

    execute(
        "INSERT INTO run_logs (run_type, project_id, status, duration_ms) VALUES (%s,%s,%s,%s)",
        ("generate", project_id, "success", duration_ms)
    )

    return script["id"]


def generate_batch(project_ids, script_types, model=None):
    results = {"success": 0, "errors": 0}
    for pid in project_ids:
        for stype in script_types:
            try:
                generate_script(pid, stype, model)
                results["success"] += 1
            except Exception as e:
                logger.error(f"Error generating {stype} for project {pid}: {e}")
                results["errors"] += 1
            time.sleep(SCAN_DELAY_SECONDS)
    return results
