export interface LivroRow {
  id: string
  natureza: string
  numero_ordem: number
  periodo_inicio: string | null
  periodo_fim: string | null
  formato: 'digital' | 'fisico'
  forma_autenticacao: string | null
  local_autenticacao: string | null
  data_autenticacao: string | null
  orgao_autenticador: string | null
  anotacoes: string | null
  deliberacao: string | null
  evento_id: string | null
  operacao_id: string | null
  created_at: string
  orgao: { id: string; nome: string } | null
}

export interface OrgaoSimples {
  id: string
  nome: string
}

export interface NaturezaConfig {
  value: string
  label: string
  shortLabel: string
  categoria: 'orgaos' | 'acionistas' | 'debenturistas'
  categoriaLabel: string
  printPath: string | null
  badgeClass: string
  exigeOrgao: boolean
}

export const CATEGORIAS = [
  { key: 'orgaos', label: 'Órgãos sociais' },
  { key: 'acionistas', label: 'Acionistas' },
  { key: 'debenturistas', label: 'Debenturistas' },
] as const

export const NATUREZAS: NaturezaConfig[] = [
  {
    value: 'Atas e Mandatos',
    label: 'Atas e Mandatos',
    shortLabel: 'Atas e Mandatos',
    categoria: 'orgaos',
    categoriaLabel: 'Órgãos sociais',
    printPath: null,
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
    exigeOrgao: true,
  },
  {
    value: 'Registro de Ações Nominativas',
    label: 'Registro de Ações Nominativas',
    shortLabel: 'Reg. Ações',
    categoria: 'acionistas',
    categoriaLabel: 'Acionistas',
    printPath: 'registro',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
    exigeOrgao: false,
  },
  {
    value: 'Transferência de Ações Nominativas',
    label: 'Transferência de Ações Nominativas',
    shortLabel: 'Transf. Ações',
    categoria: 'acionistas',
    categoriaLabel: 'Acionistas',
    printPath: 'transferencias',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
    exigeOrgao: false,
  },
  {
    value: 'Atas das Assembleias Gerais de Acionistas',
    label: 'Atas das Assembleias Gerais de Acionistas',
    shortLabel: 'Atas Assembleias',
    categoria: 'acionistas',
    categoriaLabel: 'Acionistas',
    printPath: null,
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
    exigeOrgao: false,
  },
  {
    value: 'Presença dos Acionistas',
    label: 'Presença dos Acionistas',
    shortLabel: 'Presença',
    categoria: 'acionistas',
    categoriaLabel: 'Acionistas',
    printPath: null,
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300',
    exigeOrgao: false,
  },
  {
    value: 'Registro de Debêntures Nominativas',
    label: 'Registro de Debêntures Nominativas',
    shortLabel: 'Reg. Debêntures',
    categoria: 'debenturistas',
    categoriaLabel: 'Debenturistas',
    printPath: null,
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
    exigeOrgao: false,
  },
  {
    value: 'Transferência de Debêntures Nominativas',
    label: 'Transferência de Debêntures Nominativas',
    shortLabel: 'Transf. Debêntures',
    categoria: 'debenturistas',
    categoriaLabel: 'Debenturistas',
    printPath: null,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
    exigeOrgao: false,
  },
  {
    value: 'Atas das Assembleias Gerais de Debenturistas',
    label: 'Atas das Assembleias Gerais de Debenturistas',
    shortLabel: 'Atas Debenturistas',
    categoria: 'debenturistas',
    categoriaLabel: 'Debenturistas',
    printPath: null,
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
    exigeOrgao: false,
  },
  {
    value: 'Presença dos Debenturistas',
    label: 'Presença dos Debenturistas',
    shortLabel: 'Presença Deb.',
    categoria: 'debenturistas',
    categoriaLabel: 'Debenturistas',
    printPath: null,
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
    exigeOrgao: false,
  },
  // Legacy — mantém para não quebrar registros existentes
  { value: 'Transferência de Ações', label: 'Transferência de Ações', shortLabel: 'Transf. Ações', categoria: 'acionistas' as const, categoriaLabel: 'Acionistas', printPath: 'transferencias', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200', exigeOrgao: false },
  { value: 'Livro de Atas de AGO', label: 'Livro de Atas de AGO', shortLabel: 'Atas AGO', categoria: 'acionistas' as const, categoriaLabel: 'Acionistas', printPath: null, badgeClass: 'bg-purple-100 text-purple-800 border-purple-200', exigeOrgao: false },
  { value: 'Livro de Atas de AGE', label: 'Livro de Atas de AGE', shortLabel: 'Atas AGE', categoria: 'acionistas' as const, categoriaLabel: 'Acionistas', printPath: null, badgeClass: 'bg-violet-100 text-violet-800 border-violet-200', exigeOrgao: false },
  { value: 'Livro de Atas de RCA', label: 'Livro de Atas de RCA', shortLabel: 'Atas RCA', categoria: 'orgaos' as const, categoriaLabel: 'Órgãos sociais', printPath: null, badgeClass: 'bg-orange-100 text-orange-800 border-orange-200', exigeOrgao: false },
  { value: 'Livro de Atas de RD', label: 'Livro de Atas de RD', shortLabel: 'Atas RD', categoria: 'orgaos' as const, categoriaLabel: 'Órgãos sociais', printPath: null, badgeClass: 'bg-pink-100 text-pink-800 border-pink-200', exigeOrgao: false },
  { value: 'Livro de Presença', label: 'Livro de Presença', shortLabel: 'Presença', categoria: 'acionistas' as const, categoriaLabel: 'Acionistas', printPath: null, badgeClass: 'bg-gray-100 text-gray-700 border-gray-200', exigeOrgao: false },
  { value: 'Presença', label: 'Presença', shortLabel: 'Presença', categoria: 'acionistas' as const, categoriaLabel: 'Acionistas', printPath: null, badgeClass: 'bg-gray-100 text-gray-700 border-gray-200', exigeOrgao: false },
  { value: 'Atas e Deliberações', label: 'Atas e Deliberações', shortLabel: 'Atas', categoria: 'orgaos' as const, categoriaLabel: 'Órgãos sociais', printPath: null, badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', exigeOrgao: false },
  { value: 'Atas das Assembleias', label: 'Atas das Assembleias', shortLabel: 'Assembleias', categoria: 'acionistas' as const, categoriaLabel: 'Acionistas', printPath: null, badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', exigeOrgao: false },
  { value: 'Livro de Debêntures', label: 'Livro de Debêntures', shortLabel: 'Debêntures', categoria: 'debenturistas' as const, categoriaLabel: 'Debenturistas', printPath: null, badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200', exigeOrgao: false },
]

export const FORMAS_AUTENTICACAO = [
  'Em branco',
  'Escriturado',
  'Autenticado pela Junta Comercial',
  'Autenticado por Notário',
  'Outro',
]

// The 9 canonical types shown in "Novo livro" form
export const NATUREZAS_PRIMARIAS = NATUREZAS.slice(0, 9)

export function getNaturezaConfig(natureza: string): NaturezaConfig {
  return (
    NATUREZAS.find((n) => n.value === natureza) ?? {
      value: natureza,
      label: natureza,
      shortLabel: natureza,
      categoria: 'acionistas' as const,
      categoriaLabel: 'Acionistas',
      printPath: null,
      badgeClass: 'bg-muted text-muted-foreground border-border',
      exigeOrgao: false,
    }
  )
}

export const NATUREZA_VALUES = NATUREZAS.map((n) => n.value)
