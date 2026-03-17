import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import type { LlmModel, PaginatedResponse } from '../types'
import { Star, RefreshCw, Search, Check, Zap, Scale, Crown } from 'lucide-react'
import ProviderLogo from '../components/ui/ProviderLogo'

const TIERS = [
  {
    key: 'ultra',
    label: 'Ultra Baratos',
    icon: Zap,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    desc: '< $0.50/M output - modelos recentes',
    models: [
      'qwen/qwen3.5-flash-02-23',        // 1M ctx, $0.26 out - fev/2026
      'qwen/qwen3.5-9b',                  // 256K, $0.15 out - mar/2026
      'deepseek/deepseek-v3.2',           // 164K, $0.38 out - dez/2025
      'openai/gpt-5-nano',                // 400K, $0.40 out
      'openai/gpt-4.1-nano',              // 1M, $0.40 out
      'google/gemini-2.5-flash-lite',     // 1M, $0.40 out
      'bytedance-seed/seed-2.0-mini',     // 262K, $0.40 out - fev/2026
      'x-ai/grok-4.1-fast',              // 2M, $0.50 out - nov/2025
      'meta-llama/llama-4-maverick',      // 1M, $0.60 out (bonus: barato input)
      'stepfun/step-3.5-flash',           // 256K, $0.30 out - jan/2026
      'xiaomi/mimo-v2-flash',             // 262K, $0.29 out - dez/2025
      'bytedance-seed/seed-1.6-flash',    // 262K, $0.30 out - dez/2025
    ],
  },
  {
    key: 'value',
    label: 'Custo-Beneficio',
    icon: Scale,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    desc: '$0.50 - $1.00/M output - qualidade + preco',
    models: [
      'google/gemini-2.5-flash',          // 1M, $2.50 out MAS thinking incluso
      'google/gemini-3-flash-preview',    // 1M, $3.00 out - mais recente Google
      'inception/mercury-2',              // 128K, $0.75 out - mar/2026
      'qwen/qwen3-coder-next',           // 262K, $0.75 out - fev/2026
      'qwen/qwen-plus',                  // 1M, $0.78 out
      'minimax/minimax-m2.1',            // 197K, $0.95 out - dez/2025
      'minimax/minimax-m2.5',            // 197K, $1.00 out - fev/2026 (borderline)
      'z-ai/glm-4.7-flash',             // 203K, $0.40 out - jan/2026
      'deepseek/deepseek-chat',          // 164K, $0.89 out
    ],
  },
  {
    key: 'premium',
    label: 'Premium Baratos',
    icon: Crown,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    desc: '$1.00 - $2.00/M output - alta qualidade',
    models: [
      'google/gemini-3.1-flash-lite-preview', // 1M, $1.50 out - mar/2026
      'openai/gpt-4.1-mini',                  // 1M, $1.60 out
      'openai/gpt-5-mini',                    // 400K, $2.00 out
      'qwen/qwen3.5-plus-02-15',              // 1M, $1.56 out - fev/2026
      'qwen/qwen3.5-35b-a3b',                 // 262K, $1.30 out - fev/2026
      'qwen/qwen3.5-27b',                     // 262K, $1.56 out - fev/2026
      'minimax/minimax-01',                    // 1M, $1.10 out
      'mistralai/mistral-large-2512',          // 262K, $1.50 out - dez/2025
      'mistralai/mistral-medium-3.1',          // 131K, $2.00 out
      'moonshotai/kimi-k2-0905',               // 131K, $2.00 out
      'bytedance-seed/seed-2.0-lite',          // 262K, $2.00 out - mar/2026
    ],
  },
]

