import os
from config.settings import KEY_FILES, MAX_FILE_SIZE


def collect_key_files(project_path):
    collected = []

    for fname in KEY_FILES:
        fpath = os.path.join(project_path, fname)
        if os.path.isfile(fpath):
            collected.append(_read_file(fpath, fname))

    # Also check src/ for entry points
    src_dir = os.path.join(project_path, "src")
    if os.path.isdir(src_dir):
        for entry in ["index.js", "index.ts", "app.js", "app.ts", "main.py", "main.js"]:
            fpath = os.path.join(src_dir, entry)
            if os.path.isfile(fpath):
                collected.append(_read_file(fpath, f"src/{entry}"))

    # Check for GitHub Actions
    gh_dir = os.path.join(project_path, ".github", "workflows")
    if os.path.isdir(gh_dir):
        for f in os.listdir(gh_dir):
            if f.endswith((".yml", ".yaml")):
                fpath = os.path.join(gh_dir, f)
                collected.append(_read_file(fpath, f".github/workflows/{f}"))

    return collected


def _read_file(fpath, rel_name):
    try:
        size = os.path.getsize(fpath)
        with open(fpath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(MAX_FILE_SIZE)
        truncated = size > MAX_FILE_SIZE
        if truncated:
            content += "\n[... TRUNCATED ...]"
        return {
            "file_name": os.path.basename(rel_name),
            "file_path": rel_name,
            "content": content,
            "file_size_bytes": size,
            "was_truncated": truncated,
        }
    except Exception:
        return {
            "file_name": os.path.basename(rel_name),
            "file_path": rel_name,
            "content": "[ERROR READING FILE]",
            "file_size_bytes": 0,
            "was_truncated": False,
        }
