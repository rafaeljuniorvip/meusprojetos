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
        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "analyze_project.txt")
        with open(prompt_path, "r") as f:
            PROMPT_TEMPLATE = f.read()
    return PROMPT_TEMPLATE


def analyze_project(project_id, model=None):
    project = execute_one("SELECT * FROM projects WHERE id = %s", (project_id,))
    if not project:
        logger.error(f"Project ID {project_id} not found")
        return None

    files = execute(
        "SELECT * FROM project_files WHERE project_id = %s ORDER BY file_path",
        (project_id,), fetch=True
    )

    # Build files content for prompt
    files_content = ""
    for f in files:
        files_content += f"\n--- {f['file_path']} ---\n"
        content = f["content"] or ""
        if len(content) > 6000:
            content = content[:6000] + "\n[... TRUNCATED ...]"
        files_content += content + "\n"

    # Build languages string
    langs = project.get("detected_languages") or {}
    if isinstance(langs, str):
        langs = json.loads(langs)
    lang_str = ", ".join(f"{k}: {v}%" for k, v in langs.items()) if langs else "N/A"

    # Build prompt
    template = _load_prompt()
    prompt = template.format(
        folder_name=project["folder_name"],
        file_tree=project["raw_file_tree"] or "N/A",
        git_commits=project.get("git_commit_count") or "N/A",
        git_last_date=project.get("git_last_commit_date") or "N/A",
        git_last_msg=project.get("git_last_commit_msg") or "N/A",
        git_remote=project.get("git_remote_url") or "N/A",
        git_branch=project.get("git_primary_branch") or "N/A",
        languages=lang_str,
        files_content=files_content[:30000],  # Hard cap
    )

    # Call LLM
    start = time.time()
    try:
        response = call_openrouter(prompt, model=model)
        duration_ms = int((time.time() - start) * 1000)
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        execute(
            "INSERT INTO run_logs (run_type, project_id, status, error_message, duration_ms) VALUES (%s,%s,%s,%s,%s)",
            ("analyze", project_id, "error", str(e), duration_ms)
        )
        raise

    raw_content = response["content"]

    try:
        data = parse_json_response(raw_content)
    except Exception as e:
        execute(
            "INSERT INTO run_logs (run_type, project_id, status, error_message, duration_ms) VALUES (%s,%s,%s,%s,%s)",
            ("analyze", project_id, "error", f"JSON parse error: {e}", duration_ms)
        )
        logger.error(f"Failed to parse LLM response for {project['folder_name']}: {e}")
        return None

    # Store analysis
    analysis = execute_one(
        """
        INSERT INTO analyses (
            project_id, llm_model, project_name, description_short, description_long,
            tech_stack, category, subcategory, target_audience,
            monetization_potential, monetization_ideas,
            dev_time_estimate, dev_completion_pct, features_list,
            marketing_hooks, saas_readiness_score, saas_readiness_notes,
            deployment_status, related_projects, tags,
            databases, frameworks, apis_integrations, infrastructure,
            raw_llm_response, input_tokens, output_tokens, cost_usd
        ) VALUES (
            %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
        ) RETURNING id
        """,
        (
            project_id,
            response["model"],
            data.get("project_name", project["folder_name"]),
            data.get("description_short", ""),
            data.get("description_long", ""),
            json.dumps(data.get("tech_stack", []), ensure_ascii=False),
            data.get("category", "Other"),
            data.get("subcategory", ""),
            data.get("target_audience", ""),
            data.get("monetization_potential", "none"),
            json.dumps(data.get("monetization_ideas", []), ensure_ascii=False),
            data.get("dev_time_estimate", ""),
            data.get("dev_completion_pct", 0),
            json.dumps(data.get("features_list", []), ensure_ascii=False),
            json.dumps(data.get("marketing_hooks", []), ensure_ascii=False),
            data.get("saas_readiness_score", 0),
            data.get("saas_readiness_notes", ""),
            data.get("deployment_status", "unknown"),
            json.dumps(data.get("related_projects", []), ensure_ascii=False),
            json.dumps(data.get("tags", []), ensure_ascii=False),
            json.dumps(data.get("databases", []), ensure_ascii=False),
            json.dumps(data.get("frameworks", []), ensure_ascii=False),
            json.dumps(data.get("apis_integrations", []), ensure_ascii=False),
            json.dumps(data.get("infrastructure", []), ensure_ascii=False),
            raw_content,
            response.get("input_tokens", 0),
            response.get("output_tokens", 0),
            0,  # cost calculated later
        )
    )

    execute(
        "INSERT INTO run_logs (run_type, project_id, status, duration_ms) VALUES (%s,%s,%s,%s)",
        ("analyze", project_id, "success", duration_ms)
    )

    return analysis["id"]


def analyze_all(model=None, retry_failed=False):
    if retry_failed:
        projects = execute(
            """
            SELECT p.id, p.folder_name FROM projects p
            LEFT JOIN analyses a ON a.project_id = p.id
            WHERE a.id IS NULL AND p.scanned_at IS NOT NULL
            ORDER BY p.folder_name
            """,
            fetch=True
        )
    else:
        projects = execute(
            """
            SELECT p.id, p.folder_name FROM projects p
            LEFT JOIN analyses a ON a.project_id = p.id
            WHERE a.id IS NULL AND p.scanned_at IS NOT NULL
            ORDER BY p.folder_name
            """,
            fetch=True
        )

    if not projects:
        logger.info("All scanned projects already have analyses")
        return 0, 0

    logger.info(f"Analyzing {len(projects)} projects...")
    success_count = 0
    error_count = 0
    total_input = 0
    total_output = 0

    for i, proj in enumerate(projects, 1):
        logger.info(f"[{i}/{len(projects)}] Analyzing: {proj['folder_name']}")
        try:
            analyze_project(proj["id"], model=model)
            success_count += 1
        except Exception as e:
            logger.error(f"Error analyzing {proj['folder_name']}: {e}")
            error_count += 1

        if i < len(projects):
            time.sleep(SCAN_DELAY_SECONDS)

    logger.success(f"Analysis complete: {success_count} ok, {error_count} errors")
    return success_count, error_count


def reanalyze_all(model=None):
    """Re-analyze all projects, replacing existing analyses."""
    projects = execute(
        "SELECT id, folder_name FROM projects WHERE scanned_at IS NOT NULL ORDER BY folder_name",
        fetch=True
    )

    if not projects:
        logger.info("No scanned projects found")
        return 0, 0

    logger.info(f"Re-analyzing {len(projects)} projects...")
    success_count = 0
    error_count = 0

    for i, proj in enumerate(projects, 1):
        logger.info(f"[{i}/{len(projects)}] Re-analyzing: {proj['folder_name']}")
        try:
            # Delete existing analyses
            execute("DELETE FROM analyses WHERE project_id = %s", (proj["id"],))
            analyze_project(proj["id"], model=model)
            success_count += 1
        except Exception as e:
            logger.error(f"Error: {proj['folder_name']}: {e}")
            error_count += 1

        if i < len(projects):
            time.sleep(SCAN_DELAY_SECONDS)

    logger.success(f"Re-analysis complete: {success_count} ok, {error_count} errors")
    return success_count, error_count
