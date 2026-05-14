'use client'

import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ChevronRightIcon, SunIcon, MoonIcon } from 'lucide-react'

// ─── Breadcrumb map ───────────────────────────────────────────────────────────

const SECTIONS: Record<string, string> = {
  dashboard:        'Dashboard',
  'cap-table':      'Cap Table',
  ativos:           'Ativos',
  governanca:       'Governança',
  equity:           'Equity Plans',
  stakeholders:     'Stakeholders',
  relatorios:       'Relatórios',
  configuracoes:    'Configurações',
}

const SUBSECTIONS: Record<string, Record<string, string>> = {
  ativos: {
    '':                'Visão geral',
    operacoes:         'Operações',
    'historico-preco': 'Histórico de preço',
    rodadas:           'Rodadas',
  },
  governanca: {
    orgaos:      'Órgãos sociais',
    eventos:     'Eventos',
    livros:      'Livros societários',
    organograma: 'Organograma',
  },
  equity: {
    planos:      'Planos',
    calendarios: 'Calendários de vesting',
    contratos:   'Contratos',
  },
  configuracoes: {
    membros: 'Membros',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopBar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const parts = pathname.split('/').filter(Boolean)
  const section    = parts[1] ?? ''
  const subsection = parts[2] ?? ''

  const sectionLabel    = SECTIONS[section] ?? ''
  const subsectionLabel = SUBSECTIONS[section]?.[subsection] ?? ''

  const initial = userEmail ? userEmail[0].toUpperCase() : '?'

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/90 backdrop-blur-md px-4">

      {/* Esquerda: trigger + breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <SidebarTrigger className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" />
        <div className="h-4 w-px bg-border/70 shrink-0" />

        {sectionLabel && (
          <nav className="flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
            {subsectionLabel ? (
              <>
                <span className="text-[13px] text-muted-foreground truncate hidden sm:block">{sectionLabel}</span>
                <ChevronRightIcon className="size-3.5 text-muted-foreground/40 shrink-0 hidden sm:block" />
                <span className="text-[13px] font-semibold text-foreground truncate">{subsectionLabel}</span>
              </>
            ) : (
              <span className="text-[13px] font-semibold text-foreground">{sectionLabel}</span>
            )}
          </nav>
        )}
      </div>

      {/* Direita: toggle de tema + avatar */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark'
            ? <SunIcon className="size-3.5" />
            : <MoonIcon className="size-3.5" />
          }
        </button>

        <div
          className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold select-none"
          title={userEmail}
        >
          {initial}
        </div>
      </div>
    </header>
  )
}
