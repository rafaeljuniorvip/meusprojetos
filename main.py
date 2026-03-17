#!/usr/bin/env python3
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.database import execute, execute_one
from utils import logger


def cmd_migrate(args):
    """Run database migrations."""
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    for fname in sorted(os.listdir(migrations_dir)):
        if fname.endswith(".sql"):
            path = os.path.join(migrations_dir, fname)
            logger.info(f"Running migration: {fname}")
            with open(path, "r") as f:
                sql = f.read()
            execute(sql)
    logger.success("Migrations complete")


def cmd_scan(args):
    """Scan project folders."""
    from services.scanner import scan_project, scan_all

    if args.project:
        logger.info(f"Scanning: {args.project}")
        pid = scan_project(args.project)
        if pid:
            logger.success(f"Scanned successfully (ID: {pid})")
        else:
            logger.error("Scan failed")
    else:
        scan_all()


def cmd_analyze(args):
    """Analyze projects with LLM."""
    from services.project_analyzer import analyze_project, analyze_all, reanalyze_all

    model = args.model if hasattr(args, "model") and args.model else None

    if args.project:
        proj = execute_one(
            "SELECT id FROM projects WHERE folder_name = %s", (args.project,)
        )
        if not proj:
            logger.error(f"Project '{args.project}' not found. Run scan first.")
            return
        logger.info(f"Analyzing: {args.project}")
        aid = analyze_project(proj["id"], model=model)
        if aid:
            logger.success(f"Analysis complete (ID: {aid})")
        else:
            logger.error("Analysis failed")
    elif args.reanalyze:
        reanalyze_all(model=model)
    else:
        analyze_all(model=model, retry_failed=args.retry_failed)


def cmd_status(args):
    """Show project catalog status."""
    stats = execute_one("""
        SELECT
            (SELECT COUNT(*) FROM projects) AS total_projects,
            (SELECT COUNT(*) FROM projects WHERE scanned_at IS NOT NULL) AS scanned,
            (SELECT COUNT(*) FROM analyses) AS analyzed,
            (SELECT COUNT(*) FROM projects WHERE has_git) AS with_git,
            (SELECT COUNT(*) FROM projects WHERE has_dockerfile) AS with_docker,
            (SELECT SUM(input_tokens) FROM analyses) AS total_input_tokens,
            (SELECT SUM(output_tokens) FROM analyses) AS total_output_tokens
    """)

    logger.console.print("\n[bold]Project Cataloger - Status[/bold]\n")
    logger.console.print(f"  Total projects:  {stats['total_projects']}")
    logger.console.print(f"  Scanned:         {stats['scanned']}")
    logger.console.print(f"  Analyzed (LLM):  {stats['analyzed']}")
    logger.console.print(f"  With Git:        {stats['with_git']}")
    logger.console.print(f"  With Docker:     {stats['with_docker']}")
    logger.console.print(f"  Total tokens:    {(stats['total_input_tokens'] or 0) + (stats['total_output_tokens'] or 0):,}")
    logger.console.print()

    if args.detailed:
        projects = execute("""
            SELECT p.folder_name, p.file_count, p.has_git,
                   a.project_name, a.category, a.saas_readiness_score,
                   a.monetization_potential, a.deployment_status
            FROM projects p
            LEFT JOIN analyses a ON a.project_id = p.id
            ORDER BY a.saas_readiness_score DESC NULLS LAST, p.folder_name
        """, fetch=True)

        columns = ["Folder", "Name", "Category", "SaaS Score", "Monet.", "Status", "Files", "Git"]
        rows = []
        for p in projects:
            rows.append([
                p["folder_name"],
                (p["project_name"] or "-")[:30],
                p["category"] or "-",
                str(p["saas_readiness_score"] or "-"),
                p["monetization_potential"] or "-",
                p["deployment_status"] or "-",
                str(p["file_count"]),
                "Yes" if p["has_git"] else "No",
            ])
        logger.print_table("All Projects", columns, rows)


