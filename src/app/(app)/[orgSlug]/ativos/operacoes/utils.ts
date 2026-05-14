import type { TipoOperacao } from './types'

export const TIPOS_OPERACAO: { value: TipoOperacao; label: string }[] = [
  { value: 'emissao', label: 'Emissão' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cancelamento', label: 'Cancelamento' },
  { value: 'onus_constituicao', label: 'Ônus — Constituição' },
  { value: 'onus_extincao', label: 'Ônus — Extinção' },
  { value: 'bonificacao', label: 'Bonificação' },
  { value: 'desdobramento', label: 'Desdobramento' },
  { value: 'grupamento', label: 'Grupamento' },
]

// Labels para tipo_original armazenado em metadata (dados históricos importados)
const TIPO_ORIGINAL_LABELS: Record<string, string> = {
  subscricao:       'Subscrição',
  conversao:        'Conversão',
  transferencia:    'Transferência',
  onus_constituicao:'Ônus — Constituição',
  onus_extincao:    'Ônus — Extinção',
  bonificacao:      'Bonificação',
  desdobramento:    'Desdobramento',
  grupamento:       'Grupamento',
}

export function tipoLabel(tipo: TipoOperacao, metadata?: Record<string, unknown> | null): string {
  const original = metadata?.tipo_original as string | undefined
  if (original && TIPO_ORIGINAL_LABELS[original]) return TIPO_ORIGINAL_LABELS[original]
  return TIPOS_OPERACAO.find((t) => t.value === tipo)?.label ?? tipo
}

// Cor do badge: usa tipo_original para conversão/subscrição
export function tipoBadgeClass(tipo: TipoOperacao, metadata?: Record<string, unknown> | null): string {
  const original = (metadata?.tipo_original as string | undefined) ?? tipo
  const map: Record<string, string> = {
    emissao:          'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    subscricao:       'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    transferencia:    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    cancelamento:     'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    conversao:        'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    onus_constituicao:'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    onus_extincao:    'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200',
    bonificacao:      'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    desdobramento:    'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    grupamento:       'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  }
  return map[original] ?? map[tipo] ?? 'bg-muted text-muted-foreground'
}
