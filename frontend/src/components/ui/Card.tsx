import type { ReactNode } from 'react'

export default function Card({
  children,
  className = '',
  title,
  glass = false,
}: {
  children: ReactNode
  className?: string
  title?: string
  glass?: boolean
}) {
  return (
    <div className={`rounded-2xl transition-all duration-200 ${
      glass
        ? 'glass'
        : 'bg-surface border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
    } ${className}`}>
      {title && (
        <div className="px-5 py-3.5 border-b border-border/40">
          <h3 className="text-[13px] font-semibold text-text-primary tracking-tight">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
