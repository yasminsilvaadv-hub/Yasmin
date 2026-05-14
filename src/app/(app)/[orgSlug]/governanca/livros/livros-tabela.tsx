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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { criarLivro } from '@/app/actions/governanca'
import { LivroDrawer } from './livro-drawer'
import { getNaturezaConfig, NATUREZA_VALUES, type LivroRow, type OrgaoSimples } from './types'

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
      {/* Section header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'inline-block size-2.5 rounded-full border',
              config.badgeClass
            )}
          />
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

      {/* Livros table */}
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

// ─── Main component ───────────────────────────────────────────────────────────

const SEL = 'h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20'

export function LivrosTabela({ livros, orgaos, orgSlug }: Props) {
  // Filter state
  const [filterNatureza, setFilterNatureza] = React.useState('all')

  // Drawer state
  const [selectedLivro, setSelectedLivro] = React.useState<LivroRow | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // "Novo livro" sheet state
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [fNatureza, setFNatureza] = React.useState('')
  const [fOrgaoId, setFOrgaoId] = React.useState('')
  const [fPeriodoInicio, setFPeriodoInicio] = React.useState('')
  const [fPeriodoFim, setFPeriodoFim] = React.useState('')
  const [fFormato, setFFormato] = React.useState<'digital' | 'fisico' | ''>('')
  const [fDataAuth, setFDataAuth] = React.useState('')
  const [fOrgaoAuth, setFOrgaoAuth] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Local livros state for optimistic refresh
  const [localLivros, setLocalLivros] = React.useState(livros)
  React.useEffect(() => { setLocalLivros(livros) }, [livros])

  // Group by natureza (preserving order of first occurrence)
  const grouped = React.useMemo(() => {
    const map = new Map<string, LivroRow[]>()
    for (const l of localLivros) {
      if (!map.has(l.natureza)) map.set(l.natureza, [])
      map.get(l.natureza)!.push(l)
    }
    return map
  }, [localLivros])

  const naturezasPresentes = Array.from(grouped.keys())

  // Which groups to display
  const visibleEntries: [string, LivroRow[]][] =
    filterNatureza === 'all'
      ? Array.from(grouped.entries())
      : [[filterNatureza, grouped.get(filterNatureza) ?? []]]

  function openDrawer(l: LivroRow) {
    setSelectedLivro(l)
    setDrawerOpen(true)
  }

  function resetForm() {
    setFNatureza(''); setFOrgaoId(''); setFPeriodoInicio(''); setFPeriodoFim('')
    setFFormato(''); setFDataAuth(''); setFOrgaoAuth(''); setSaveError(null)
  }

  async function handleSave() {
    if (!fNatureza || !fFormato) return
    setSaving(true)
    setSaveError(null)
    const result = await criarLivro({
      orgSlug,
      natureza: fNatureza,
      orgao_id: fOrgaoId || null,
      periodo_inicio: fPeriodoInicio || null,
      periodo_fim: fPeriodoFim || null,
      formato: fFormato as 'digital' | 'fisico',
      data_autenticacao: fDataAuth || null,
      orgao_autenticador: fOrgaoAuth || null,
    })
    setSaving(false)
    if (result?.error) { setSaveError(result.error); return }
    setSheetOpen(false)
    resetForm()
    // Refresh happens via server revalidation — trigger router refresh
    window.location.reload()
  }

  return (
    <>
      {/* ── Top header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterTabs
          naturezas={naturezasPresentes}
          grouped={grouped}
          active={filterNatureza}
          total={localLivros.length}
          onChange={setFilterNatureza}
        />
        <Button onClick={() => { resetForm(); setSheetOpen(true) }} size="sm">
          <PlusIcon />
          Novo livro
        </Button>
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
        <div className="space-y-4">
          {visibleEntries.map(([natureza, rows]) => (
            <NaturezaSection
              key={natureza}
              natureza={natureza}
              livros={rows}
              orgSlug={orgSlug}
              onRowClick={openDrawer}
            />
          ))}
        </div>
      )}

      {/* ── Drawer ── */}
      <LivroDrawer
        livro={selectedLivro}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        orgSlug={orgSlug}
        onUpdated={() => {
          // Optimistically update the local livro
          // Full refresh happens on next navigation
        }}
      />

      {/* ── "Novo livro" sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Novo livro societário</SheetTitle>
          </SheetHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto px-1 py-1">
            {/* Natureza */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Natureza <span className="text-destructive">*</span>
              </label>
              <select value={fNatureza} onChange={(e) => setFNatureza(e.target.value)} className={SEL}>
                <option value="">Selecione a natureza…</option>
                {NATUREZA_VALUES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Órgão social */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Órgão social</label>
              <select value={fOrgaoId} onChange={(e) => setFOrgaoId(e.target.value)} className={SEL}>
                <option value="">Não vinculado</option>
                {orgaos.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>

            {/* Período */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Período início</label>
                <Input type="date" value={fPeriodoInicio} onChange={(e) => setFPeriodoInicio(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Período fim</label>
                <Input type="date" value={fPeriodoFim} onChange={(e) => setFPeriodoFim(e.target.value)} />
              </div>
            </div>

            {/* Formato */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Formato <span className="text-destructive">*</span>
              </label>
              <select value={fFormato} onChange={(e) => setFFormato(e.target.value as 'digital' | 'fisico' | '')} className={SEL}>
                <option value="">Selecione…</option>
                <option value="digital">Digital</option>
                <option value="fisico">Físico</option>
              </select>
            </div>

            {/* Auth */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data de autenticação</label>
              <Input type="date" value={fDataAuth} onChange={(e) => setFDataAuth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Órgão autenticador</label>
              <Input
                placeholder="Ex.: Junta Comercial de SP"
                value={fOrgaoAuth}
                onChange={(e) => setFOrgaoAuth(e.target.value)}
              />
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>

          <SheetFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !fNatureza || !fFormato}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
