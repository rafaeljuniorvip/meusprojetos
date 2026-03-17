export interface Project {
  id: number
  folder_name: string
  has_git: boolean
  file_count: number
  detected_languages: Record<string, number> | null
  has_dockerfile: boolean
  has_stack_docker: boolean
  git_commit_count: number | null
  git_last_commit_date: string | null
  updated_at: string
  databases_used: string[] | null
  frameworks_used: string[] | null
  analysis_id: number | null
  project_name: string | null
  description_short: string | null
  category: string | null
  subcategory: string | null
  saas_readiness_score: number | null
  monetization_potential: string | null
  deployment_status: string | null
  tech_stack: string[] | null
  tags: string[] | null
}

export interface ProjectDetail extends Project {
  folder_path: string
  git_remote_url: string | null
  git_primary_branch: string | null
  git_last_commit_msg: string | null
  raw_file_tree: string | null
  has_readme: boolean
  has_claude_md: boolean
  has_package_json: boolean
  has_requirements_txt: boolean
  has_github_actions: boolean
  description_long: string | null
  target_audience: string | null
  monetization_ideas: string[] | null
  dev_time_estimate: string | null
  dev_completion_pct: number | null
  features_list: string[] | null
  marketing_hooks: string[] | null
  saas_readiness_notes: string | null
  related_projects: string[] | null
  databases: string[] | null
  frameworks: string[] | null
  apis_integrations: string[] | null
  infrastructure: string[] | null
  llm_model: string | null
  input_tokens: number | null
  output_tokens: number | null
  analyzed_at: string | null
}

export interface ProjectFile {
  id: number
  file_name: string
  file_path: string
  content: string
  file_size_bytes: number
  was_truncated: boolean
}

export interface TimelineEvent {
  id: number
  event_type: string
  event_date: string
  summary: string
  metadata: Record<string, any>
  folder_name?: string
  project_id?: number
}

export interface StatsOverview {
  total_projects: number
  scanned: number
  analyzed: number
  with_git: number
  with_docker: number
  with_stack: number
  with_ci: number
  total_input_tokens: number
  total_output_tokens: number
  avg_saas_score: number
  high_monetization: number
  deployed: number
}

export interface LlmModel {
  id: number
  model_id: string
  model_name: string
  provider: string
  description: string | null
  context_length: number | null
  max_completion_tokens: number | null
  modality: string | null
  input_modalities: string[]
  output_modalities: string[]
  tokenizer: string | null
  pricing_prompt: number | null
  pricing_completion: number | null
  pricing_image: number | null
  supported_parameters: string[]
  is_favorite: boolean
  model_created_at: string | null
  fetched_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  pages: number
}
