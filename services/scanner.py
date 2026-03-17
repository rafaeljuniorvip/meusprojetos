import os
import json
from datetime import datetime, timezone

from config.settings import GITS_PATH, SKIP_SELF
from config.database import execute, execute_one
from services.git_analyzer import analyze_git, detect_languages
from services.file_collector import collect_key_files
from utils.file_tree import generate_file_tree, count_files
from utils import logger


def list_project_folders():
    folders = []
    for entry in sorted(os.listdir(GITS_PATH)):
        if entry == SKIP_SELF:
            continue
        full = os.path.join(GITS_PATH, entry)
        if os.path.isdir(full) and not entry.startswith("."):
            folders.append(entry)
    return folders


def scan_project(folder_name):
    path = os.path.join(GITS_PATH, folder_name)
    if not os.path.isdir(path):
        logger.error(f"Folder not found: {path}")
        return None

    # File tree
    tree = generate_file_tree(path)
    fcount = count_files(path)

    # Git info
    git_info = analyze_git(path)
    languages = detect_languages(path)

    # Key files
    files = collect_key_files(path)
    file_names = {f["file_path"].lower() for f in files}

    # Detect capabilities
    has_dockerfile = any("dockerfile" in fn for fn in file_names)
    has_docker_compose = any("docker-compose" in fn for fn in file_names)
    has_stack_docker = any("stack-docker" in fn for fn in file_names)
    has_readme = any("readme" in fn for fn in file_names)
    has_claude_md = any("claude.md" in fn for fn in file_names)
    has_projeto_md = any("projeto.md" in fn for fn in file_names)
    has_package_json = any("package.json" in fn for fn in file_names)
    has_requirements = any("requirements.txt" in fn for fn in file_names)
    has_gh_actions = any(".github/workflows" in fn for fn in file_names)

    now = datetime.now(timezone.utc)

    # Upsert project
    project = execute_one(
        """
        INSERT INTO projects (
            folder_name, folder_path, has_git,
            git_commit_count, git_last_commit_date, git_last_commit_msg,
            git_remote_url, git_primary_branch, detected_languages,
            file_count, has_dockerfile, has_docker_compose, has_stack_docker,
            has_readme, has_claude_md, has_projeto_md, has_package_json,
            has_requirements_txt, has_github_actions, raw_file_tree,
            scanned_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (folder_name) DO UPDATE SET
            folder_path = EXCLUDED.folder_path,
            has_git = EXCLUDED.has_git,
            git_commit_count = EXCLUDED.git_commit_count,
            git_last_commit_date = EXCLUDED.git_last_commit_date,
            git_last_commit_msg = EXCLUDED.git_last_commit_msg,
            git_remote_url = EXCLUDED.git_remote_url,
            git_primary_branch = EXCLUDED.git_primary_branch,
            detected_languages = EXCLUDED.detected_languages,
            file_count = EXCLUDED.file_count,
            has_dockerfile = EXCLUDED.has_dockerfile,
            has_docker_compose = EXCLUDED.has_docker_compose,
            has_stack_docker = EXCLUDED.has_stack_docker,
            has_readme = EXCLUDED.has_readme,
            has_claude_md = EXCLUDED.has_claude_md,
            has_projeto_md = EXCLUDED.has_projeto_md,
            has_package_json = EXCLUDED.has_package_json,
            has_requirements_txt = EXCLUDED.has_requirements_txt,
            has_github_actions = EXCLUDED.has_github_actions,
            raw_file_tree = EXCLUDED.raw_file_tree,
            scanned_at = EXCLUDED.scanned_at,
            updated_at = EXCLUDED.updated_at
        RETURNING id
        """,
        (
            folder_name, path, bool(git_info),
            git_info["commit_count"] if git_info else None,
            git_info["last_commit_date"] if git_info else None,
            git_info["last_commit_msg"] if git_info else None,
            git_info["remote_url"] if git_info else None,
            git_info["primary_branch"] if git_info else None,
            json.dumps(languages),
            fcount, has_dockerfile, has_docker_compose, has_stack_docker,
            has_readme, has_claude_md, has_projeto_md, has_package_json,
            has_requirements, has_gh_actions, tree, now, now,
        )
    )

    project_id = project["id"]

    # Clear old files and insert new
    execute("DELETE FROM project_files WHERE project_id = %s", (project_id,))
    for f in files:
        execute(
            """
            INSERT INTO project_files (project_id, file_name, file_path, content, file_size_bytes, was_truncated)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (project_id, f["file_name"], f["file_path"], f["content"],
             f["file_size_bytes"], f["was_truncated"])
        )

    return project_id


def scan_all():
    folders = list_project_folders()
    logger.info(f"Found {len(folders)} project folders")

    success_count = 0
    error_count = 0

    for i, folder in enumerate(folders, 1):
        try:
            logger.info(f"[{i}/{len(folders)}] Scanning: {folder}")
            scan_project(folder)
            success_count += 1
        except Exception as e:
            logger.error(f"Error scanning {folder}: {e}")
            error_count += 1

    logger.success(f"Scan complete: {success_count} ok, {error_count} errors")
    return success_count, error_count
