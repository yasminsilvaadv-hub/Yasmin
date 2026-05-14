import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  /** Slot for action buttons on the right */
  actions?: React.ReactNode
  /** Optional icon rendered in a colored bubble */
  icon?: React.ComponentType<{ className?: string }>
  /** Tailwind gradient or solid background for the icon bubble, e.g. "from-blue-400 to-blue-600" */
  iconGradient?: string
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  iconGradient = 'from-emerald-400 to-emerald-600',
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'border-b border-border/50 bg-background px-6 py-5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {Icon && (
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm',
                iconGradient
              )}
            >
              <Icon className="size-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight truncate">
              {title}
            </h1>
            {description && (
              <p className="text-[12.5px] text-muted-foreground mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Lighter variant — used inside content area (below the top border) instead of
 * the card-header style above. Keeps the same props.
 */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: Omit<PageHeaderProps, 'icon' | 'iconGradient'>) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}
