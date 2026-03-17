# Project Cataloger (meusprojetos)

## Overview
Python tool that catalogs and analyzes 136+ software projects from ~/gits/ using LLM via OpenRouter.

## Stack
- Python 3 + psycopg2 + httpx + rich
- PostgreSQL: `project_cataloger` (user: rafaeljrs, pass: nw01)
- OpenRouter API for LLM analysis

## Commands
```bash
cd /home/rafaeljrs/gits/meusprojetos
source venv/bin/activate

python main.py migrate          # Run DB migrations
python main.py scan             # Scan all project folders
python main.py scan -p NAME     # Scan specific project
python main.py analyze          # Analyze unanalyzed projects
python main.py analyze -p NAME  # Analyze specific project
python main.py analyze --reanalyze  # Re-analyze all
python main.py status           # Show summary
python main.py status -d        # Show detailed table
python main.py top              # Top projects by SaaS score
python main.py export           # Export to JSON
```

## Structure
```
config/     - settings, database connection
services/   - scanner, file_collector, git_analyzer, llm_client, project_analyzer
utils/      - file_tree, logger
prompts/    - LLM prompt templates
migrations/ - SQL migrations
```

## Database Tables
- projects: metadata, git info, file flags
- project_files: key file contents per project
- analyses: LLM-generated analysis (name, description, tech_stack, category, hooks, SaaS score)
- creative_scripts: Phase 2 - Reels scripts
- run_logs: execution history

## Phase 2 (TODO)
- Creative script generator for Instagram Reels (300/month goal)
- Content calendar export
