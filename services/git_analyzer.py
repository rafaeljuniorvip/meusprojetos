import os
import subprocess


def analyze_git(project_path):
    git_dir = os.path.join(project_path, ".git")
    if not os.path.isdir(git_dir):
        return None

    result = {
        "has_git": True,
        "commit_count": 0,
        "last_commit_date": None,
        "last_commit_msg": None,
        "remote_url": None,
        "primary_branch": None,
    }

    try:
        out = subprocess.run(
            ["git", "rev-list", "--count", "HEAD"],
            cwd=project_path, capture_output=True, text=True, timeout=10
        )
        if out.returncode == 0:
            result["commit_count"] = int(out.stdout.strip())
    except Exception:
        pass

    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%aI|||%s"],
            cwd=project_path, capture_output=True, text=True, timeout=10
        )
        if out.returncode == 0 and "|||" in out.stdout:
            parts = out.stdout.strip().split("|||", 1)
            result["last_commit_date"] = parts[0]
            result["last_commit_msg"] = parts[1][:500]
    except Exception:
        pass

    try:
        out = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            cwd=project_path, capture_output=True, text=True, timeout=10
        )
        if out.returncode == 0:
            result["remote_url"] = out.stdout.strip()
    except Exception:
        pass

    try:
        out = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=project_path, capture_output=True, text=True, timeout=10
        )
        if out.returncode == 0:
            result["primary_branch"] = out.stdout.strip()
    except Exception:
        pass

    return result


def detect_languages(project_path):
    ext_map = {
        ".js": "JavaScript", ".ts": "TypeScript", ".jsx": "React JSX",
        ".tsx": "React TSX", ".py": "Python", ".php": "PHP",
        ".html": "HTML", ".css": "CSS", ".scss": "SCSS",
        ".sql": "SQL", ".sh": "Shell", ".yml": "YAML", ".yaml": "YAML",
        ".json": "JSON", ".md": "Markdown", ".dart": "Dart",
        ".go": "Go", ".rs": "Rust", ".java": "Java",
        ".c": "C", ".cpp": "C++", ".ino": "Arduino",
    }

    skip = {
        "node_modules", ".git", "__pycache__", "venv", ".venv",
        "dist", "build", ".next", "vendor", "coverage", ".cache",
    }

    counts = {}
    for root, dirs, files in os.walk(project_path):
        dirs[:] = [d for d in dirs if d not in skip and not d.startswith(".")]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in ext_map:
                lang = ext_map[ext]
                counts[lang] = counts.get(lang, 0) + 1

    total = sum(counts.values()) or 1
    return {lang: round(count / total * 100) for lang, count in
            sorted(counts.items(), key=lambda x: -x[1])[:10]}
