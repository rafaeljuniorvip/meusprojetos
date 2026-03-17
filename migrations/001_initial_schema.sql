CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    folder_name VARCHAR(255) UNIQUE NOT NULL,
    folder_path TEXT NOT NULL,
    has_git BOOLEAN DEFAULT FALSE,
    git_commit_count INTEGER,
    git_last_commit_date TIMESTAMPTZ,
    git_last_commit_msg TEXT,
    git_remote_url TEXT,
    git_primary_branch VARCHAR(100),
    detected_languages JSONB DEFAULT '{}',
    file_count INTEGER DEFAULT 0,
    has_dockerfile BOOLEAN DEFAULT FALSE,
    has_docker_compose BOOLEAN DEFAULT FALSE,
    has_stack_docker BOOLEAN DEFAULT FALSE,
    has_readme BOOLEAN DEFAULT FALSE,
    has_claude_md BOOLEAN DEFAULT FALSE,
    has_projeto_md BOOLEAN DEFAULT FALSE,
    has_package_json BOOLEAN DEFAULT FALSE,
    has_requirements_txt BOOLEAN DEFAULT FALSE,
    has_github_actions BOOLEAN DEFAULT FALSE,
    raw_file_tree TEXT,
    scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_files (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    content TEXT,
    file_size_bytes INTEGER DEFAULT 0,
    was_truncated BOOLEAN DEFAULT FALSE,
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analyses (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    llm_model VARCHAR(255),
    project_name VARCHAR(255),
    description_short TEXT,
    description_long TEXT,
    tech_stack JSONB DEFAULT '[]',
    category VARCHAR(100),
    subcategory VARCHAR(100),
    target_audience TEXT,
    monetization_potential VARCHAR(20),
    monetization_ideas JSONB DEFAULT '[]',
    dev_time_estimate VARCHAR(100),
    dev_completion_pct INTEGER,
    features_list JSONB DEFAULT '[]',
    marketing_hooks JSONB DEFAULT '[]',
    saas_readiness_score INTEGER,
    saas_readiness_notes TEXT,
    deployment_status VARCHAR(50),
    related_projects JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    raw_llm_response TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd DECIMAL(10,6),
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creative_scripts (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER REFERENCES analyses(id) ON DELETE CASCADE,
    script_type VARCHAR(50),
    title VARCHAR(255),
    hook_text TEXT,
    script_body TEXT,
    visual_notes TEXT,
    hashtags JSONB DEFAULT '[]',
    estimated_duration_sec INTEGER,
    llm_model VARCHAR(255),
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS run_logs (
    id SERIAL PRIMARY KEY,
    run_type VARCHAR(50),
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    status VARCHAR(20),
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_name);
CREATE INDEX IF NOT EXISTS idx_analyses_project ON analyses(project_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_analysis ON creative_scripts(analysis_id);
CREATE INDEX IF NOT EXISTS idx_run_logs_created ON run_logs(created_at DESC);
