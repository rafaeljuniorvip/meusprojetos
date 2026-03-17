const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#d4a574',
  openai: '#10a37f',
  google: '#4285f4',
  meta: '#0668e1',
  'meta-llama': '#0668e1',
  mistralai: '#f54e42',
  cohere: '#39594d',
  deepseek: '#4d6bfe',
  perplexity: '#20808d',
  nvidia: '#76b900',
  microsoft: '#00a4ef',
  amazon: '#ff9900',
  alibaba: '#ff6a00',
  qwen: '#615ae6',
  ai21: '#5046e5',
  xai: '#1d1d1f',
  inflection: '#7c3aed',
  databricks: '#ff3621',
  together: '#0ea5e9',
  groq: '#f55036',
  fireworks: '#f97316',
  cloudflare: '#f48120',
  huggingface: '#ffd21e',
}

function getColor(provider: string): string {
  const key = provider.toLowerCase()
  return PROVIDER_COLORS[key] || stringToColor(provider)
}

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = hash % 360
  return `hsl(${h}, 55%, 45%)`
}

function getInitials(provider: string): string {
  return provider.split(/[-_/]/).map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2)
}

export default function ProviderLogo({
  provider,
  size = 28,
}: {
  provider: string
  size?: number
}) {
  const color = getColor(provider)
  const initials = getInitials(provider)
  const fontSize = size * 0.4

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize,
        fontWeight: 700,
        letterSpacing: -0.5,
        flexShrink: 0,
        boxShadow: `0 2px 6px ${color}33`,
      }}
    >
      {initials}
    </div>
  )
}
