export interface LivroRow {
  id: string
  natureza: string
  numero_ordem: number
  periodo_inicio: string | null
  periodo_fim: string | null
  formato: 'digital' | 'fisico'
  data_autenticacao: string | null
  orgao_autenticador: string | null
  operacao_id: string | null
  created_at: string
  orgao: { id: string; nome: string } | null
}

export interface OrgaoSimples {
  id: string
  nome: string
}

// ─── Natureza config ──────────────────────────────────────────────────────────

export interface NaturezaConfig {
  value: string
  label: string
  shortLabel: string
  /** Slug used in /print/[orgSlug]/livro/[printPath] — null = no print route yet */
  printPath: string | null
  badgeClass: string
}

export const NATUREZAS: NaturezaConfig[] = [
  {
    value: 'Registro de Ações Nominativas',
    label: 'Registro de Ações Nominativas',
    shortLabel: 'Reg. Ações',
    printPath: 'registro',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  {
    value: 'Transferência de Ações',
    label: 'Transferência de Ações',
    shortLabel: 'Transferências',
    printPath: 'transferencias',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'Livro de Atas de AGO',
    label: 'Livro de Atas de AGO',
    shortLabel: 'Atas AGO',
    printPath: null,
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  },
  {
    value: 'Livro de Atas de AGE',
    label: 'Livro de Atas de AGE',
    shortLabel: 'Atas AGE',
    printPath: null,
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300',
  },
  {
    value: 'Livro de Atas de RCA',
    label: 'Livro de Atas de RCA',
    shortLabel: 'Atas RCA',
    printPath: null,
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  },
  {
    value: 'Livro de Atas de RD',
    label: 'Livro de Atas de RD',
    shortLabel: 'Atas RD',
    printPath: null,
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
  },
  {
    value: 'Livro de Presença',
    label: 'Livro de Presença',
    shortLabel: 'Presença',
    printPath: null,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
  },
  {
    value: 'Livro de Debêntures',
    label: 'Livro de Debêntures',
    shortLabel: 'Debêntures',
    printPath: null,
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  // Legacy values from old natureza list
  {
    value: 'Presença',
    label: 'Presença',
    shortLabel: 'Presença',
    printPath: null,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  {
    value: 'Atas e Deliberações',
    label: 'Atas e Deliberações',
    shortLabel: 'Atas',
    printPath: null,
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    value: 'Atas das Assembleias',
    label: 'Atas das Assembleias',
    shortLabel: 'Assembleias',
    printPath: null,
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
]

/** Returns the NaturezaConfig for a given natureza string (falls back to a default) */
export function getNaturezaConfig(natureza: string): NaturezaConfig {
  return (
    NATUREZAS.find((n) => n.value === natureza) ?? {
      value: natureza,
      label: natureza,
      shortLabel: natureza,
      printPath: null,
      badgeClass: 'bg-muted text-muted-foreground border-border',
    }
  )
}

export const NATUREZA_VALUES = NATUREZAS.map((n) => n.value)
