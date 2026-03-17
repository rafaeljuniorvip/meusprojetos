import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import type { PaginatedResponse } from '../types'
import { Video, Sparkles, Copy, Trash2, Clock, Hash, Lightbulb, Rocket, Film, ArrowRight } from 'lucide-react'

interface Script {
  id: number; script_type: string; title: string; hook_text: string
  script_body: string; visual_notes: string; hashtags: string[]
  estimated_duration_sec: number; llm_model: string; generated_at: string
  project_name: string; folder_name: string; project_id: number
}
interface ScriptType { id: string; label: string; description: string; group: string }
interface Idea {
  title: string; type: string; hook: string; concept: string
  project_folder: string | null; why_viral: string; difficulty: string; priority: string
}

export default function ContentCreator() {
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<'project' | 'series' | 'ideas' | 'scripts'>('project')
  const [viewScript, setViewScript] = useState<Script | null>(null)

  // Common data
  const { data: projects } = useQuery({
    queryKey: ['all-projects-simple'],
    queryFn: () => api.get('/projects', { params: { per_page: 200 } }).then(r => r.data.data),
  })
  const { data: types } = useQuery<ScriptType[]>({
    queryKey: ['script-types'],
    queryFn: () => api.get('/scripts/types').then(r => r.data),
  })
  const { data: models } = useQuery({
    queryKey: ['fav-models'],
    queryFn: () => api.get('/llm-models', { params: { favorite_only: true, per_page: 50 } }).then(r => r.data.data),
  })
  const { data: currentModel } = useQuery({
    queryKey: ['current-model'],
    queryFn: () => api.get('/llm-models/current').then(r => r.data),
  })
  const { data: stats } = useQuery({
    queryKey: ['script-stats'],
    queryFn: () => api.get('/scripts/stats').then(r => r.data),
  })

  const analyzedProjects = (projects || []).filter((p: any) => p.analysis_id)
  const projectTypes = (types || []).filter(t => t.group === 'projeto')
  const seriesTypes = (types || []).filter(t => t.group === 'serie')

  const sections = [
    { key: 'project', label: 'Roteiro Projeto', icon: Film },
    { key: 'series', label: 'Serie/Lancamento', icon: Rocket },
    { key: 'ideas', label: 'Gerador de Ideias', icon: Lightbulb },
    { key: 'scripts', label: `Roteiros (${stats?.total_scripts || 0})`, icon: Video },
  ] as const

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Video size={20} className="text-primary" />
        <h2 className="text-lg font-semibold">Criador de Conteudo</h2>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border mb-3 pb-0">
        {sections.map(s => {
          const Icon = s.icon
          return (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                activeSection === s.key ? 'border-primary text-primary' : 'border-transparent text-text-secondary'}`}>
              <Icon size={14} /> {s.label}
            </button>
          )
        })}
      </div>

      {activeSection === 'project' && <ProjectScriptSection projects={analyzedProjects} types={projectTypes} models={models} currentModel={currentModel} queryClient={queryClient} />}
      {activeSection === 'series' && <SeriesSection types={seriesTypes} models={models} currentModel={currentModel} queryClient={queryClient} />}
      {activeSection === 'ideas' && <IdeasSection models={models} currentModel={currentModel} />}
      {activeSection === 'scripts' && <ScriptsListSection types={types || []} projects={analyzedProjects} onView={setViewScript} queryClient={queryClient} />}

      {/* Script viewer modal */}
      {viewScript && <ScriptModal script={viewScript} onClose={() => setViewScript(null)} queryClient={queryClient} />}
    </div>
  )
}

function ModelSelector({ models, currentModel, value, onChange }: any) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface">
      <option value="">Padrao ({currentModel?.model?.model_name || '...'})</option>
      {(models || []).map((m: any) => (
        <option key={m.model_id} value={m.model_id}>{m.model_name} - ${m.pricing_completion?.toFixed(2)}/M out</option>
      ))}
    </select>
  )
}

function ProjectScriptSection({ projects, types, models, currentModel, queryClient }: any) {
  const [project, setProject] = useState<number | null>(null)
  const [type, setType] = useState('reels_demo')
  const [model, setModel] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.post('/scripts/generate', { project_id: project, script_type: type, model: model || undefined }),
    onSuccess: () => setTimeout(() => queryClient.invalidateQueries({ queryKey: ['scripts', 'script-stats'] }), 8000),
  })

  return (
    <Card title="Gerar Roteiro para Projeto">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">Projeto</label>
          <select value={project || ''} onChange={e => setProject(Number(e.target.value) || null)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface">
            <option value="">Selecione...</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.project_name || p.folder_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">Tipo</label>
          <div className="flex flex-wrap gap-1.5">
            {types.map((t: ScriptType) => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`px-2.5 py-1.5 text-xs rounded-lg border ${type === t.id ? 'bg-primary text-white border-primary' : 'bg-surface text-text-secondary border-border'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">Modelo LLM</label>
          <ModelSelector models={models} currentModel={currentModel} value={model} onChange={setModel} />
        </div>
        <button onClick={() => mutation.mutate()} disabled={!project || mutation.isPending}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
          <Sparkles size={14} className={mutation.isPending ? 'animate-spin' : ''} />
          {mutation.isPending ? 'Gerando...' : 'Gerar Roteiro'}
        </button>
        {mutation.isSuccess && <p className="text-xs text-green-600">Roteiro sendo gerado! Veja na aba "Roteiros" em alguns segundos.</p>}
      </div>
    </Card>
  )
}

function SeriesSection({ types, models, currentModel, queryClient }: any) {
  const [type, setType] = useState('series_intro')
  const [model, setModel] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.post('/scripts/generate-series', { content_type: type, model: model || undefined }),
    onSuccess: () => setTimeout(() => queryClient.invalidateQueries({ queryKey: ['scripts', 'script-stats'] }), 8000),
  })

  return (
    <Card title="Conteudo de Serie / Lancamento">
      <p className="text-xs text-text-secondary mb-3">
        Gere roteiros para estruturar o inicio da sua serie: apresentacao, teasers, engajamento, historia, e mais.
        A I.A. conhece todos os seus projetos e cria conteudo personalizado.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">Tipo de Conteudo</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {types.map((t: ScriptType) => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`p-2 text-left rounded-lg border ${type === t.id ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-surface border-border text-text-secondary'}`}>
                <p className="text-xs font-medium">{t.label}</p>
                <p className="text-[10px] mt-0.5 opacity-75">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">Modelo LLM</label>
          <ModelSelector models={models} currentModel={currentModel} value={model} onChange={setModel} />
        </div>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
          <Rocket size={14} className={mutation.isPending ? 'animate-spin' : ''} />
          {mutation.isPending ? 'Gerando...' : 'Gerar Conteudo de Serie'}
        </button>
        {mutation.isSuccess && <p className="text-xs text-green-600">Conteudo de serie sendo gerado! Veja na aba "Roteiros".</p>}
      </div>
    </Card>
  )
}

function IdeasSection({ models, currentModel }: any) {
  const [count, setCount] = useState(10)
  const [model, setModel] = useState('')
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)

  const mutation = useMutation({
    mutationFn: () => api.post('/scripts/generate-ideas', { count, model: model || undefined }),
    onSuccess: () => {
      setLoading(true)
      const poll = setInterval(async () => {
        try {
          const res = await api.get('/scripts/ideas/status')
          if (res.data.status !== 'generating') {
            clearInterval(poll)
            setLoading(false)
            if (res.data.status === 'ok') {
              setIdeas(prev => [...res.data.ideas, ...prev])
            }
          }
        } catch { clearInterval(poll); setLoading(false) }
      }, 3000)
    },
  })

  const priorityColors: Record<string, string> = { high: 'success', medium: 'warning', low: 'default' }
  const difficultyLabels: Record<string, string> = { easy: 'Facil', medium: 'Medio', hard: 'Dificil' }

  return (
    <div className="space-y-4">
      <Card title="Gerar Novas Ideias com I.A.">
        <p className="text-xs text-text-secondary mb-3">
          A I.A. analisa seus projetos e os roteiros ja gerados para sugerir ideias NOVAS e criativas.
          Quanto mais voce gera, mais contexto ela tem para nao repetir.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-text-secondary mb-1 block">Modelo LLM</label>
            <ModelSelector models={models} currentModel={currentModel} value={model} onChange={setModel} />
          </div>
          <div className="w-24">
            <label className="text-xs font-medium text-text-secondary mb-1 block">Qtd ideias</label>
            <input type="number" value={count} onChange={e => setCount(Number(e.target.value))} min={3} max={30}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface" />
          </div>
          <div className="flex items-end">
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending || loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
              <Lightbulb size={14} className={(mutation.isPending || loading) ? 'animate-spin' : ''} />
              {(mutation.isPending || loading) ? 'Gerando...' : `Gerar ${count} Ideias`}
            </button>
          </div>
        </div>
      </Card>

      {/* Ideas list */}
      {ideas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Lightbulb size={14} className="text-orange-500" />
            {ideas.length} ideias geradas
          </h3>
          <div className="space-y-2">
            {ideas.map((idea, i) => (
              <div key={i} className="bg-surface border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <Badge variant={priorityColors[idea.priority] || 'default'}>{idea.priority}</Badge>
                      <Badge variant="primary">{idea.type.replace('reels_', '').replace('series_', 'serie: ')}</Badge>
                      <span className="text-[10px] text-text-secondary">{difficultyLabels[idea.difficulty] || idea.difficulty}</span>
                    </div>
                    <p className="text-sm font-medium">{idea.title}</p>
                  </div>
                </div>
                <div className="p-2 bg-orange-50 rounded border border-orange-100 mb-2">
                  <p className="text-xs font-medium text-orange-700">Hook: "{idea.hook}"</p>
                </div>
                <p className="text-xs text-text-secondary mb-1.5">{idea.concept}</p>
                {idea.project_folder && (
                  <p className="text-[11px] text-text-secondary">Projeto: <span className="font-medium">{idea.project_folder}</span></p>
                )}
                <p className="text-[11px] text-green-600 mt-1">Potencial viral: {idea.why_viral}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ScriptsListSection({ types, projects, onView, queryClient }: any) {
  const [filterProject, setFilterProject] = useState<number | null>(null)
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)

  const { data: scripts, isLoading } = useQuery<PaginatedResponse<Script>>({
    queryKey: ['scripts', filterProject, filterType, page],
    queryFn: () => api.get('/scripts', {
      params: { project_id: filterProject || undefined, script_type: filterType || undefined, page, per_page: 15 }
    }).then(r => r.data),
  })

  const typeColors: Record<string, string> = {
    reels_demo: 'primary', reels_tech: 'success', reels_behind_scenes: 'warning',
    reels_tip: 'default', reels_problem_solution: 'error',
    series_intro: 'primary', series_teaser: 'warning', series_engagement: 'success',
    series_behind_why: 'default', series_weekly_intro: 'primary', series_milestone: 'success',
    series_cta_follow: 'warning', series_collab: 'error',
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <select value={filterProject || ''} onChange={e => { setFilterProject(Number(e.target.value) || null); setPage(1) }}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-surface">
          <option value="">Todos projetos</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.project_name || p.folder_name}</option>)}
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-surface">
          <option value="">Todos tipos</option>
          {types.map((t: ScriptType) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="space-y-2">
          {scripts?.data.map(s => (
            <div key={s.id} onClick={() => onView(s)}
              className="bg-surface border border-border rounded-lg p-3 cursor-pointer active:bg-primary/5 hover:border-primary/30">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge variant={typeColors[s.script_type] || 'default'}>{s.script_type.replace('reels_', '').replace('series_', 'serie: ')}</Badge>
                    <span className="text-[11px] text-text-secondary">{s.project_name || s.folder_name}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{s.title}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-text-secondary shrink-0">
                  <Clock size={10} /> {s.estimated_duration_sec}s
                </div>
              </div>
              <p className="text-xs text-orange-600 font-medium truncate">"{s.hook_text}"</p>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-secondary">
                <span>{new Date(s.generated_at).toLocaleDateString('pt-BR')}</span>
                <span>{s.llm_model}</span>
              </div>
            </div>
          ))}
          {scripts?.data.length === 0 && <p className="text-sm text-text-secondary py-8 text-center">Nenhum roteiro gerado ainda.</p>}
        </div>
      )}
      {scripts && scripts.pages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-text-secondary">{scripts.total} roteiros</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-2.5 py-1 text-xs border border-border rounded bg-surface disabled:opacity-50">Anterior</button>
            <button disabled={page >= scripts.pages} onClick={() => setPage(p => p + 1)}
              className="px-2.5 py-1 text-xs border border-border rounded bg-surface disabled:opacity-50">Proximo</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ScriptModal({ script: s, onClose, queryClient }: { script: Script; onClose: () => void; queryClient: any }) {
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/scripts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['script-stats'] })
      onClose()
    },
  })

  const copyAll = () => {
    const hashtags = typeof s.hashtags === 'string' ? JSON.parse(s.hashtags) : (s.hashtags || [])
    navigator.clipboard.writeText(`${s.hook_text}\n\n${s.script_body}\n\n${s.visual_notes}\n\n${hashtags.join(' ')}`)
  }

  const hashtags = typeof s.hashtags === 'string' ? JSON.parse(s.hashtags) : (s.hashtags || [])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-2xl sm:rounded-lg max-h-[90vh] overflow-auto rounded-t-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface border-b border-border p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge>{s.script_type.replace('reels_', '').replace('series_', 'serie: ')}</Badge>
            <span className="text-xs text-text-secondary">{s.project_name || s.folder_name}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={copyAll} className="p-1.5 text-text-secondary hover:text-primary" title="Copiar"><Copy size={16} /></button>
            <button onClick={() => deleteMutation.mutate(s.id)} className="p-1.5 text-text-secondary hover:text-red-500" title="Excluir"><Trash2 size={16} /></button>
            <button onClick={onClose} className="text-sm text-text-secondary px-2">Fechar</button>
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold">{s.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
              <Clock size={12} /> {s.estimated_duration_sec}s | {s.llm_model} | {new Date(s.generated_at).toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-[11px] font-medium text-orange-600 mb-1">HOOK (primeiros 3s)</p>
            <p className="text-sm font-semibold">{s.hook_text}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-secondary mb-1">ROTEIRO</p>
            <pre className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 rounded-lg">{s.script_body}</pre>
          </div>
          <div>
            <p className="text-xs font-medium text-text-secondary mb-1">NOTAS VISUAIS / EXTRAS</p>
            <pre className="text-xs sm:text-sm text-text-secondary whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 rounded-lg">{s.visual_notes}</pre>
          </div>
          {hashtags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1 flex items-center gap-1"><Hash size={12} /> HASHTAGS</p>
              <div className="flex flex-wrap gap-1">
                {hashtags.map((h: string, i: number) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{h}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
