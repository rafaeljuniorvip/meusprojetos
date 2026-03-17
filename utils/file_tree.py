import os
from config.settings import SKIP_DIRS


def generate_file_tree(path, max_depth=4, prefix=""):
    lines = []
    _walk(path, lines, max_depth, 0, prefix)
    return "\n".join(lines)


def _walk(path, lines, max_depth, depth, prefix):
    if depth >= max_depth:
        return

    try:
        entries = sorted(os.listdir(path))
    except PermissionError:
        return

    dirs = []
    files = []
    for entry in entries:
        full = os.path.join(path, entry)
        if os.path.isdir(full):
            if entry not in SKIP_DIRS and not entry.startswith("."):
                dirs.append(entry)
        else:
            files.append(entry)

    items = [(d, True) for d in dirs] + [(f, False) for f in files]

    for i, (name, is_dir) in enumerate(items):
        is_last = i == len(items) - 1
        connector = "└── " if is_last else "├── "
        lines.append(f"{prefix}{connector}{name}/" if is_dir else f"{prefix}{connector}{name}")

        if is_dir:
            extension = "    " if is_last else "│   "
            _walk(os.path.join(path, name), lines, max_depth, depth + 1, prefix + extension)


def count_files(path):
    count = 0
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        count += len(files)
    return count
