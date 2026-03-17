import { useParams, Link } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import type { ProjectDetail as PD, ProjectFile, TimelineEvent } from '../types'
import {
  ArrowLeft, GitBranch, Calendar, Clock, Target, DollarSign,
  Lightbulb, Megaphone, Code, FileText, Container, RefreshCw, Cpu, ScanSearch, EyeOff, Eye
} from 'lucide-react'
import { useState } from 'react'

export default function ProjectDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'timeline'>('overview')

  const { data: project, isLoading } = useQuery<PD>({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data),
  })

  const { data: files } = useQuery<ProjectFile[]>({
    queryKey: ['project-files', id],
    queryFn: () => api.get(`/projects/${id}/files`).then(r => r.data),
    enabled: activeTab === 'files',
  })

  const { data: timeline } = useQuery<TimelineEvent[]>({
    queryKey: ['project-timeline', id],
    queryFn: () => api.get(`/timeline/project/${id}`).then(r => r.data),
    enabled: activeTab === 'timeline',
  })

  const scanMutation = useMutation({
    mutationFn: () => api.post('/actions/scan', { project: project?.folder_name }),
    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['project', id] }), 3000)
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: () => api.post('/actions/analyze', { project: project?.folder_name }),
    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['project', id] }), 10000)
    },
  })

  const ignoreMutation = useMutation({
    mutationFn: () => api.patch(`/projects/${id}/ignore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', id] }),
  })

  if (isLoading) return <Spinner />
  if (!project) return <p>Projeto nao encontrado</p>

  const tabs = [
    { key: 'overview', label: 'Visao Geral' },
    { key: 'files', label: 'Arquivos' },
    { key: 'timeline', label: 'Timeline' },
  ] as const

  return (
    <div>
      <Link to="/projetos" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary mb-3 sm:mb-4">
        <ArrowLeft size={16} /> Voltar
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold">{project.project_name || project.folder_name}</h2>
          {project.project_name && (
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">{project.folder_name}</p>
          )}
          {project.description_short && (
            <p className="text-xs sm:text-sm text-text-secondary mt-1.5 sm:mt-2">{project.description_short}</p>
          )}
        </div>
        {project.saas_readiness_score && (
          <div className="text-center shrink-0 flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0">
            <div className={`text-2xl sm:text-3xl font-bold ${
              project.saas_readiness_score >= 7 ? 'text-green-600' :
              project.saas_readiness_score >= 4 ? 'text-orange-500' : 'text-gray-400'
            }`}>
              {project.saas_readiness_score}
            </div>
            <p className="text-xs text-text-secondary">SaaS Score</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm border border-border rounded-lg bg-surface hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <ScanSearch size={14} className={scanMutation.isPending ? 'animate-spin' : ''} />
          {scanMutation.isPending ? 'Escaneando...' : 'Re-escanear'}
        </button>
        <button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          <Cpu size={14} className={analyzeMutation.isPending ? 'animate-spin' : ''} />
          {analyzeMutation.isPending ? 'Analisando...' : 'Analisar com LLM'}
        </button>
        <button
          onClick={() => ignoreMutation.mutate()}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm border rounded-lg transition-colors ${
            (project as any).is_ignored
              ? 'border-green-400 bg-green-50 text-green-700 hover:bg-green-100'
              : 'border-border bg-surface text-text-secondary hover:bg-gray-50'
          }`}
        >
          {(project as any).is_ignored ? <Eye size={14} /> : <EyeOff size={14} />}
          {(project as any).is_ignored ? 'Restaurar' : 'Ignorar'}
        </button>
        {(scanMutation.isSuccess || analyzeMutation.isSuccess) && (
          <span className="flex items-center text-xs text-green-600">Iniciado! Aguarde alguns segundos e recarregue.</span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
        {project.category && <Badge variant="primary">{project.category}</Badge>}
        {project.deployment_status && (
          <Badge variant={project.deployment_status === 'deployed' ? 'success' : 'default'}>
            {project.deployment_status}
          </Badge>
        )}
        {project.monetization_potential && (
          <Badge variant={project.monetization_potential}>{project.monetization_potential} potencial</Badge>
        )}
        {project.has_git && <Badge variant="default"><GitBranch size={12} className="mr-1" /> Git</Badge>}
        {project.has_dockerfile && <Badge variant="default"><Container size={12} className="mr-1" /> Docker</Badge>}
        {project.has_github_actions && <Badge variant="default">CI/CD</Badge>}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 sm:gap-1 border-b border-border mb-3 sm:mb-4 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab project={project} />}
      {activeTab === 'files' && <FilesTab files={files} />}
      {activeTab === 'timeline' && <TimelineTab timeline={timeline} />}
    </div>
  )
}

function OverviewTab({ project }: { project: PD }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      {/* Descricao */}
      {project.description_long && (
        <Card title="Descricao Completa" className="lg:col-span-2">
          <p className="text-xs sm:text-sm text-text-secondary whitespace-pre-line leading-relaxed">
            {project.description_long}
          </p>
        </Card>
      )}

      {/* Tech Stack */}
      <Card title="Tech Stack">
        <div className="space-y-3">
          {project.tech_stack && (project.tech_stack as string[]).length > 0 && (
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1.5 flex items-center gap-1">
                <Code size={12} /> Tecnologias
              </p>
              <div className="flex flex-wrap gap-1">
                {(project.tech_stack as string[]).map(t => (
                  <span key={t} className="text-[11px] sm:text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{t}</span>
                ))}
              </div>
            </div>
          )}
          {project.databases && (project.databases as string[]).length > 0 && (
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1.5">Bancos de Dados</p>
              <div className="flex flex-wrap gap-1">
                {(project.databases as string[]).map(d => (
                  <span key={d} className="text-[11px] sm:text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{d}</span>
                ))}
              </div>
            </div>
          )}
          {project.frameworks && (project.frameworks as string[]).length > 0 && (
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1.5">Frameworks</p>
              <div className="flex flex-wrap gap-1">
                {(project.frameworks as string[]).map(f => (
                  <span key={f} className="text-[11px] sm:text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{f}</span>
                ))}
              </div>
            </div>
          )}
          {project.apis_integrations && (project.apis_integrations as string[]).length > 0 && (
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1.5">APIs e Integracoes</p>
              <div className="flex flex-wrap gap-1">
                {(project.apis_integrations as string[]).map(a => (
                  <span key={a} className="text-[11px] sm:text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">{a}</span>
                ))}
              </div>
            </div>
          )}
          {project.infrastructure && (project.infrastructure as string[]).length > 0 && (
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1.5">Infraestrutura</p>
              <div className="flex flex-wrap gap-1">
                {(project.infrastructure as string[]).map(inf => (
                  <span key={inf} className="text-[11px] sm:text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{inf}</span>
                ))}
              </div>
            </div>
          )}
          {project.detected_languages && Object.keys(project.detected_languages).length > 0 && (
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1.5">Linguagens (por arquivo)</p>
              <div className="space-y-1">
                {Object.entries(project.detected_languages as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .map(([lang, pct]) => (
                    <div key={lang} className="flex items-center gap-2">
                      <span className="text-[11px] sm:text-xs w-16 sm:w-20 truncate">{lang}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] sm:text-xs text-text-secondary w-8 text-right">{pct}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Features */}
      <Card title="Features">
        {project.features_list && (project.features_list as string[]).length > 0 ? (
          <ul className="space-y-1.5">
            {(project.features_list as string[]).map((f, i) => (
              <li key={i} className="text-xs sm:text-sm text-text-secondary flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">-</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs sm:text-sm text-text-secondary">Sem features listadas</p>
        )}
      </Card>

      {/* Monetizacao */}
      <Card title="Monetizacao">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-green-600" />
            <span className="text-xs sm:text-sm font-medium">
              Potencial: {project.monetization_potential || 'N/A'}
            </span>
          </div>
          {project.monetization_ideas && (project.monetization_ideas as string[]).length > 0 && (
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1.5 flex items-center gap-1">
                <Lightbulb size={12} /> Ideias
              </p>
              <ul className="space-y-1">
                {(project.monetization_ideas as string[]).map((idea, i) => (
                  <li key={i} className="text-xs sm:text-sm text-text-secondary">- {idea}</li>
                ))}
              </ul>
            </div>
          )}
          {project.target_audience && (
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
                <Target size={12} /> Publico-alvo
              </p>
              <p className="text-xs sm:text-sm text-text-secondary">{project.target_audience}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Marketing Hooks */}
      <Card title="Ganchos para Reels">
        {project.marketing_hooks && (project.marketing_hooks as string[]).length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {(project.marketing_hooks as string[]).map((hook, i) => (
              <div key={i} className="p-2.5 sm:p-3 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex items-start gap-2">
                  <Megaphone size={14} className="text-orange-500 mt-0.5 shrink-0" />
                  <p className="text-xs sm:text-sm text-text-primary">{hook}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-text-secondary">Sem hooks gerados</p>
        )}
      </Card>

      {/* SaaS Readiness */}
      {project.saas_readiness_notes && (
        <Card title="SaaS Readiness" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3">
            <div className="flex items-center gap-0.5 sm:gap-1">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 sm:w-6 h-1.5 sm:h-2 rounded-sm ${
                    i < (project.saas_readiness_score || 0)
                      ? project.saas_readiness_score! >= 7 ? 'bg-green-500' :
                        project.saas_readiness_score! >= 4 ? 'bg-orange-400' : 'bg-gray-400'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs sm:text-sm font-medium">{project.saas_readiness_score}/10</span>
            {project.dev_completion_pct !== null && (
              <span className="text-xs sm:text-sm text-text-secondary">| {project.dev_completion_pct}% completo</span>
            )}
            {project.dev_time_estimate && (
              <span className="text-xs sm:text-sm text-text-secondary flex items-center gap-1">
                <Clock size={12} /> {project.dev_time_estimate}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-text-secondary">{project.saas_readiness_notes}</p>
        </Card>
      )}

      {/* Git Info */}
      {project.has_git && (
        <Card title="Git Info">
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Commits</span>
              <span className="font-medium">{project.git_commit_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Branch</span>
              <span className="font-medium">{project.git_primary_branch || '-'}</span>
            </div>
            {project.git_last_commit_date && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Ultimo commit</span>
                <span className="font-medium">{new Date(project.git_last_commit_date).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            {project.git_last_commit_msg && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-text-secondary break-all">
                {project.git_last_commit_msg}
              </div>
            )}
            {project.git_remote_url && (
              <p className="text-[11px] text-text-secondary break-all mt-2">{project.git_remote_url}</p>
            )}
          </div>
        </Card>
      )}

      {/* File Tree */}
      {project.raw_file_tree && (
        <Card title="Estrutura de Arquivos">
          <pre className="text-[10px] sm:text-xs text-text-secondary overflow-auto max-h-64 font-mono leading-relaxed">
            {project.raw_file_tree}
          </pre>
        </Card>
      )}
    </div>
  )
}

function FilesTab({ files }: { files?: ProjectFile[] }) {
  const [openFile, setOpenFile] = useState<number | null>(null)

  if (!files) return <Spinner />

  return (
    <div className="space-y-2">
      {files.map(f => (
        <div key={f.id} className="bg-surface border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setOpenFile(openFile === f.id ? null : f.id)}
            className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-xs sm:text-sm font-medium min-w-0">
              <FileText size={14} className="text-text-secondary shrink-0" />
              <span className="truncate">{f.file_path}</span>
            </span>
            <span className="text-[11px] sm:text-xs text-text-secondary shrink-0 ml-2">
              {(f.file_size_bytes / 1024).toFixed(1)} KB
            </span>
          </button>
          {openFile === f.id && (
            <div className="border-t border-border">
              <pre className="p-3 sm:p-4 text-[10px] sm:text-xs font-mono text-text-secondary overflow-auto max-h-72 sm:max-h-96 bg-gray-50 leading-relaxed">
                {f.content}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function TimelineTab({ timeline }: { timeline?: TimelineEvent[] }) {
  if (!timeline) return <Spinner />
  if (timeline.length === 0) return <p className="text-xs sm:text-sm text-text-secondary">Nenhum evento registrado</p>

  const eventIcons: Record<string, string> = {
    scan: 'bg-blue-500',
    analysis: 'bg-green-500',
    git_commit: 'bg-orange-500',
    file_change: 'bg-gray-400',
  }

  return (
    <div className="relative pl-5 sm:pl-6">
      <div className="absolute left-2 sm:left-2.5 top-0 bottom-0 w-px bg-border" />
      {timeline.map(evt => (
        <div key={evt.id} className="relative mb-3 sm:mb-4">
          <div className={`absolute -left-3 sm:-left-3.5 w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full border-2 border-white ${eventIcons[evt.event_type] || 'bg-gray-400'}`} />
          <div className="bg-surface border border-border rounded-lg p-2.5 sm:p-3 ml-1.5 sm:ml-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
              <Badge>{evt.event_type}</Badge>
              <span className="text-[11px] sm:text-xs text-text-secondary flex items-center gap-1">
                <Calendar size={11} />
                {new Date(evt.event_date).toLocaleString('pt-BR')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary">{evt.summary}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
