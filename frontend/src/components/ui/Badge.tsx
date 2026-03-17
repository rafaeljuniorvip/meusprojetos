import type { ReactNode } from 'react'

const variants: Record<string, string> = {
  default: 'bg-gray-100 text-gray-600 ring-gray-200/60',
  primary: 'bg-primary/8 text-primary ring-primary/15',
  success: 'bg-emerald-50 text-emerald-600 ring-emerald-200/50',
  warning: 'bg-amber-50 text-amber-600 ring-amber-200/50',
  error: 'bg-red-50 text-red-600 ring-red-200/50',
  high: 'bg-emerald-50 text-emerald-600 ring-emerald-200/50',
  medium: 'bg-amber-50 text-amber-600 ring-amber-200/50',
  low: 'bg-gray-50 text-gray-500 ring-gray-200/50',
  none: 'bg-gray-50 text-gray-400 ring-gray-100',
}

export default function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: string
}) {
  const cls = variants[variant] || variants.default
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      {children}
    </span>
  )
}
