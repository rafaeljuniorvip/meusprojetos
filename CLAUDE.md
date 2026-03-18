# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Project Cataloger — Python CLI + FastAPI + React app that catalogs and analyzes 136+ software projects from `~/gits/` using LLM via OpenRouter. Also generates Instagram Reels scripts and content calendars.

**Domain:** `projetos.rafaeljunior.vip`
**Stack:** Python 3.12 (FastAPI + psycopg2 + httpx) | React 19 (Vite + TypeScript + Tailwind v4) | PostgreSQL 16 | OpenRouter API

## Commands

```bash
# Always activate venv first
source venv/bin/activate

# Database
python main.py migrate

# Scan & Analyze
python main.py scan                         # Scan all ~/gits folders
python main.py scan -p <folder_name>        # Scan specific project
python main.py analyze                      # Analyze unanalyzed projects
python main.py analyze -p <folder_name>     # Analyze specific project
python main.py analyze -m <model_id>        # Use specific LLM model
python main.py analyze --reanalyze          # Re-analyze all
python main.py analyze --retry-failed       # Retry failed analyses

# Query
python main.py status                       # Summary stats
python main.py status -d                    # Detailed table
python main.py top                          # Top 20 by SaaS score
python main.py export                       # Export to JSON

# Dev servers
python main.py serve                        # API on port 5815 (uvicorn with reload)
python main.py serve --port 3800            # Custom port
cd frontend && npm run dev                  # Frontend on port 5264
cd frontend && npm run build                # Build frontend (tsc -b && vite build)
cd frontend && npm run lint                 # ESLint
```

## Architecture

### Entry Point

`main.py` — argparse CLI dispatching to command functions. Each command lazily imports its service.

### Backend (API)

FastAPI app in `api/app.py` serves both the REST API (`/api/*`) and the built frontend (SPA from `static/`).

- **Routers** (`api/routers/`): projects, stats, timeline, llm_models, actions, scripts, calendar, settings, admin
- **Auth:** Google OAuth with session middleware. When `GOOGLE_CLIENT_ID` is unset, auth is bypassed for local dev. Allowed emails checked from DB (`app_settings.allowed_emails`) then env var fallback.
- **Swagger docs:** Available at `/docs` when server is running.

### Services Layer

All business logic lives in `services/`. Key pattern: each service reads data from DB, builds a prompt from `prompts/` templates, calls OpenRouter via `llm_client.py`, parses JSON response, and stores results.

- `scanner.py` — scans `~/gits` folders, upserts project metadata
- `project_analyzer.py` — LLM analysis of projects (28+ fields)
- `llm_client.py` — OpenRouter client with retry/backoff, rate limit handling, JSON parsing with regex fallback. Default model read from `app_settings.default_model` in DB.
- `script_generator.py` — generates Reels scripts per project
- `series_generator.py` — generates series content across all projects
- `ideas_generator.py` — generates creative ideas (deduplicates against existing)
- `calendar_planner.py` — AI-powered monthly content planning

### Database

PostgreSQL `project_cataloger` (user: rafaeljrs, pass: nw01, localhost:5432).

- Connection in `config/database.py` — raw psycopg2 with `RealDictCursor`, no ORM
- Three helper functions: `execute(sql, params, fetch)`, `execute_one(sql, params)`, `execute_many(sql, params_list)`
- Migrations in `migrations/` — plain SQL files run sequentially by filename sort order
- 11 tables: projects, project_files, analyses, llm_models, creative_scripts, content_calendar, timeline_snapshots, collections, collection_projects, app_settings, run_logs

### Frontend

React SPA in `frontend/` with Vite + TypeScript + Tailwind CSS v4.

- 8 pages: Dashboard, Criar Conteudo, Calendario, Projetos, Detalhe Projeto, Potencial, Modelos LLM, Atividade
- Data fetching via TanStack Query + Axios (`frontend/src/api/`)
- Design: Satoshi font, dark sidebar (#0f1117) + light content (#f8f9fc), indigo primary (#6366f1)
- API proxy configured in Vite to backend port 5815

### Config

`config/settings.py` — env vars with defaults (loaded via python-dotenv). Key settings: `DATABASE_URL`, `OPENROUTER_API_KEY`, `GITS_PATH`, `MAX_FILE_SIZE`, `SCAN_DELAY_SECONDS`.

### Deploy

- **Dockerfile:** Multi-stage (Python slim + Node alpine for frontend build)
- **Docker Swarm** via `stack-docker.yml` with Traefik labels
- **CI/CD:** GitHub Actions — push to main triggers build + push to GHCR (`ghcr.io/rafaeljuniorvip/meusprojetos:latest`)
- **Portainer** manages the stack on `ptbd01.viptecnologia.com.br`

### LLM Prompts

All in `prompts/` directory. Critical tone rules: pt-BR informal, "mostrar > falar", never mention exact project counts or portfolio metrics as arguments.
