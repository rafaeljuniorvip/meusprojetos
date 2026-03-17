from fastapi import APIRouter
from config.database import execute, execute_one
import json

router = APIRouter()


@router.get("/overview")
def overview():
    return execute_one("""
        SELECT
            (SELECT COUNT(*) FROM projects WHERE NOT is_ignored) AS total_projects,
            (SELECT COUNT(*) FROM projects WHERE scanned_at IS NOT NULL AND NOT is_ignored) AS scanned,
            (SELECT COUNT(*) FROM analyses a JOIN projects p ON p.id = a.project_id WHERE NOT p.is_ignored) AS analyzed,
            (SELECT COUNT(*) FROM projects WHERE has_git AND NOT is_ignored) AS with_git,
            (SELECT COUNT(*) FROM projects WHERE has_dockerfile AND NOT is_ignored) AS with_docker,
            (SELECT COUNT(*) FROM projects WHERE has_stack_docker AND NOT is_ignored) AS with_stack,
            (SELECT COUNT(*) FROM projects WHERE has_github_actions AND NOT is_ignored) AS with_ci,
            (SELECT COALESCE(SUM(a.input_tokens), 0) FROM analyses a JOIN projects p ON p.id = a.project_id WHERE NOT p.is_ignored) AS total_input_tokens,
            (SELECT COALESCE(SUM(a.output_tokens), 0) FROM analyses a JOIN projects p ON p.id = a.project_id WHERE NOT p.is_ignored) AS total_output_tokens,
            (SELECT COALESCE(AVG(a.saas_readiness_score), 0) FROM analyses a JOIN projects p ON p.id = a.project_id WHERE NOT p.is_ignored) AS avg_saas_score,
            (SELECT COUNT(*) FROM analyses a JOIN projects p ON p.id = a.project_id WHERE a.monetization_potential = 'high' AND NOT p.is_ignored) AS high_monetization,
            (SELECT COUNT(*) FROM analyses a JOIN projects p ON p.id = a.project_id WHERE a.deployment_status = 'deployed' AND NOT p.is_ignored) AS deployed,
            (SELECT COUNT(*) FROM projects WHERE is_ignored) AS ignored
    """)


@router.get("/categories")
def categories():
    return execute("""
        SELECT category, COUNT(*) as count
        FROM analyses WHERE category IS NOT NULL
        GROUP BY category ORDER BY count DESC
    """, fetch=True)


@router.get("/saas-distribution")
def saas_distribution():
    return execute("""
        SELECT saas_readiness_score as score, COUNT(*) as count
        FROM analyses WHERE saas_readiness_score IS NOT NULL
        GROUP BY saas_readiness_score ORDER BY score
    """, fetch=True)


@router.get("/languages")
def languages():
    rows = execute(
        "SELECT detected_languages FROM projects WHERE detected_languages IS NOT NULL AND detected_languages != '{}'::jsonb",
        fetch=True
    )
    totals = {}
    for r in rows:
        langs = r["detected_languages"]
        if isinstance(langs, str):
            import json
            langs = json.loads(langs)
        for lang, pct in langs.items():
            totals[lang] = totals.get(lang, 0) + 1
    result = [{"language": k, "projects_count": v} for k, v in sorted(totals.items(), key=lambda x: -x[1])]
    return result


@router.get("/deployment")
def deployment():
    return execute("""
        SELECT deployment_status as status, COUNT(*) as count
        FROM analyses WHERE deployment_status IS NOT NULL
        GROUP BY deployment_status ORDER BY count DESC
    """, fetch=True)


@router.get("/monetization")
def monetization():
    return execute("""
        SELECT monetization_potential as level, COUNT(*) as count
        FROM analyses WHERE monetization_potential IS NOT NULL
        GROUP BY monetization_potential ORDER BY
            CASE monetization_potential
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
                ELSE 4
            END
    """, fetch=True)


@router.get("/top-projects")
def top_projects(limit: int = 8):
    return execute("""
        SELECT p.id, p.folder_name, a.project_name, a.category,
               a.saas_readiness_score, a.monetization_potential,
               a.deployment_status, a.description_short, a.tech_stack
        FROM analyses a
        JOIN projects p ON p.id = a.project_id
        WHERE NOT p.is_ignored
        ORDER BY a.saas_readiness_score DESC
        LIMIT %s
    """, (limit,), fetch=True)


@router.get("/tech-stack")
def tech_stack_stats():
    rows = execute("""
        SELECT a.tech_stack FROM analyses a
        JOIN projects p ON p.id = a.project_id
        WHERE NOT p.is_ignored AND a.tech_stack IS NOT NULL
    """, fetch=True)
    counts = {}
    for r in rows:
        ts = r["tech_stack"]
        if isinstance(ts, str):
            try: ts = json.loads(ts)
            except: ts = []
        if isinstance(ts, list):
            for t in ts:
                counts[t] = counts.get(t, 0) + 1
    return [{"tech": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])[:20]]


@router.get("/recent-activity")
def recent_activity(limit: int = 10):
    return execute("""
        SELECT rl.run_type, rl.status, rl.created_at, rl.duration_ms,
               p.folder_name, p.id as project_id
        FROM run_logs rl
        LEFT JOIN projects p ON p.id = rl.project_id
        ORDER BY rl.created_at DESC
        LIMIT %s
    """, (limit,), fetch=True)


@router.get("/content-stats")
def content_stats():
    return execute_one("""
        SELECT
            (SELECT COUNT(*) FROM creative_scripts) as total_scripts,
            (SELECT COUNT(*) FROM content_calendar) as total_calendar,
            (SELECT COUNT(*) FROM content_calendar WHERE status = 'published') as published,
            (SELECT COUNT(*) FROM content_calendar WHERE status = 'planned') as planned,
            (SELECT COUNT(DISTINCT a.project_id) FROM creative_scripts cs JOIN analyses a ON a.id = cs.analysis_id) as projects_with_scripts
    """)