export default function LlmModels() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState('')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedModel, setExpandedModel] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'recommended' | 'all'>('recommended')

  const { data: currentModel } = useQuery({
    queryKey: ['current-model'],
    queryFn: () => api.get('/llm-models/current').then(r => r.data),
  })

  const setDefaultMutation = useMutation({
    mutationFn: (modelId: string) => api.put('/llm-models/current', { model_id: modelId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['current-model'] }),
  })

  const { data: providers } = useQuery<string[]>({
    queryKey: ['llm-providers'],
    queryFn: () => api.get('/llm-models/providers').then(r => r.data),
  })

  const { data, isLoading } = useQuery<PaginatedResponse<LlmModel>>({
    queryKey: ['llm-models', search, provider, favoriteOnly, page],
    queryFn: () => api.get('/llm-models', {
      params: {
        search: search || undefined, provider: provider || undefined,
        favorite_only: favoriteOnly || undefined, page, per_page: 30,
      }
    }).then(r => r.data),
  })

  // Fetch recommended models
  const { data: recModels } = useQuery<LlmModel[]>({
    queryKey: ['recommended-models'],
    queryFn: async () => {
      const allIds = TIERS.flatMap(t => t.models)
      const res = await api.get('/llm-models', { params: { per_page: 200 } })
      return (res.data.data as LlmModel[]).filter(m => allIds.includes(m.model_id))
    },
    enabled: activeTab === 'recommended',
  })

  const syncMutation = useMutation({
    mutationFn: () => api.post('/llm-models/sync'),
    onSuccess: () => setTimeout(() => queryClient.invalidateQueries({ queryKey: ['llm-models'] }), 5000),
  })

  const favMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/llm-models/${id}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['llm-models'] }),
  })

  const fmtPrice = (p: number | null) => {
    if (p === null || p === undefined) return '-'
    if (p === 0) return 'Free'
    return `$${p.toFixed(2)}/M`
  }
  const fmtCtx = (c: number | null) => {
    if (!c) return '-'
    return c >= 1000000 ? `${(c / 1000000).toFixed(1)}M` : `${(c / 1000).toFixed(0)}K`
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
        <h2 className="text-lg font-semibold">Modelos LLM</h2>
        <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
          <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
          Sincronizar
        </button>
      </div>

      {/* Current default */}
      {currentModel?.model && (
        <div className="mb-3 p-3 bg-surface border border-primary/30 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ProviderLogo provider={currentModel.model.provider} size={28} />
            <div className="min-w-0">
              <p className="text-[11px] text-text-secondary">Modelo padrao</p>
              <p className="text-sm font-medium truncate">{currentModel.model.model_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span>In: {fmtPrice(currentModel.model.pricing_prompt)}</span>
            <span>Out: {fmtPrice(currentModel.model.pricing_completion)}</span>
            <span>Ctx: {fmtCtx(currentModel.model.context_length)}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-3">
        <button onClick={() => setActiveTab('recommended')}
          className={`px-3 py-2 text-sm font-medium border-b-2 ${activeTab === 'recommended' ? 'border-primary text-primary' : 'border-transparent text-text-secondary'}`}>
          Recomendados
        </button>
        <button onClick={() => setActiveTab('all')}
          className={`px-3 py-2 text-sm font-medium border-b-2 ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-text-secondary'}`}>
          Todos ({data?.total || 0})
        </button>
      </div>

      {activeTab === 'recommended' ? (
        /* Recommended tiers */
        <div className="space-y-4">
          {TIERS.map(tier => {
            const Icon = tier.icon
            const tierModels = (recModels || []).filter(m => tier.models.includes(m.model_id))
              .sort((a, b) => (a.pricing_completion || 0) - (b.pricing_completion || 0))
            return (
              <div key={tier.key}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={tier.color} />
                  <h3 className={`text-sm font-semibold ${tier.color}`}>{tier.label}</h3>
                  <span className="text-[11px] text-text-secondary">{tier.desc}</span>
                </div>
                <div className="space-y-1.5">
                  {tierModels.map(m => {
                    const isCurrent = currentModel?.model_id === m.model_id
                    return (
                      <div key={m.id} className={`rounded-lg border p-2.5 sm:p-3 ${isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}>
                        <div className="flex items-center gap-2">
                          <ProviderLogo provider={m.provider} size={24} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{m.model_name}</p>
                              {isCurrent && <Badge variant="primary">padrao</Badge>}
                            </div>
                            <p className="text-[11px] text-text-secondary truncate">{m.model_id}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className="text-[11px] font-mono">In: {fmtPrice(m.pricing_prompt)}</p>
                              <p className="text-[11px] font-mono">Out: {fmtPrice(m.pricing_completion)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-mono">{fmtCtx(m.context_length)}</p>
                              {m.model_created_at && <p className="text-[10px] text-text-secondary">{new Date(m.model_created_at).toLocaleDateString('pt-BR')}</p>}
                            </div>
                            {!isCurrent && (
                              <button
                                onClick={() => setDefaultMutation.mutate(m.model_id)}
                                className="px-2 py-1 text-[11px] bg-primary/10 text-primary rounded hover:bg-primary/20 whitespace-nowrap"
                              >
                                Usar
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Mobile prices */}
                        <div className="flex gap-3 mt-1.5 sm:hidden text-[11px] text-text-secondary">
                          <span>In: <span className="font-mono">{fmtPrice(m.pricing_prompt)}</span></span>
                          <span>Out: <span className="font-mono">{fmtPrice(m.pricing_completion)}</span></span>
                        </div>
                      </div>
                    )
                  })}
                  {tierModels.length === 0 && <p className="text-xs text-text-secondary">Sincronize os modelos primeiro</p>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* All models tab */
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input type="text" placeholder="Buscar modelos..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2">
              <select value={provider} onChange={e => { setProvider(e.target.value); setPage(1) }}
                className="flex-1 sm:flex-none px-3 py-2 text-sm border border-border rounded-lg bg-surface">
                <option value="">Todos providers</option>
                {providers?.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={() => { setFavoriteOnly(!favoriteOnly); setPage(1) }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg shrink-0 ${
                  favoriteOnly ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-border bg-surface text-text-secondary'}`}>
                <Star size={14} fill={favoriteOnly ? 'currentColor' : 'none'} />
                <span className="hidden sm:inline">Favoritos</span>
              </button>
            </div>
          </div>

          {isLoading ? <Spinner /> : (
            <>
              <div className="space-y-1.5">
                {data?.data.map(m => {
                  const isCurrent = currentModel?.model_id === m.model_id
                  return (
                    <div key={m.id}>
                      <div onClick={() => setExpandedModel(expandedModel === m.id ? null : m.id)}
                        className={`rounded-lg border p-2.5 cursor-pointer transition-colors ${isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/30'}`}>
                        <div className="flex items-center gap-2">
                          <button onClick={e => { e.stopPropagation(); favMutation.mutate(m.id) }}
                            className="text-yellow-400 hover:text-yellow-500 shrink-0">
                            <Star size={14} fill={m.is_favorite ? 'currentColor' : 'none'} />
                          </button>
                          <ProviderLogo provider={m.provider} size={22} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{m.model_name}</p>
                              {isCurrent && <Badge variant="primary">padrao</Badge>}
                            </div>
                            <p className="text-[11px] text-text-secondary truncate">{m.model_id}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-mono">{fmtCtx(m.context_length)}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px]">
                          <span className="text-text-secondary">In: <span className="font-mono text-text-primary">{fmtPrice(m.pricing_prompt)}</span></span>
                          <span className="text-text-secondary">Out: <span className="font-mono text-text-primary">{fmtPrice(m.pricing_completion)}</span></span>
                          {m.modality && <span className="text-text-secondary">{m.modality}</span>}
                          {m.model_created_at && <span className="text-text-secondary">{new Date(m.model_created_at).toLocaleDateString('pt-BR')}</span>}
                        </div>
                      </div>
                      {expandedModel === m.id && (
                        <div className="mx-2 p-3 bg-gray-50 border border-t-0 border-border rounded-b-lg space-y-2">
                          {m.description && <p className="text-xs text-text-secondary leading-relaxed">{m.description}</p>}
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {m.max_completion_tokens && <span className="text-text-secondary">Max output: <strong>{m.max_completion_tokens.toLocaleString()}</strong></span>}
                            {m.tokenizer && <span className="text-text-secondary">Tokenizer: <strong>{m.tokenizer}</strong></span>}
                          </div>
                          {(m.supported_parameters || []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {m.supported_parameters.map(p => (
                                <span key={p} className="text-[10px] bg-gray-100 text-text-secondary px-1.5 py-0.5 rounded">{p}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            {!isCurrent && (
                              <button onClick={() => setDefaultMutation.mutate(m.model_id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark">
                                <Check size={12} /> Usar como padrao
                              </button>
                            )}
                            <button onClick={() => favMutation.mutate(m.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-gray-100">
                              <Star size={12} fill={m.is_favorite ? '#eab308' : 'none'} className="text-yellow-400" />
                              {m.is_favorite ? 'Remover favorito' : 'Favoritar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {data && data.pages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-text-secondary">{data.total} modelos | Pag. {data.page}/{data.pages}</span>
                  <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                      className="px-2.5 py-1.5 text-xs border border-border rounded bg-surface disabled:opacity-50">Anterior</button>
                    <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
                      className="px-2.5 py-1.5 text-xs border border-border rounded bg-surface disabled:opacity-50">Proximo</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
