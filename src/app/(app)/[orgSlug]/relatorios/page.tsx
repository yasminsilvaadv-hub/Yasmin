'use client'

import * as React from 'react'
import {
  BarChart3Icon,
  FileSpreadsheetIcon,
  FilePieChartIcon,
  FileBarChart2Icon,
  ClockIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'

// ─── Relatório card ───────────────────────────────────────────────────────────

interface RelatorioCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  color: string
  soon?: boolean
}

function RelatorioCard({ icon: Icon, title, description, color, soon = true }: RelatorioCardProps) {
  return (
    <div
      className="relative flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-5
                 shadow-[0_0_0_1px_hsl(var(--border)/0.5),0_1px_4px_hsl(220_30%_11%/0.04)]
                 opacity-60 cursor-not-allowed select-none"
    >
      {/* Soon badge */}
      {soon && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <ClockIcon className="size-2.5" />
          Em breve
        </span>
      )}

      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm ${color}`}
      >
        <Icon className="size-5 text-white" />
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Relatórios"
        description="Exportações e relatórios societários"
        icon={BarChart3Icon}
        iconGradient="from-violet-400 to-violet-600"
      />

      <div className="p-6 flex flex-col gap-8">

        {/* Banner principal */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-6 py-5 dark:border-violet-900/40 dark:bg-violet-950/20">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 shadow-sm">
              <BarChart3Icon className="size-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                Módulo de Relatórios em desenvolvimento
              </p>
              <p className="mt-1 text-xs text-violet-700/80 dark:text-violet-300/70 leading-relaxed max-w-lg">
                Os relatórios societários, exportações de Cap Table e documentos regulatórios estarão disponíveis em breve.
                Enquanto isso, use o botão de exportação CSV disponível na tela de Cap Table.
              </p>
            </div>
          </div>
        </div>

        {/* Cards de relatórios planejados */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Relatórios planejados
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RelatorioCard
              icon={FilePieChartIcon}
              title="Cap Table — PDF"
              description="Relatório completo de composição acionária com gráfico de participação por titular e classe."
              color="from-blue-400 to-blue-600"
            />
            <RelatorioCard
              icon={FileSpreadsheetIcon}
              title="Livro de Registro de Ações"
              description="Exportação em PDF ou Excel do Livro de Registro de Ações Nominativas conforme CVM."
              color="from-emerald-400 to-emerald-600"
            />
            <RelatorioCard
              icon={FileBarChart2Icon}
              title="Histórico de Operações"
              description="Log detalhado de todas as operações societárias com filtro por período e tipo."
              color="from-amber-400 to-amber-600"
            />
            <RelatorioCard
              icon={FilePieChartIcon}
              title="Relatório de Equity Plans"
              description="Consolidado de opções outorgadas, vestidas e exercidas por beneficiário e programa."
              color="from-pink-400 to-rose-600"
            />
            <RelatorioCard
              icon={FileSpreadsheetIcon}
              title="Relatório de Rodadas"
              description="Histórico de rodadas de investimento com valuation, diluição e novos acionistas."
              color="from-cyan-400 to-cyan-600"
            />
            <RelatorioCard
              icon={FileBarChart2Icon}
              title="Relatório de Governança"
              description="Atas, deliberações e requisitos pendentes por órgão social e período."
              color="from-orange-400 to-orange-600"
            />
          </div>
        </div>

      </div>
    </div>
  )
}
