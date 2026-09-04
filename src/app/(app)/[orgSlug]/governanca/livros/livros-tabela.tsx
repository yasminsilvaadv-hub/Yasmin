'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PlusIcon,
  PrinterIcon,
  BookOpenIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  InfoIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { criarLivro } from '@/app/actions/governanca'
import { LivroDrawer } from './livro-drawer'
import {
  getNaturezaConfig,
  CATEGORIAS,
  NATUREZAS_PRIMARIAS,
  type LivroRow,
  type OrgaoSimples,
} from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const SEL = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20'

const JUNTAS_COMERCIAIS = [
  'JUCAC – Acre', 'JUCEAL – Alagoas', 'JUCEMAP – Amapá', 'JUCEA – Amazonas',
  'JUCEB – Bahia', 'JUCEC – Ceará', 'JUCDF – Distrito Federal', 'JUCEES – Espírito Santo',
  'JUCEG – Goiás', 'JUCEMA – Maranhão', 'JUCEMAT – Mato Grosso', 'JUCEMS – Mato Grosso do Sul',
  'JUCEMG – Minas Gerais', 'JUCEPA – Pará', 'JUCEP – Paraíba', 'JUCEPAR – Paraná',
  'JUCEPE – Pernambuco', 'JUCEPI – Piauí', 'JUCERJ – Rio de Janeiro',
  'JUCERN – Rio Grande do Norte', 'JUCERGS – Rio Grande do Sul', 'JUCER – Rondônia',
  'JUCERR – Roraima', 'JUCESC – Santa Catarina', 'JUCESP – São Paulo',
  'JUCESE – Sergipe', 'JUCETINS – Tocantins',
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  livros: LivroRow[]
  orgaos: OrgaoSimples[]
  orgSlug: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try { return format(new Date(iso + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return iso }
}

function fmtPeriodo(inicio: string | null, fim: string | null) {
  if (!inicio && !fim) return null
  const s = inicio ? fmtDate(inicio) : '…'
  const e = fim ? fmtDate(fim) : '…'
  if (s === e) return s
  return `${s} – ${e}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormatoBadge({ formato }: { formato: 'digital' | 'fisico' }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs',
        formato === 'digital'
          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300'
          : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
      )}
    >
      {formato === 'digital' ? 'Digital' : 'Físico'}
    </Badge>
  )
}

// ─── Natureza section ─────────────────────────────────────────────────────────

function NaturezaSection({
  natureza,
  livros,
  orgSlug,
  onRowClick,
}: {
  natureza: string
  livros: LivroRow[]
  orgSlug: string
  onRowClick: (l: LivroRow) => void
}) {
  const config = getNaturezaConfig(natureza)
  const printUrl = config.printPath ? `/print/${orgSlug}/livro/${config.printPath}` : null

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className={cn('inline-block size-2.5 rounded-full border', config.badgeClass)} />
          <span className="font-semibold text-sm">{natureza}</span>
          <Badge variant="secondary" className="h-5 text-xs font-normal tabular-nums">
            {livros.length}
          </Badge>
        </div>
        {printUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => window.open(printUrl, '_blank')}
          >
            <PrinterIcon className="size-3.5" />
            Imprimir
            <ExternalLinkIcon className="size-3" />
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/10">
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground w-20">Nº</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Período</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground w-28">Formato</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Referência / conteúdo</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {livros.map((l) => {
              const periodo = fmtPeriodo(l.periodo_inicio, l.periodo_fim)
              const referencia = l.orgao_autenticador?.slice(0, 80) ?? (l.operacao_id ? 'Operação vinculada' : null)
              return (
                <tr
                  key={l.id}
                  className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onRowClick(l)}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{l.numero_ordem.toString().padStart(3, '0')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                    {periodo ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <FormatoBadge formato={l.formato} />
                  </td>
                  <td className="px-4 py-2.5 text-sm">
                    {referencia ? (
                      <span className={cn(l.operacao_id && !l.orgao_autenticador && 'text-muted-foreground italic')}>
                        {referencia}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <ChevronRightIcon className="size-4 text-muted-foreground/50" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

function FilterTabs({
  naturezas,
  grouped,
  active,
  total,
  onChange,
}: {
  naturezas: string[]
  grouped: Map<string, LivroRow[]>
  active: string
  total: number
  onChange: (n: string) => void
}) {
  const tabClass = (value: string) =>
    cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors cursor-pointer',
      active === value
        ? 'bg-foreground text-background'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    )

  return (
    <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
      <button className={tabClass('all')} onClick={() => onChange('all')}>
        Todos
        <span className="tabular-nums text-xs opacity-70">{total}</span>
      </button>
      {naturezas.map((n) => {
        const cfg = getNaturezaConfig(n)
        return (
          <button key={n} className={tabClass(n)} onClick={() => onChange(n)}>
            {cfg.shortLabel}
            <span className="tabular-nums text-xs opacity-70">{grouped.get(n)?.length ?? 0}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Novo Livro Dialog ────────────────────────────────────────────────────────

function NovoLivroDialog({
  natureza,
  open,
  onClose,
  orgaos,
  orgSlug,
  onSaved,
}: {
  natureza: string
  open: boolean
  onClose: () => void
  orgaos: OrgaoSimples[]
  orgSlug: string
  onSaved: () => void
}) {
  const config = getNaturezaConfig(natureza)

  const [fOrgaoId, setFOrgaoId] = React.useState('')
  const [fPeriodoInicio, setFPeriodoInicio] = React.useState('')
  const [fPeriodoFim, setFPeriodoFim] = React.useState('')
  const [fFormato, setFFormato] = React.useState<'digital' | 'fisico' | ''>('')
  const [fAnotacoes, setFAnotacoes] = React.useState('')
  const [fAutenticado, setFAutenticado] = React.useState(false)
  const [fDataAuth, setFDataAuth] = React.useState('')
  const [fJunta, setFJunta] = React.useState('')
  const [fFormaAuth, setFFormaAuth] = React.useState<'escriturado' | 'em_branco' | ''>('')
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setFOrgaoId(''); setFPeriodoInicio(''); setFPeriodoFim('')
    setFFormato(''); setFAnotacoes(''); setFAutenticado(false)
    setFDataAuth(''); setFJunta(''); setFFormaAuth(''); setSaveError(null)
  }, [open, natureza])

  const canSave =
    !!fFormato &&
    (!config.exigeOrgao || !!fOrgaoId) &&
    (!fAutenticado || (!!fDataAuth && !!fJunta && !!fFormaAuth))

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const result = await criarLivro({
      orgSlug,
      natureza,
      orgao_id: fOrgaoId || null,
      periodo_inicio: fPeriodoInicio || null,
      periodo_fim: fPeriodoFim || null,
      formato: fFormato as 'digital' | 'fisico',
      data_autenticacao: fAutenticado ? fDataAuth || null : null,
      orgao_autenticador: fAutenticado ? fJunta || null : null,
      forma_autenticacao: fAutenticado ? fFormaAuth || null : null,
      local_autenticacao: null,
      anotacoes: fAnotacoes || null,
    })
    setSaving(false)
    if (result?.error) { setSaveError(result.error); return }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{config.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Banner informativo */}
          {config.textoAjuda && (
            <div className="flex gap-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3.5 py-3">
              <InfoIcon className="size-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                {config.textoAjuda}
              </p>
            </div>
          )}

          {/* Órgão social — somente quando exige */}
          {config.exigeOrgao && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Órgão social <span className="text-destructive">*</span>
              </label>
              <select
                value={fOrgaoId}
                onChange={(e) => setFOrgaoId(e.target.value)}
                className={SEL}
              >
                <option value="">Selecione o órgão social…</option>
                {orgaos.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Formato + Período — grid 2 colunas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Formato <span className="text-destructive">*</span>
              </label>
              <select
                value={fFormato}
                onChange={(e) => setFFormato(e.target.value as 'digital' | 'fisico' | '')}
                className={SEL}
              >
                <option value="">Selecione…</option>
                <option value="digital">Digital</option>
                <option value="fisico">Físico</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Nº de ordem
              </label>
              <Input
                value="Auto"
                disabled
                className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                title="O número de ordem é calculado automaticamente com base nos livros já existentes deste tipo."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Início do período</label>
              <Input
                type="date"
                value={fPeriodoInicio}
                onChange={(e) => setFPeriodoInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fim do período</label>
              <Input
                type="date"
                value={fPeriodoFim}
                min={fPeriodoInicio || undefined}
                onChange={(e) => setFPeriodoFim(e.target.value)}
              />
            </div>
          </div>

          {/* Anotações */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Anotações</label>
            <textarea
              rows={2}
              placeholder="Observações livres sobre este livro…"
              value={fAnotacoes}
              onChange={(e) => setFAnotacoes(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 resize-none"
            />
          </div>

          {/* Separador autenticação */}
          <div className="border-t border-border/60 pt-4 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={fAutenticado}
                onChange={(e) => setFAutenticado(e.target.checked)}
                className="size-4 rounded accent-foreground cursor-pointer"
              />
              <span className="text-sm font-medium">Livro já autenticado</span>
            </label>

            {/* Progressive disclosure */}
            {fAutenticado && (
              <div className="space-y-3 pl-6 border-l-2 border-border/60">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Data de autenticação <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="date"
                      value={fDataAuth}
                      onChange={(e) => setFDataAuth(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Junta Comercial <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={fJunta}
                      onChange={(e) => setFJunta(e.target.value)}
                      className={SEL}
                    >
                      <option value="">Selecione…</option>
                      {JUNTAS_COMERCIAIS.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Forma de autenticação <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="forma-auth"
                        value="escriturado"
                        checked={fFormaAuth === 'escriturado'}
                        onChange={() => setFFormaAuth('escriturado')}
                        className="accent-foreground"
                      />
                      Livro escriturado
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="forma-auth"
                        value="em_branco"
                        checked={fFormaAuth === 'em_branco'}
                        onChange={() => setFFormaAuth('em_branco')}
                        className="accent-foreground"
                      />
                      Livro em branco
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {saveError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-sm text-destructive">{saveError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Salvando…' : 'Salvar livro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LivrosTabela({ livros, orgaos, orgSlug }: Props) {
  const [filterNatureza, setFilterNatureza] = React.useState('all')
  const [selectedLivro, setSelectedLivro] = React.useState<LivroRow | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [dialogNatureza, setDialogNatureza] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [localLivros, setLocalLivros] = React.useState(livros)

  React.useEffect(() => { setLocalLivros(livros) }, [livros])

  const grouped = React.useMemo(() => {
    const map = new Map<string, LivroRow[]>()
    for (const l of localLivros) {
      if (!map.has(l.natureza)) map.set(l.natureza, [])
      map.get(l.natureza)!.push(l)
    }
    return map
  }, [localLivros])

  const naturezasPresentes = Array.from(grouped.keys())

  const visibleEntries: [string, LivroRow[]][] =
    filterNatureza === 'all'
      ? Array.from(grouped.entries())
      : [[filterNatureza, grouped.get(filterNatureza) ?? []]]

  function openNovo(natureza: string) {
    setDialogNatureza(natureza)
    setDialogOpen(true)
  }

  return (
    <>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterTabs
          naturezas={naturezasPresentes}
          grouped={grouped}
          active={filterNatureza}
          total={localLivros.length}
          onChange={setFilterNatureza}
        />

        {/* Dropdown agrupado por categoria */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm"><PlusIcon className="size-4" />Novo livro</Button>} />
          <DropdownMenuContent align="end" className="w-72">
            {CATEGORIAS.map((cat, i) => (
              <React.Fragment key={cat.key}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wider px-2 py-1.5">
                    {cat.label}
                  </DropdownMenuLabel>
                  {NATUREZAS_PRIMARIAS.filter((n) => n.categoria === cat.key).map((n) => (
                    <DropdownMenuItem
                      key={n.value}
                      className="text-sm cursor-pointer"
                      onClick={() => openNovo(n.value)}
                    >
                      <span
                        className={cn(
                          'inline-block size-2 rounded-full border shrink-0 mr-1',
                          n.badgeClass
                        )}
                      />
                      {n.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Grouped sections ── */}
      {visibleEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
          <BookOpenIcon className="mb-3 size-10 opacity-20" />
          <p className="text-sm font-medium">Nenhum livro societário encontrado</p>
          <p className="text-xs mt-1 max-w-xs">
            Os livros são criados automaticamente ao registrar operações de ativos ou concluir eventos.
            Você também pode criar manualmente com o botão acima.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {visibleEntries.map(([natureza, rows]) => (
            <NaturezaSection
              key={natureza}
              natureza={natureza}
              livros={rows}
              orgSlug={orgSlug}
              onRowClick={(l) => { setSelectedLivro(l); setDrawerOpen(true) }}
            />
          ))}
        </div>
      )}

      {/* ── Drawer detalhe ── */}
      <LivroDrawer
        livro={selectedLivro}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        orgSlug={orgSlug}
      />

      {/* ── Dialog novo livro ── */}
      {dialogNatureza && (
        <NovoLivroDialog
          natureza={dialogNatureza}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          orgaos={orgaos}
          orgSlug={orgSlug}
          onSaved={() => window.location.reload()}
        />
      )}
    </>
  )
}
