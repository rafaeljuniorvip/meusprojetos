import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://rafaeljrs:nw01@localhost:5432/project_cataloger")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
GITS_PATH = os.getenv("GITS_PATH", "/home/rafaeljrs/gits")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "8192"))
SCAN_DELAY_SECONDS = float(os.getenv("SCAN_DELAY_SECONDS", "1"))

SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", "venv", ".venv", "env",
    "dist", "build", ".next", ".cache", "coverage", "vendor",
    ".expo", ".gradle", "android", "ios", ".idea", ".vscode",
}

KEY_FILES = [
    "CLAUDE.md", "PROJETO.md", "README.md", "ARQUITETURA.md",
    "package.json", "requirements.txt", "pyproject.toml",
    "Dockerfile", "stack-docker.yml", "docker-compose.yml",
    "docker-compose.portainer.yml", "docker-stack.yml",
    "app.py", "app.js", "index.js", "index.ts", "index.php",
    "main.py", "server.js", "server.py",
    "ecosystem.config.js", "ecosystem.config.cjs",
]

SKIP_SELF = "meusprojetos"
