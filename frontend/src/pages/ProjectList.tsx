import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import api from '../api/client'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import type { Project, PaginatedResponse } from '../types'
import { Search, ChevronUp, ChevronDown, GitBranch, Container, EyeOff, Eye } from 'lucide-react'

export default function ProjectList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showIgnored, setShowIgnored] = useState(false)
  const [sortBy, setSortBy] = useState('folder_name')
  const [order, setOrder] = useState('asc')
  const [page, setPage] = useState(1)

  const { data: categories } = useQuery<string[]>({
    queryKey: ['project-categories'],
    queryFn: () => api.get('/projects/categories').then(r => r.data),
  })

  const { data, isLoading } = useQuery<PaginatedResponse<Project>>({
    queryKey: ['projects', search, category, showIgnored, sortBy, order, page],
    queryFn: () => api.get('/projects', {
      params: { search, category: category || undefined, show_ignored: showIgnored || undefined, sort_by: sortBy, order, page, per_page: 50 }
    }).then(r => r.data),
  })

  const ignoreMutation = useMutation({
    mutationFn: (projectId: number) => api.patch(`/projects/${projectId}/ignore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setOrder('asc')
    }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null
    return order === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  const scoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400'
    if (score >= 7) return 'text-green-600 font-semibold'
    if (score >= 4) return 'text-orange-500 font-medium'
    return 'text-gray-500'
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 sm:mb-4">Projetos</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Buscar projetos..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:border-primary"
        >
          <option value="">Todas categorias</option>
          {categories?.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={() => { setShowIgnored(!showIgnored); setPage(1) }}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg shrink-0 transition-colors ${
            showIgnored ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-border bg-surface text-text-secondary hover:bg-gray-50'
          }`}
        >
          {showIgnored ? <Eye size={14} /> : <EyeOff size={14} />}
          <span className="hidden sm:inline">{showIgnored ? 'Mostrando todos' : 'Mostrar ignorados'}</span>
        </button>
      </div>

      {isLoading ? <Spinner /> : (
        <>
          {/* Mobile: Card view */}
          <div className="lg:hidden space-y-2">
            {data?.data.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/projetos/${p.id}`)}
                className={`bg-surface border border-border rounded-lg p-3 active:bg-primary/5 cursor-pointer ${(p as any).is_ignored ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm text-text-primary truncate">
                        {p.project_name || p.folder_name}
                      </p>
                      {(p as any).is_ignored && <Badge variant="default">ignorado</Badge>}
                    </div>
                    {p.project_name && (
                      <p className="text-[11px] text-text-secondary truncate">{p.folder_name}</p>
                    )}
                  </div>
                  <div className={`text-lg font-bold ml-3 ${scoreColor(p.saas_readiness_score)}`}>
                    {p.saas_readiness_score ?? '-'}
                  </div>
                </div>
                {p.description_short && (
                  <p className="text-xs text-text-secondary line-clamp-2 mb-2">{p.description_short}</p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  {p.category && <Badge variant="primary">{p.category}</Badge>}
                  {p.monetization_potential && (
                    <Badge variant={p.monetization_potential}>{p.monetization_potential}</Badge>
                  )}
                  {p.deployment_status && (
                    <Badge variant={p.deployment_status === 'deployed' ? 'success' : 'default'}>
                      {p.deployment_status}
                    </Badge>
                  )}
                  {p.has_git && <GitBranch size={12} className="text-orange-500" />}
                  {p.has_dockerfile && <Container size={12} className="text-blue-500" />}
                  <span className="text-[11px] text-text-secondary ml-auto">{p.file_count} arq.</span>
                  <button
                    onClick={e => { e.stopPropagation(); ignoreMutation.mutate(p.id) }}
                    className="ml-1 p-1 text-text-secondary hover:text-orange-500"
                    title={(p as any).is_ignored ? 'Restaurar' : 'Ignorar'}
                  >
                    <EyeOff size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden lg:block bg-surface rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('folder_name')}>
                      <span className="flex items-center gap-1">Projeto <SortIcon col="folder_name" /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Categoria</th>
                    <th className="text-center px-4 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('saas_score')}>
                      <span className="flex items-center justify-center gap-1">SaaS <SortIcon col="saas_score" /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Monetizacao</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Tech Stack</th>
                    <th className="text-center px-4 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('file_count')}>
                      <span className="flex items-center justify-center gap-1">Arq. <SortIcon col="file_count" /></span>
                    </th>
                    <th className="text-center px-4 py-3 font-medium">Info</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((p, i) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/projetos/${p.id}`)}
                      className={`cursor-pointer border-b border-border/50 hover:bg-primary/5 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-text-primary">{p.project_name || p.folder_name}</p>
                          {p.project_name && (
                            <p className="text-xs text-text-secondary mt-0.5">{p.folder_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.category ? <Badge variant="primary">{p.category}</Badge> : '-'}
                      </td>
                      <td className={`px-4 py-3 text-center ${scoreColor(p.saas_readiness_score)}`}>
                        {p.saas_readiness_score ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        {p.monetization_potential ? (
                          <Badge variant={p.monetization_potential}>{p.monetization_potential}</Badge>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {p.deployment_status ? (
                          <Badge variant={p.deployment_status === 'deployed' ? 'success' : 'default'}>
                            {p.deployment_status}
                          </Badge>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.tech_stack || []).slice(0, 3).map(t => (
                            <span key={t} className="text-xs bg-gray-100 text-text-secondary px-1.5 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                          {(p.tech_stack || []).length > 3 && (
                            <span className="text-xs text-text-secondary">+{(p.tech_stack || []).length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-text-secondary">{p.file_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {p.has_git && <GitBranch size={14} className="text-orange-500" />}
                          {p.has_dockerfile && <Container size={14} className="text-blue-500" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-3 sm:mt-4">
              <p className="text-xs sm:text-sm text-text-secondary">
                {data.total} projetos | Pag. {data.page}/{data.pages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm border border-border rounded bg-surface disabled:opacity-50 hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  disabled={page >= data.pages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm border border-border rounded bg-surface disabled:opacity-50 hover:bg-gray-50"
                >
                  Proximo
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
