-- LLM Models from OpenRouter
CREATE TABLE IF NOT EXISTS llm_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) UNIQUE NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    provider VARCHAR(100),
    description TEXT,
    context_length INTEGER,
    max_completion_tokens INTEGER,
    modality VARCHAR(100),
    input_modalities JSONB DEFAULT '[]',
    output_modalities JSONB DEFAULT '[]',
    tokenizer VARCHAR(50),
    pricing_prompt DECIMAL(12,8),
    pricing_completion DECIMAL(12,8),
    pricing_image DECIMAL(12,8),
    pricing_request DECIMAL(12,8),
    supported_parameters JSONB DEFAULT '[]',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    model_created_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_models_model_id ON llm_models(model_id);
CREATE INDEX IF NOT EXISTS idx_llm_models_provider ON llm_models(provider);
CREATE INDEX IF NOT EXISTS idx_llm_models_favorite ON llm_models(is_favorite) WHERE is_favorite = TRUE;

-- Timeline snapshots for project history
CREATE TABLE IF NOT EXISTS timeline_snapshots (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    summary TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_project_date ON timeline_snapshots(project_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON timeline_snapshots(event_type);

-- Add more detailed tech info to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS databases_used JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS frameworks_used JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tools_used JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_file_modified_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS oldest_file_at TIMESTAMPTZ;

-- Add more detail to analyses
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS databases JSONB DEFAULT '[]';
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS frameworks JSONB DEFAULT '[]';
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS apis_integrations JSONB DEFAULT '[]';
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS infrastructure JSONB DEFAULT '[]';

-- Backfill timeline from existing scans
INSERT INTO timeline_snapshots (project_id, event_type, event_date, summary, metadata)
SELECT id, 'scan', scanned_at, 'Scan inicial do projeto', '{}'::jsonb
FROM projects WHERE scanned_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill timeline from existing analyses
INSERT INTO timeline_snapshots (project_id, event_type, event_date, summary, metadata)
SELECT project_id, 'analysis', analyzed_at,
       'Análise LLM via ' || llm_model,
       jsonb_build_object('analysis_id', id, 'model', llm_model)
FROM analyses
ON CONFLICT DO NOTHING;