def cmd_export(args):
    """Export analyses to JSON."""
    analyses = execute("""
        SELECT p.folder_name, a.*
        FROM analyses a
        JOIN projects p ON p.id = a.project_id
        ORDER BY a.saas_readiness_score DESC
    """, fetch=True)

    output = []
    for a in analyses:
        item = {
            "folder": a["folder_name"],
            "name": a["project_name"],
            "description": a["description_short"],
            "tech_stack": a["tech_stack"] if isinstance(a["tech_stack"], list) else json.loads(a["tech_stack"] or "[]"),
            "category": a["category"],
            "subcategory": a["subcategory"],
            "target_audience": a["target_audience"],
            "monetization_potential": a["monetization_potential"],
            "monetization_ideas": a["monetization_ideas"] if isinstance(a["monetization_ideas"], list) else json.loads(a["monetization_ideas"] or "[]"),
            "dev_time_estimate": a["dev_time_estimate"],
            "dev_completion_pct": a["dev_completion_pct"],
            "features": a["features_list"] if isinstance(a["features_list"], list) else json.loads(a["features_list"] or "[]"),
            "marketing_hooks": a["marketing_hooks"] if isinstance(a["marketing_hooks"], list) else json.loads(a["marketing_hooks"] or "[]"),
            "saas_readiness_score": a["saas_readiness_score"],
            "saas_readiness_notes": a["saas_readiness_notes"],
            "deployment_status": a["deployment_status"],
            "tags": a["tags"] if isinstance(a["tags"], list) else json.loads(a["tags"] or "[]"),
        }
        output.append(item)

    outfile = args.output or "catalog_export.json"
    with open(outfile, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    logger.success(f"Exported {len(output)} analyses to {outfile}")


def cmd_top(args):
    """Show top projects by SaaS readiness."""
    limit = args.limit or 20
    projects = execute("""
        SELECT p.folder_name, a.project_name, a.category,
               a.saas_readiness_score, a.monetization_potential,
               a.description_short, a.deployment_status
        FROM analyses a
        JOIN projects p ON p.id = a.project_id
        ORDER BY a.saas_readiness_score DESC
        LIMIT %s
    """, (limit,), fetch=True)

    columns = ["#", "Folder", "Name", "Category", "Score", "Monet.", "Deploy", "Description"]
    rows = []
    for i, p in enumerate(projects, 1):
        rows.append([
            str(i),
            p["folder_name"],
            (p["project_name"] or "-")[:25],
            p["category"] or "-",
            str(p["saas_readiness_score"]),
            p["monetization_potential"] or "-",
            p["deployment_status"] or "-",
            (p["description_short"] or "-")[:50],
        ])
    logger.print_table(f"Top {limit} Projects by SaaS Readiness", columns, rows)


def cmd_serve(args):
    """Start the API server."""
    import uvicorn
    port = args.port
    logger.info(f"Starting API on port {port}...")
    logger.info(f"Swagger docs: http://localhost:{port}/docs")
    uvicorn.run("api.app:app", host="0.0.0.0", port=port, reload=True)


def main():
    parser = argparse.ArgumentParser(description="Project Cataloger - Catalog and analyze software projects")
    sub = parser.add_subparsers(dest="command", help="Available commands")

    # migrate
    sub.add_parser("migrate", help="Run database migrations")

    # scan
    p_scan = sub.add_parser("scan", help="Scan project folders")
    p_scan.add_argument("--project", "-p", help="Scan specific project folder")

    # analyze
    p_analyze = sub.add_parser("analyze", help="Analyze projects with LLM")
    p_analyze.add_argument("--project", "-p", help="Analyze specific project")
    p_analyze.add_argument("--model", "-m", help="Override LLM model")
    p_analyze.add_argument("--retry-failed", action="store_true", help="Retry failed analyses")
    p_analyze.add_argument("--reanalyze", action="store_true", help="Re-analyze all projects")

    # status
    p_status = sub.add_parser("status", help="Show catalog status")
    p_status.add_argument("--detailed", "-d", action="store_true", help="Show detailed table")

    # export
    p_export = sub.add_parser("export", help="Export analyses to JSON")
    p_export.add_argument("--output", "-o", help="Output file path")

    # top
    p_top = sub.add_parser("top", help="Show top projects by SaaS readiness")
    p_top.add_argument("--limit", "-l", type=int, default=20, help="Number of results")

    # serve
    p_serve = sub.add_parser("serve", help="Start API + Frontend dev servers")
    p_serve.add_argument("--port", type=int, default=3800, help="API port")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    commands = {
        "migrate": cmd_migrate,
        "scan": cmd_scan,
        "analyze": cmd_analyze,
        "status": cmd_status,
        "export": cmd_export,
        "top": cmd_top,
        "serve": cmd_serve,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
