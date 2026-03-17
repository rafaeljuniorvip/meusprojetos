import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import api from '../api/client'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import type { Project } from '../types'
import { TrendingUp, DollarSign, Rocket, Target } from 'lucide-react'

interface TopProject extends Project {
  description_long: string | null
  target_audience: string | null
  monetization_ideas: string[] | null
  marketing_hooks: string[] | null
  saas_readiness_notes: string | null
  dev_time_estimate: string | null
  dev_completion_pct: number | null
  features_list: string[] | null
  databases: string[] | null
  frameworks: string[] | null
  apis_integrations: string[] | null
}

export default function TopProjects() {
  const navigate = useNavigate()

  const { data: projects, isLoading } = useQuery<TopProject[]>({
    queryKey: ['top-projects'],
    queryFn: async () => {
      const res = await api.get('/projects', {
        params: { sort_by: 'saas_score', order: 'desc', per_page: 50 }
      })
      // Fetch full details for top projects with analysis
      const withAnalysis = res.data.data.filter((p: TopProject) => p.analysis_id)
      const detailed = await Promise.all(
        withAnalysis.slice(0, 30).map((p: TopProject) =>
          api.get(`/projects/${p.id}`).then(r => r.data)
        )
      )
      return detailed
    },
  })

  if (isLoading) return <Spinner />

  const highPotential = projects?.filter(p => p.monetization_potential === 'high') || []
  const mediumPotential = projects?.filter(p => p.monetization_potential === 'medium' && (p.saas_readiness_score || 0) >= 6) || []
  const deployed = projects?.filter(p => p.deployment_status === 'deployed' && (p.saas_readiness_score || 0) >= 5) || []

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Projetos com Potencial</h2>

      {/* High potential section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Star size={18} className="text-green-600" />
          <h3 className="text-sm sm:text-base font-semibold text-green-700">
            Alto Potencial de Monetizacao ({highPotential.length})
          </h3>
        </div>
        <div className="space-y-3">
          {highPotential.map(p => (
            <ProjectPotentialCard key={p.id} project={p} onNavigate={() => navigate(`/projetos/${p.id}`)} />
          ))}
          {highPotential.length === 0 && <p className="text-sm text-text-secondary">Nenhum projeto com alto potencial</p>}
        </div>
      </div>

      {/* Medium + high SaaS score */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-orange-500" />
          <h3 className="text-sm sm:text-base font-semibold text-orange-600">
            Medio Potencial + SaaS Score 6+ ({mediumPotential.length})
          </h3>
        </div>
        <div className="space-y-3">
          {mediumPotential.map(p => (
            <ProjectPotentialCard key={p.id} project={p} onNavigate={() => navigate(`/projetos/${p.id}`)} />
          ))}
          {mediumPotential.length === 0 && <p className="text-sm text-text-secondary">Nenhum projeto nesta faixa</p>}
        </div>
      </div>

      {/* Deployed and ready */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Rocket size={18} className="text-purple-600" />
          <h3 className="text-sm sm:text-base font-semibold text-purple-700">
            Deployed + SaaS Score 5+ ({deployed.length})
          </h3>
        </div>
        <div className="space-y-3">
          {deployed.map(p => (
            <ProjectPotentialCard key={p.id} project={p} onNavigate={() => navigate(`/projetos/${p.id}`)} />
          ))}
          {deployed.length === 0 && <p className="text-sm text-text-secondary">Nenhum projeto nesta faixa</p>}
        </div>
      </div>
    </div>
  )
}

function ProjectPotentialCard({ project: p, onNavigate }: { project: TopProject; onNavigate: () => void }) {
  const scoreColor = (p.saas_readiness_score || 0) >= 7 ? 'text-green-600' :
    (p.saas_readiness_score || 0) >= 4 ? 'text-orange-500' : 'text-gray-400'

  return (
    <div
      onClick={onNavigate}
      className="bg-surface border border-border rounded-lg p-3 sm:p-4 cursor-pointer active:bg-primary/5 hover:border-primary/30 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="text-sm sm:text-base font-semibold">{p.project_name || p.folder_name}</h4>
            <span className={`text-lg font-bold ${scoreColor}`}>{p.saas_readiness_score}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {p.category && <Badge variant="primary">{p.category}</Badge>}
            {p.monetization_potential && <Badge variant={p.monetization_potential}>{p.monetization_potential}</Badge>}
            {p.deployment_status && (
              <Badge variant={p.deployment_status === 'deployed' ? 'success' : 'default'}>{p.deployment_status}</Badge>
            )}
          </div>
          {p.description_short && (
            <p className="text-xs sm:text-sm text-text-secondary">{p.description_short}</p>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-3">
        {/* Tech stack */}
        {p.tech_stack && (p.tech_stack as string[]).length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-text-secondary mb-1">Tech Stack</p>
            <div className="flex flex-wrap gap-1">
              {(p.tech_stack as string[]).map(t => (
                <span key={t} className="text-[10px] sm:text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Target audience */}
        {p.target_audience && (
          <div>
            <p className="text-[11px] font-medium text-text-secondary mb-1 flex items-center gap-1">
              <Target size={10} /> Publico-alvo
            </p>
            <p className="text-[11px] sm:text-xs text-text-secondary">{p.target_audience}</p>
          </div>
        )}

        {/* Monetization ideas */}
        {p.monetization_ideas && (p.monetization_ideas as string[]).length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-text-secondary mb-1 flex items-center gap-1">
              <DollarSign size={10} /> Ideias de Monetizacao
            </p>
            <ul className="space-y-0.5">
              {(p.monetization_ideas as string[]).slice(0, 3).map((idea, i) => (
                <li key={i} className="text-[11px] sm:text-xs text-text-secondary">- {idea}</li>
              ))}
            </ul>
          </div>
        )}

        {/* SaaS readiness */}
        {p.saas_readiness_notes && (
          <div>
            <p className="text-[11px] font-medium text-text-secondary mb-1">O que falta para SaaS</p>
            <p className="text-[11px] sm:text-xs text-text-secondary">{p.saas_readiness_notes}</p>
          </div>
        )}
      </div>

      {/* Marketing hooks preview */}
      {p.marketing_hooks && (p.marketing_hooks as string[]).length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[11px] font-medium text-orange-600 mb-1">Gancho para Reels:</p>
          <p className="text-[11px] sm:text-xs text-text-secondary italic">
            "{(p.marketing_hooks as string[])[0]}"
          </p>
        </div>
      )}

      {/* Footer info */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-text-secondary">
        {p.dev_time_estimate && <span>Tempo: {p.dev_time_estimate}</span>}
        {p.dev_completion_pct !== null && <span>{p.dev_completion_pct}% completo</span>}
        <span>{p.file_count} arquivos</span>
        {p.git_commit_count && <span>{p.git_commit_count} commits</span>}
      </div>
    </div>
  )
}
