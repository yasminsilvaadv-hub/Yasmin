import { DollarSign, BarChart2, TrendingUp } from 'lucide-react'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

function formatNum(value: number) {
  return value.toLocaleString('pt-BR')
}

interface Props {
  capitalSocial: number
  totalAcoes: number
  beneficiariosEquity: number
}

interface KPICardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  topBar: string
}

function KPICard({ title, value, subtitle, icon: Icon, iconBg, iconColor, topBar }: KPICardProps) {
  return (
    <div className="relative bg-card rounded-xl overflow-hidden card">
      {/* Colored top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${topBar}`} />

      <div className="px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground leading-none">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
            )}
          </div>

          {/* Icon chip */}
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`size-5 ${iconColor}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardCards({ capitalSocial, totalAcoes, beneficiariosEquity }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KPICard
        title="Capital Social"
        value={formatBRL(capitalSocial)}
        subtitle="Posição atual"
        icon={DollarSign}
        iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        iconColor="text-emerald-600 dark:text-emerald-400"
        topBar="bg-gradient-to-r from-emerald-400 to-emerald-500"
      />
      <KPICard
        title="Total de Ações"
        value={formatNum(totalAcoes)}
        subtitle="Todas as classes"
        icon={BarChart2}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        iconColor="text-blue-600 dark:text-blue-400"
        topBar="bg-gradient-to-r from-blue-400 to-blue-500"
      />
      <KPICard
        title="Equity Plans"
        value={formatNum(beneficiariosEquity)}
        subtitle={beneficiariosEquity === 1 ? 'pessoa com contrato ativo' : 'pessoas com contrato ativo'}
        icon={TrendingUp}
        iconBg="bg-violet-100 dark:bg-violet-900/30"
        iconColor="text-violet-600 dark:text-violet-400"
        topBar="bg-gradient-to-r from-violet-400 to-violet-500"
      />
    </div>
  )
}
