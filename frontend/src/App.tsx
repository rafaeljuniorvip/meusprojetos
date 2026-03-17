import { Routes, Route } from 'react-router'
import { Component, type ReactNode, type ErrorInfo } from 'react'
import Sidebar from './components/layout/Sidebar'
import { lazy, Suspense } from 'react'
import Spinner from './components/ui/Spinner'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'

class ErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('CRASH:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 48, maxWidth: 600 }}>
          <div style={{ padding: '20px 24px', background: '#fef2f2', borderRadius: 16, border: '1px solid #fecaca' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Erro na aplicacao</p>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#991b1b', lineHeight: 1.6 }}>{this.state.error.message}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ContentCreator = lazy(() => import('./pages/ContentCreator'))
const ContentCalendar = lazy(() => import('./pages/ContentCalendar'))
const ProjectList = lazy(() => import('./pages/ProjectList'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const TopProjects = lazy(() => import('./pages/TopProjects'))
const LlmModels = lazy(() => import('./pages/LlmModels'))
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'))

function AuthenticatedApp() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 pb-8 lg:pt-0 gradient-mesh" style={{ background: '#f8f9fc' }}>
        <div className="p-4 sm:p-5 lg:p-8 w-full">
          <ErrorBoundary>
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/conteudo" element={<ContentCreator />} />
                <Route path="/calendario" element={<ContentCalendar />} />
                <Route path="/projetos" element={<ProjectList />} />
                <Route path="/projetos/:id" element={<ProjectDetail />} />
                <Route path="/potencial" element={<TopProjects />} />
                <Route path="/modelos" element={<LlmModels />} />
                <Route path="/logs" element={<ActivityLogs />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const { data: auth, isLoading } = useAuth()

  if (isLoading) return <Spinner />

  if (auth?.auth_required && !auth?.authenticated) {
    return <Login />
  }

  return (
    <ErrorBoundary>
      <AuthenticatedApp />
    </ErrorBoundary>
  )
}
