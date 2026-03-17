# Catalogador de Projetos

Sistema completo para catalogar, analisar e gerar conteudo para 136+ projetos de software usando inteligencia artificial.

**Dominio:** `projetos.rafaeljunior.vip`
**Stack:** Python (FastAPI) + React (Vite + Tailwind) + PostgreSQL + OpenRouter (LLM)
**Objetivo:** Catalogar todos os projetos do desenvolvedor, analisar com IA, e gerar roteiros de Instagram Reels (meta: 300/mes)

---

## Sumario

- [Arquitetura](#arquitetura)
- [Stack Tecnologico](#stack-tecnologico)
- [Banco de Dados](#banco-de-dados)
- [Backend (API)](#backend-api)
- [Frontend](#frontend)
- [Servicos (Services)](#servicos)
- [Prompts de IA](#prompts-de-ia)
- [Funcionalidades Completas](#funcionalidades-completas)
- [Deploy e Infraestrutura](#deploy-e-infraestrutura)
- [Configuracoes](#configuracoes)
- [Comandos CLI](#comandos-cli)

---

## Arquitetura

```
meusprojetos/
├── api/                    # FastAPI - REST API
│   ├── app.py              # App factory, CORS, routers
│   └── routers/
│       ├── projects.py     # CRUD projetos + filtros + ignorar
│       ├── stats.py        # Dashboard stats (overview, categorias, etc)
│       ├── timeline.py     # Timeline de eventos por projeto
│       ├── llm_models.py   # Modelos OpenRouter + favoritos + padrao
│       ├── actions.py      # Triggers scan/analyze via frontend
│       ├── scripts.py      # Roteiros Reels + serie + ideias
│       ├── calendar.py     # Calendario conteudo + auto-schedule + IA
│       └── settings.py     # Configuracoes persistentes
├── config/
│   ├── settings.py         # Env vars, paths, constantes
│   └── database.py         # PostgreSQL connection (psycopg2)
├── services/
│   ├── scanner.py          # Escaneamento de pastas ~/gits
│   ├── file_collector.py   # Coleta arquivos-chave (README, etc)
│   ├── git_analyzer.py     # Info git (commits, branch, remote)
│   ├── llm_client.py       # Cliente OpenRouter (retry, rate limit)
│   ├── project_analyzer.py # Analise LLM de projetos
│   ├── script_generator.py # Gerador de roteiros Reels
│   ├── series_generator.py # Gerador conteudo de serie
│   ├── ideas_generator.py  # Gerador de ideias criativas
│   └── calendar_planner.py # Planejamento calendario com IA
├── prompts/
│   ├── analyze_project.txt     # Prompt analise de projeto
│   ├── generate_reels.txt      # Prompt roteiro Reels individual
│   ├── generate_series_launch.txt # Prompt conteudo de serie
│   ├── generate_ideas.txt      # Prompt gerador de ideias
│   └── plan_calendar.txt       # Prompt planejamento calendario
├── migrations/
│   ├── 001_initial_schema.sql      # Tabelas base
│   ├── 002_api_extensions.sql      # Timeline, LLM models, campos extras
│   └── 003_calendar_collections.sql # Calendario, colecoes
├── frontend/               # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── pages/          # 8 paginas
│       ├── components/     # UI components (Card, Badge, Sidebar, etc)
│       ├── api/            # Axios client
│       ├── types/          # TypeScript interfaces
│       └── styles/         # CSS global + tema Tailwind v4
├── utils/
│   ├── file_tree.py        # Geracao arvore de arquivos
│   └── logger.py           # Logger com rich
├── main.py                 # CLI entry point (argparse)
├── requirements.txt        # Dependencias Python
├── Dockerfile              # Multi-stage build
├── stack-docker.yml        # Docker Swarm + Traefik
└── .github/workflows/      # CI/CD GitHub Action
```

---

## Stack Tecnologico

### Backend
| Tecnologia | Versao | Uso |
|------------|--------|-----|
| Python | 3.12 | Linguagem principal |
| FastAPI | 0.115 | REST API |
| Uvicorn | 0.30 | ASGI server |
| psycopg2 | 2.9.9 | PostgreSQL driver |
| httpx | 0.27 | HTTP client (OpenRouter) |
| rich | 13.7 | CLI formatting |
| python-dotenv | 1.0.1 | Env vars |

### Frontend
| Tecnologia | Versao | Uso |
|------------|--------|-----|
| React | 19.2 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 8.0 | Build tool |
| Tailwind CSS | 4.2 | Styling |
| React Router | 7.13 | Routing |
| TanStack Query | 5.90 | Data fetching/cache |
| Recharts | 3.8 | Graficos |
| Lucide React | 0.577 | Icones |
| Axios | 1.13 | HTTP client |

### Infraestrutura
| Tecnologia | Uso |
|------------|-----|
| PostgreSQL 16 | Banco de dados |
| Docker + Swarm | Container e orquestracao |
| Traefik | Reverse proxy + SSL |
| GHCR | Container registry |
| GitHub Actions | CI/CD |
| Portainer | Gerenciamento |

### IA
| Tecnologia | Uso |
|------------|-----|
| OpenRouter API | Gateway para multiplos LLMs |
| 345 modelos | Catalogados de 55 providers |
| 34 modelos favoritos | Curados em 3 tiers de preco |
| Modelo padrao | Configuravel via banco |

---

## Banco de Dados

### PostgreSQL: `project_cataloger`
- **Host:** localhost:5432
- **User:** rafaeljrs / nw01

### Tabelas (11 tabelas)

#### `projects` (30 colunas)
Metadados de cada projeto escaneado.
- id, folder_name (unique), folder_path
- has_git, git_commit_count, git_last_commit_date, git_last_commit_msg, git_remote_url, git_primary_branch
- detected_languages (JSONB), file_count
- has_dockerfile, has_docker_compose, has_stack_docker, has_readme, has_claude_md, has_projeto_md, has_package_json, has_requirements_txt, has_github_actions
- databases_used, frameworks_used, tools_used (JSONB)
- last_file_modified_at, oldest_file_at
- raw_file_tree (TEXT)
- is_ignored (BOOLEAN)
- scanned_at, created_at, updated_at

#### `project_files` (8 colunas)
Conteudo dos arquivos-chave de cada projeto (README, package.json, Dockerfile, etc).
- id, project_id (FK), file_name, file_path, content (TEXT, max 8KB), file_size_bytes, was_truncated, collected_at

#### `analyses` (31 colunas)
Resultado da analise LLM de cada projeto.
- id, project_id (FK), llm_model
- project_name, description_short, description_long
- tech_stack (JSONB), category, subcategory
- target_audience, monetization_potential, monetization_ideas (JSONB)
- dev_time_estimate, dev_completion_pct, features_list (JSONB)
- marketing_hooks (JSONB), saas_readiness_score (1-10), saas_readiness_notes
- deployment_status, related_projects (JSONB), tags (JSONB)
- databases (JSONB), frameworks (JSONB), apis_integrations (JSONB), infrastructure (JSONB)
- raw_llm_response, input_tokens, output_tokens, cost_usd
- analyzed_at, created_at

#### `llm_models` (21 colunas)
Todos os modelos disponíveis no OpenRouter (345 modelos de 55 providers).
- id, model_id (unique), model_name, provider, description
- context_length, max_completion_tokens, modality
- input_modalities (JSONB), output_modalities (JSONB), tokenizer
- pricing_prompt, pricing_completion, pricing_image, pricing_request (DECIMAL)
- supported_parameters (JSONB), is_favorite, is_available
- model_created_at, fetched_at, created_at

#### `creative_scripts` (11 colunas)
Roteiros gerados por IA para Instagram Reels.
- id, analysis_id (FK), script_type, title, hook_text, script_body, visual_notes
- hashtags (JSONB), estimated_duration_sec, llm_model, generated_at

#### `content_calendar` (10 colunas)
Calendario de publicacao de conteudo.
- id, script_id (FK nullable), project_id (FK nullable)
- scheduled_date (DATE), scheduled_time, status (planned/recorded/edited/published)
- platform, notes, created_at, updated_at

#### `timeline_snapshots` (7 colunas)
Historico de eventos por projeto.
- id, project_id (FK), event_type, event_date, summary, metadata (JSONB), created_at

#### `collections` (5 colunas) + `collection_projects` (3 colunas)
Agrupamento de projetos em colecoes.
- collections: id, name, description, color, created_at
- collection_projects: collection_id, project_id, added_at

#### `app_settings` (3 colunas)
Configuracoes persistentes da aplicacao.
- key (PK), value, updated_at
- Chave principal: `default_model` (modelo LLM padrao)

#### `run_logs` (7 colunas)
Log de todas as operacoes executadas.
- id, run_type, project_id (FK nullable), status, error_message, duration_ms, created_at

---

## Backend (API)

### FastAPI - Porta 5815

#### Endpoints de Projetos (`/api/projects`)
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/projects` | Lista projetos (busca, filtro categoria/status/git, paginacao, sort) |
| GET | `/api/projects/categories` | Categorias distintas |
| GET | `/api/projects/{id}` | Detalhe do projeto + analise |
| GET | `/api/projects/{id}/files` | Arquivos-chave do projeto |
| PATCH | `/api/projects/{id}/ignore` | Toggle ignorar projeto |

**Filtros suportados:** search, category, deployment_status, has_git, show_ignored, sort_by (folder_name/saas_score/category/file_count/monetization/updated_at), order (asc/desc), page, per_page

#### Endpoints de Stats (`/api/stats`)
| GET | `/api/stats/overview` | Stats gerais (total, analisados, git, docker, tokens, etc) |
| GET | `/api/stats/categories` | Contagem por categoria |
| GET | `/api/stats/saas-distribution` | Distribuicao SaaS score |
| GET | `/api/stats/languages` | Linguagens mais usadas |
| GET | `/api/stats/deployment` | Status de deploy |
| GET | `/api/stats/monetization` | Potencial de monetizacao |
| GET | `/api/stats/top-projects` | Top projetos por SaaS score |
| GET | `/api/stats/tech-stack` | Tecnologias mais usadas |
| GET | `/api/stats/recent-activity` | Atividade recente |
| GET | `/api/stats/content-stats` | Stats de producao de conteudo |

#### Endpoints de Roteiros (`/api/scripts`)
| POST | `/api/scripts/generate` | Gerar roteiro para projeto (project_id, script_type, model) |
| POST | `/api/scripts/generate-batch` | Gerar roteiros em lote |
| POST | `/api/scripts/generate-series` | Gerar conteudo de serie/lancamento |
| POST | `/api/scripts/generate-ideas` | Gerar ideias criativas com IA |
| GET | `/api/scripts/ideas/status` | Status da geracao de ideias |
| GET | `/api/scripts` | Lista roteiros (filtro por projeto, tipo, busca) |
| GET | `/api/scripts/stats` | Contagem por tipo |
| GET | `/api/scripts/types` | Tipos disponiveis (13 tipos em 2 grupos) |
| GET | `/api/scripts/{id}` | Detalhe do roteiro |
| PUT | `/api/scripts/{id}` | Editar roteiro |
| DELETE | `/api/scripts/{id}` | Excluir roteiro |

**Tipos de roteiro - Projeto (5):**
- `reels_demo` - Demo do projeto funcionando
- `reels_tech` - Explicacao tecnica
- `reels_behind_scenes` - Bastidores
- `reels_tip` - Dica rapida
- `reels_problem_solution` - Problema e solucao

**Tipos de roteiro - Serie (8):**
- `series_intro` - Intro da serie
- `series_teaser` - Teaser/trailer
- `series_engagement` - Engajamento/interacao
- `series_behind_why` - Minha historia
- `series_weekly_intro` - Abertura de semana
- `series_milestone` - Marco/conquista
- `series_cta_follow` - CTA para seguir
- `series_collab` - Convite para colaboracao

#### Endpoints de Calendario (`/api/calendar`)
| GET | `/api/calendar?month=2026-03` | Entradas do mes |
| GET | `/api/calendar/stats?month=2026-03` | Stats do mes |
| POST | `/api/calendar` | Criar entrada |
| PUT | `/api/calendar/{id}` | Atualizar (data, status) |
| DELETE | `/api/calendar/{id}` | Excluir |
| POST | `/api/calendar/auto-schedule` | Auto-distribuir (simples) |
| POST | `/api/calendar/ai-plan` | Planejar com IA (estrategico) |
| GET | `/api/calendar/ai-plan/status` | Status do planejamento |

#### Endpoints de Modelos LLM (`/api/llm-models`)
| GET | `/api/llm-models` | Lista modelos (filtro provider, favoritos, busca) |
| GET | `/api/llm-models/providers` | Providers distintos |
| GET | `/api/llm-models/current` | Modelo padrao atual |
| PUT | `/api/llm-models/current` | Definir modelo padrao |
| POST | `/api/llm-models/sync` | Sincronizar com OpenRouter |
| PATCH | `/api/llm-models/{id}/favorite` | Toggle favorito |

#### Outros Endpoints
| GET | `/api/timeline/project/{id}` | Timeline de um projeto |
| GET | `/api/timeline/recent` | Eventos recentes |
| POST | `/api/actions/scan` | Trigger scan |
| POST | `/api/actions/analyze` | Trigger analise |
| GET | `/api/actions/logs` | Run logs |
| GET | `/api/settings` | Todas configuracoes |
| GET | `/api/settings/{key}` | Configuracao especifica |
| PUT | `/api/settings/{key}` | Atualizar configuracao |
| GET | `/api/health` | Health check |

---

## Frontend

### Porta 5264 (dev) / 80 (producao)

### Design System
- **Font:** Satoshi (Font Share)
- **Tema:** Dark sidebar (#0f1117) + Light content (#f8f9fc)
- **Cores:** Indigo primary (#6366f1), Emerald success (#10b981), Amber warning (#f59e0b)
- **Cards:** Rounded 2xl, shadow sutil, hover elevation
- **Animacoes:** fadeIn, slideIn, shimmer, transicoes 200-300ms
- **Glassmorphism:** Mobile top bar com backdrop-blur
- **Responsivo:** Mobile-first, sidebar drawer no mobile

### Paginas (8)

#### 1. Dashboard (`/`)
- 6 stat cards com gradientes e icones
- Painel de producao de conteudo (roteiros, agendados, publicados)
- Grafico donut de categorias
- Grafico de barras SaaS score
- Top 6 projetos rankeados (clicavel)
- Top 12 tecnologias mais usadas
- Grafico de linguagens
- Barras de monetizacao
- Status de deploy
- Atividade recente (ultimas 8 operacoes)
- Botoes: Escanear Todos, Analisar Todos

#### 2. Criar Conteudo (`/conteudo`)
4 abas:
- **Roteiro Projeto:** Seleciona projeto + tipo + modelo LLM → gera roteiro
- **Serie/Lancamento:** 8 tipos de conteudo de serie (intro, teaser, engagement, etc)
- **Gerador de Ideias:** IA gera X ideias novas (nao repete existentes)
- **Roteiros:** Lista todos os roteiros, filtro por projeto/tipo, modal de visualizacao com copiar/excluir

#### 3. Calendario (`/calendario`)
- Grade mensal interativa
- Botao "Planejar com I.A." com seletor de modelo e meta
- Auto-agendar 300 Reels/mes (simples ou com IA)
- Stats do mes (planejado/gravado/editado/publicado)
- Detalhe do dia com entradas e controle de status
- Temas semanais (gerados pela IA)

#### 4. Projetos (`/projetos`)
- Tabela desktop / cards mobile
- Busca, filtro por categoria, toggle ignorados
- Colunas: nome, categoria, SaaS score, monetizacao, status, tech stack, arquivos, info
- Clicavel para detalhe
- Botao ignorar por projeto

#### 5. Detalhe do Projeto (`/projetos/:id`)
3 abas:
- **Visao Geral:** Descricao, tech stack (tecnologias, DBs, frameworks, APIs, infra), linguagens, features, monetizacao, ganchos para Reels, SaaS readiness, git info, file tree
- **Arquivos:** Arquivos-chave expandiveis com conteudo
- **Timeline:** Eventos cronologicos (scan, analise, commits)
- Botoes: Re-escanear, Analisar com LLM, Ignorar/Restaurar

#### 6. Potencial (`/potencial`)
- Projetos agrupados: Alto Potencial, Medio+Score 6+, Deployed+Score 5+
- Cards detalhados com tech stack, publico-alvo, ideias monetizacao, ganchos Reels

#### 7. Modelos LLM (`/modelos`)
2 abas:
- **Recomendados:** 3 tiers curados (Ultra Baratos, Custo-Beneficio, Premium)
- **Todos:** 345 modelos com busca, filtro provider, favoritos
- Modelo padrao atual destacado
- Botao "Usar como padrao" em cada modelo
- Provider logos com iniciais coloridas
- Sincronizar com OpenRouter

#### 8. Atividade (`/logs`)
- Stats: total, sucesso, erros
- Lista de run_logs com icone status, tipo, projeto, duracao, horario

### Componentes UI
- **Card:** Glass ou surface, titulo opcional, rounded 2xl
- **Badge:** 9 variantes (default, primary, success, warning, error, high, medium, low, none), ring inset
- **Spinner:** Duplo anel com rotacao
- **ProviderLogo:** Iniciais coloridas com gradiente e shadow por provider
- **Sidebar:** Dark, nav com glow active, logo gradiente, footer com barras de progresso

---

## Servicos

### Scanner (`services/scanner.py`)
- Lista todas as pastas em ~/gits (exceto meusprojetos)
- Para cada: gera file tree, analisa git, coleta arquivos-chave, detecta linguagens
- Upsert no banco (INSERT ON CONFLICT UPDATE)
- 136 projetos escaneados com 0 erros

### Analisador (`services/project_analyzer.py`)
- Carrega projeto + arquivos do banco
- Monta prompt com template + dados
- Chama OpenRouter, parse JSON
- Armazena em `analyses` com 28 campos
- Suporta re-analise e retry de falhas

### Cliente LLM (`services/llm_client.py`)
- Modelo padrao lido do banco (app_settings.default_model)
- Retry com exponential backoff (3 tentativas)
- Rate limit handling (429)
- Parse JSON com fallback regex para code blocks
- Tracking de tokens

### Gerador de Roteiros (`services/script_generator.py`)
- Carrega analise do projeto
- Monta prompt com dados relevantes
- Chama LLM, parse, armazena em creative_scripts
- Suporta batch (multiplos projetos x tipos)

### Gerador de Serie (`services/series_generator.py`)
- Carrega overview de TODOS os projetos
- Gera conteudo de serie (intro, teaser, engagement, etc)
- Inclui caption, CTAs, conexao com proximo video, melhor horario
- Armazena como creative_script

### Gerador de Ideias (`services/ideas_generator.py`)
- Carrega projetos + roteiros ja existentes
- Gera X ideias NOVAS (nao repete)
- Cada ideia: titulo, hook, conceito, potencial viral, dificuldade, prioridade

### Planejador de Calendario (`services/calendar_planner.py`)
- Carrega todos os projetos analisados
- Chama LLM com prompt estrategico
- Gera distribuicao inteligente (projetos melhores = mais Reels)
- Cria temas semanais
- Insere entradas no content_calendar

---

## Prompts de IA

Todos os prompts seguem regras criticas de tom:
- NUNCA mencionar numeros exatos de projetos
- NUNCA dizer "quero virar referencia"
- NUNCA listar metricas do portfolio como argumento
- MOSTRAR > FALAR
- Tom: dev que faz e compartilha naturalmente
- pt-BR informal, zero cliche

### 5 Prompts
1. **analyze_project.txt** - Analise completa de projeto (nome, desc, tech stack, DBs, frameworks, APIs, infra, categoria, monetizacao, features, hooks, SaaS score)
2. **generate_reels.txt** - Roteiro individual (hook 3s, roteiro com timestamps, notas visuais, hashtags)
3. **generate_series_launch.txt** - Conteudo de serie (8 tipos: intro, teaser, engagement, historia, etc)
4. **generate_ideas.txt** - Ideias criativas (nao repete existentes, varia tipos, 30% engajamento)
5. **plan_calendar.txt** - Planejamento estrategico mensal (temas semanais, distribuicao inteligente)

---

## Funcionalidades Completas

### Fase 1 - Catalogacao (Completa)
- [x] Scanner de 136 projetos (file tree, git, arquivos-chave, linguagens)
- [x] Analise LLM com 28+ campos por projeto
- [x] 345 modelos LLM catalogados de 55 providers
- [x] 34 modelos favoritos em 3 tiers de preco
- [x] Modelo padrao configuravel via banco
- [x] Ignorar/restaurar projetos
- [x] Timeline de eventos por projeto
- [x] CLI completo (scan, analyze, status, top, export, serve)

### Fase 2 - Conteudo (Completa)
- [x] Gerador de roteiros para Reels (5 tipos de projeto)
- [x] Gerador de conteudo de serie (8 tipos)
- [x] Gerador de ideias criativas com IA
- [x] Calendario de conteudo mensal
- [x] Auto-schedule simples (300/mes)
- [x] Planejamento com IA (estrategico, temas semanais)
- [x] Controle de status (planejado→gravado→editado→publicado)

### Fase 3 - Frontend (Completa)
- [x] 8 paginas responsivas (mobile-first)
- [x] Design moderno (Satoshi font, dark sidebar, glassmorphism)
- [x] Dashboard completo com 10+ widgets
- [x] Seletor de modelos LLM com tiers curados
- [x] Modal de visualizacao de roteiros
- [x] Filtros, busca, paginacao em todas as listas

### Autenticacao
- [x] Google OAuth (projetos.rafaeljunior.vip)

---

## Deploy e Infraestrutura

### Docker
- **Dockerfile:** Multi-stage (Python slim + Node alpine para build frontend)
- **Image:** `ghcr.io/rafaeljuniorvip/meusprojetos:latest`
- **Porta interna:** 5815

### Portainer
- **Dominio:** `projetos.rafaeljunior.vip`
- **Network:** minha_rede (external)
- **Certresolver:** letsencryptresolver
- **Volume:** meusprojetos-data → /app/data

### GitHub Actions
- Trigger: push to main
- Build Docker → Push to GHCR
- Tag: latest + sha

---

## Configuracoes

### Variaveis de Ambiente
| Variavel | Descricao |
|----------|-----------|
| DATABASE_URL | PostgreSQL connection string |
| OPENROUTER_API_KEY | Chave API OpenRouter |
| GITS_PATH | Caminho das pastas de projetos (default: /home/rafaeljrs/gits) |
| MAX_FILE_SIZE | Tamanho maximo de arquivo para coleta (default: 8192) |
| SCAN_DELAY_SECONDS | Delay entre chamadas LLM (default: 1) |
| GOOGLE_CLIENT_ID | OAuth Google - Client ID |
| GOOGLE_CLIENT_SECRET | OAuth Google - Client Secret |

### App Settings (Banco)
| Chave | Descricao |
|-------|-----------|
| default_model | Modelo LLM padrao (ex: google/gemini-2.5-flash) |

---

## Comandos CLI

```bash
cd /home/rafaeljrs/gits/meusprojetos
source venv/bin/activate

# Banco
python main.py migrate              # Rodar migrations

# Scanner
python main.py scan                 # Escanear todos os projetos
python main.py scan -p whatsapp-agent  # Escanear um projeto

# Analise LLM
python main.py analyze              # Analisar projetos nao analisados
python main.py analyze -p galinhagorda  # Analisar um projeto
python main.py analyze -m google/gemini-2.5-flash  # Usar modelo especifico
python main.py analyze --reanalyze  # Re-analisar todos
python main.py analyze --retry-failed  # Retry dos que falharam

# Consultas
python main.py status               # Resumo
python main.py status -d            # Tabela detalhada
python main.py top                  # Top 20 por SaaS score
python main.py export               # Exportar JSON

# Servidor
python main.py serve                # Iniciar API (porta 5815)
python main.py serve --port 3800    # Porta custom
```

---

## Dados Atuais

| Metrica | Valor |
|---------|-------|
| Total projetos escaneados | 136 |
| Projetos analisados | 123 |
| Projetos ignorados | 14 |
| Projetos com Git | 79 |
| Projetos com Docker | 34 |
| Projetos deployed | 52+ |
| Alto potencial monetizacao | 10 |
| Modelos LLM catalogados | 345 |
| Modelos favoritos | 34 |
| Providers | 55 |
| Roteiros gerados | 1+ |
| Entradas calendario | 30 |
| Tokens consumidos | 587K+ input, 118K+ output |
| Custo estimado total | ~$0.07 (Gemini Flash) |
