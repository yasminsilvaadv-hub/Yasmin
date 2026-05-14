'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { PageHeader } from '@/components/shared/page-header'
import {
  NetworkIcon,
  PrinterIcon,
  PlusIcon,
  Trash2Icon,
  Building2Icon,
  SettingsIcon,
  Users2Icon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subsidiaria {
  id: string
  nome: string
  cnpj?: string
  participacao: number // 100 = integral, <100 = afiliada
}

interface TitularSummary {
  id: string | null
  nome: string | null
  quantidade: number
  pct: number
}

interface OrgInfo {
  id: string
  nome: string
  cnpj?: string | null
  capital_social?: number
}

// ─── Node components ──────────────────────────────────────────────────────────

const InvestorNode = React.forwardRef<
  HTMLDivElement,
  { nome: string; pct: number; big?: boolean }
>(({ nome, pct, big }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col items-center gap-1 rounded-xl border bg-white px-3 py-2.5 text-center shadow-sm transition-shadow hover:shadow-md',
      'print:shadow-none print:border-gray-300',
      big
        ? 'border-blue-300 bg-blue-50/70 min-w-[110px]'
        : 'border-slate-200 min-w-[90px] opacity-80'
    )}
  >
    <span
      className={cn(
        'tabular-nums font-bold leading-none',
        big ? 'text-[13px] text-blue-700' : 'text-[11px] text-slate-600'
      )}
    >
      {pct.toFixed(2)}%
    </span>
    <span className="text-[10.5px] font-medium text-slate-700 leading-tight line-clamp-3 max-w-[110px]">
      {nome}
    </span>
  </div>
))
InvestorNode.displayName = 'InvestorNode'

const MainNode = React.forwardRef<
  HTMLDivElement,
  { nome: string; cnpj?: string; capitalSocial?: number; totalAcoes?: number }
>(({ nome, cnpj, capitalSocial, totalAcoes }, ref) => (
  <div
    ref={ref}
    className="rounded-2xl border-2 border-blue-600 bg-gradient-to-b from-blue-700 to-blue-900
               px-10 py-5 text-white shadow-2xl text-center min-w-[260px] max-w-[360px]
               print:shadow-none print:border-blue-800"
  >
    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-200 mb-1">
      Holding Controladora
    </div>
    <div className="text-[15px] font-bold leading-snug">{nome}</div>
    {cnpj && (
      <div className="text-[10px] text-blue-300 mt-1 font-mono">{cnpj}</div>
    )}
    {(capitalSocial || totalAcoes) && (
      <div className="mt-3 pt-2.5 border-t border-blue-500/50 flex items-center justify-center gap-6">
        {capitalSocial != null && (
          <div>
            <div className="text-[8px] text-blue-300 uppercase tracking-wider">Capital Social</div>
            <div className="text-[13px] font-bold tabular-nums">
              {capitalSocial.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>
        )}
        {totalAcoes != null && (
          <div>
            <div className="text-[8px] text-blue-300 uppercase tracking-wider">Ações</div>
            <div className="text-[13px] font-bold tabular-nums">
              {totalAcoes.toLocaleString('pt-BR')}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
))
MainNode.displayName = 'MainNode'

const SubsidiaryNode = React.forwardRef<
  HTMLDivElement,
  { sub: Subsidiaria }
>(({ sub }, ref) => {
  const isAfiliada = sub.participacao < 100
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border px-4 py-3 text-center shadow-sm min-w-[120px] max-w-[160px]',
        'print:shadow-none',
        isAfiliada
          ? 'border-amber-400 border-dashed bg-amber-50'
          : 'border-slate-300 bg-white'
      )}
    >
      <Building2Icon
        className={cn('size-4 mx-auto mb-1.5', isAfiliada ? 'text-amber-500' : 'text-slate-400')}
      />
      <div className="text-[11px] font-semibold text-slate-800 leading-tight">
        {sub.nome}
      </div>
      {sub.cnpj && (
        <div className="text-[9px] text-slate-400 mt-0.5 font-mono truncate max-w-full">
          {sub.cnpj}
        </div>
      )}
      <div
        className={cn(
          'mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold',
          isAfiliada ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-700'
        )}
      >
        {sub.participacao}%
      </div>
      {isAfiliada && (
        <div className="text-[9px] text-amber-600 mt-0.5">Afiliada</div>
      )}
    </div>
  )
})
SubsidiaryNode.displayName = 'SubsidiaryNode'

// ─── Chart (SVG lines + nodes) ────────────────────────────────────────────────

function OrgChartCanvas({
  shareholders,
  org,
  subsidiarias,
}: {
  shareholders: TitularSummary[]
  org: OrgInfo
  subsidiarias: Subsidiaria[]
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mainRef = React.useRef<HTMLDivElement>(null)
  // Use a ref-of-map instead of array to avoid mutating during render
  const investorElems = React.useRef<Map<number, HTMLDivElement>>(new Map())
  const subsidElems   = React.useRef<Map<number, HTMLDivElement>>(new Map())
  const [paths, setPaths] = React.useState<{ d: string; dashed?: boolean }[]>([])

  // Total ações para calcular capital social
  const totalAcoes = shareholders.reduce((s, t) => s + t.quantidade, 0)

  const recalc = React.useCallback(() => {
    const ct = containerRef.current
    const mn = mainRef.current
    if (!ct || !mn) return

    const cr = ct.getBoundingClientRect()
    if (cr.width === 0) return // not yet laid out

    const mr = mn.getBoundingClientRect()
    const mx   = mr.left - cr.left + mr.width / 2
    const myTop = mr.top  - cr.top
    const myBot = mr.top  - cr.top + mr.height

    const newPaths: { d: string; dashed?: boolean }[] = []

    // Investors → main top
    investorElems.current.forEach((el) => {
      const r  = el.getBoundingClientRect()
      const x  = r.left - cr.left + r.width / 2
      const y  = r.top  - cr.top  + r.height
      const cy = (y + myTop) / 2
      newPaths.push({ d: `M ${x} ${y} C ${x} ${cy}, ${mx} ${cy}, ${mx} ${myTop}` })
    })

    // Main bottom → subsidiaries
    subsidElems.current.forEach((el, i) => {
      const r  = el.getBoundingClientRect()
      const x  = r.left - cr.left + r.width / 2
      const y  = r.top  - cr.top
      const cy = (myBot + y) / 2
      newPaths.push({
        d: `M ${mx} ${myBot} C ${mx} ${cy}, ${x} ${cy}, ${x} ${y}`,
        dashed: (subsidiarias[i]?.participacao ?? 100) < 100,
      })
    })

    setPaths(newPaths)
  }, [subsidiarias])

  // Recalculate whenever data or layout changes
  React.useEffect(() => {
    // rAF ensures the browser has finished painting the new nodes
    const id = requestAnimationFrame(() => recalc())
    return () => cancelAnimationFrame(id)
  }, [shareholders, subsidiarias, recalc])

  // Also recalculate on resize
  React.useEffect(() => {
    const obs = new ResizeObserver(() => requestAnimationFrame(() => recalc()))
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [recalc])

  // Show top N shareholders + "Outros"
  const TOP_N = 8
  const top = shareholders.slice(0, TOP_N)
  const outros = shareholders.slice(TOP_N)
  const outrosPct = outros.reduce((s, t) => s + t.pct, 0)
  const displayedShareholders: TitularSummary[] =
    outros.length > 0
      ? [
          ...top,
          {
            id: '__outros__',
            nome: `Outros (${outros.length})`,
            quantidade: outros.reduce((s, t) => s + t.quantidade, 0),
            pct: outrosPct,
          },
        ]
      : top

  return (
    <div ref={containerRef} className="relative w-full">
      {/* SVG connector lines — full CSS size, no explicit width/height to avoid 0×0 bug */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full print:block"
        style={{ zIndex: 0 }}
      >
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#93c5fd" />
          </marker>
        </defs>
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.dashed ? '#fbbf24' : '#93c5fd'}
            strokeWidth={1.5}
            strokeDasharray={p.dashed ? '5 4' : undefined}
            markerEnd="url(#arrow)"
            opacity={0.7}
          />
        ))}
      </svg>

      {/* Shareholders row */}
      <div className="relative z-10 flex flex-wrap justify-center gap-3 pb-10">
        {displayedShareholders.map((t, i) => (
          <InvestorNode
            key={t.id ?? i}
            ref={(el) => {
              if (el) investorElems.current.set(i, el)
              else investorElems.current.delete(i)
            }}
            nome={t.nome ?? '—'}
            pct={t.pct}
            big={t.pct >= 5}
          />
        ))}
      </div>

      {/* Main node */}
      <div className="relative z-10 flex justify-center pb-10">
        <MainNode
          ref={mainRef}
          nome={org.nome}
          cnpj={org.cnpj ?? undefined}
          totalAcoes={totalAcoes > 0 ? totalAcoes : undefined}
        />
      </div>

      {/* Subsidiaries row */}
      {subsidiarias.length > 0 && (
        <div className="relative z-10 flex flex-wrap justify-center gap-4">
          {subsidiarias.map((sub, i) => (
            <SubsidiaryNode
              key={sub.id}
              ref={(el) => {
                if (el) subsidElems.current.set(i, el)
                else subsidElems.current.delete(i)
              }}
              sub={sub}
            />
          ))}
        </div>
      )}

      {subsidiarias.length === 0 && (
        <div className="relative z-10 flex justify-center">
          <p className="text-xs text-muted-foreground italic">
            Nenhuma subsidiária configurada — use o botão &quot;Gerenciar subsidiárias&quot; acima.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Subsidiárias Sheet ───────────────────────────────────────────────────────

function SubsidiariasSheet({
  open,
  onOpenChange,
  subsidiarias,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  subsidiarias: Subsidiaria[]
  onSave: (list: Subsidiaria[]) => Promise<void>
}) {
  const [list, setList] = React.useState<Subsidiaria[]>([])
  const [nome, setNome] = React.useState('')
  const [cnpj, setCnpj] = React.useState('')
  const [participacao, setParticipacao] = React.useState('100')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) setList(subsidiarias)
  }, [open, subsidiarias])

  function addItem() {
    if (!nome.trim()) return
    setList((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: nome.trim(), cnpj: cnpj.trim() || undefined, participacao: Number(participacao) || 100 },
    ])
    setNome('')
    setCnpj('')
    setParticipacao('100')
  }

  function removeItem(id: string) {
    setList((prev) => prev.filter((s) => s.id !== id))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(list)
    setSaving(false)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Gerenciar subsidiárias</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 py-4">
          {/* Form */}
          <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Adicionar empresa</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-nome" className="text-xs">Nome da empresa *</Label>
              <Input
                id="sub-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: S3ENG Tecnologia Ltda."
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <Label htmlFor="sub-cnpj" className="text-xs">CNPJ</Label>
                <Input
                  id="sub-cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="w-24 flex flex-col gap-1.5">
                <Label htmlFor="sub-pct" className="text-xs">Participação %</Label>
                <Input
                  id="sub-pct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={participacao}
                  onChange={(e) => setParticipacao(e.target.value)}
                />
              </div>
            </div>
            <Button size="sm" onClick={addItem} disabled={!nome.trim()} className="self-start mt-1">
              <PlusIcon className="size-3.5 mr-1" /> Adicionar
            </Button>
          </div>

          {/* List */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-muted-foreground">{list.length} empresa{list.length !== 1 ? 's' : ''} configurada{list.length !== 1 ? 's' : ''}</p>
            {list.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-4 text-center">Nenhuma empresa adicionada ainda.</p>
            )}
            {list.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.nome}</p>
                  {s.cnpj && <p className="text-[10px] text-muted-foreground font-mono">{s.cnpj}</p>}
                </div>
                <span className="text-xs font-bold text-muted-foreground shrink-0">{s.participacao}%</span>
                <button
                  type="button"
                  onClick={() => removeItem(s.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="px-4">
          <SheetClose render={<Button type="button" variant="outline" />}>Cancelar</SheetClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrganogramaPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [org, setOrg] = React.useState<OrgInfo | null>(null)
  const [shareholders, setShareholders] = React.useState<TitularSummary[]>([])
  const [subsidiarias, setSubsiduarias] = React.useState<Subsidiaria[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const supabase = React.useMemo(() => createClient(), [])

  const subsidKey = `organograma-subsidiarias-${orgSlug}`

  async function load() {
    setLoading(true)

    // 1. Org info — only columns that actually exist in the table
    const { data: orgData, error } = await supabase
      .from('organizacoes')
      .select('id, nome, cnpj')
      .eq('slug', orgSlug)
      .single()

    if (error || !orgData) { setLoading(false); return }
    setOrg(orgData as OrgInfo)

    // Load subsidiárias from localStorage (no DB column needed)
    try {
      const stored = localStorage.getItem(subsidKey)
      if (stored) setSubsiduarias(JSON.parse(stored) as Subsidiaria[])
    } catch { /* ignore */ }

    // 2. Cap table — aggregate by titular
    // Use local date (not UTC) to avoid returning "tomorrow" for UTC-3 users after 21h
    const d = new Date()
    const localDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

    const { data: rows } = await supabase.rpc('calcular_cap_table', {
      p_org_id: orgData.id,
      p_data_ref: localDate,
      p_incluir_tesouraria: false,
      p_incluir_usufruto: false,
    })

    if (rows && rows.length > 0) {
      const byTitular = new Map<string, { nome: string | null; quantidade: number }>()
      for (const r of rows as { titular_id: string | null; nome_titular: string | null; quantidade: number }[]) {
        const key = r.titular_id ?? '__sem_titular__'
        const existing = byTitular.get(key)
        if (existing) {
          existing.quantidade += r.quantidade
        } else {
          byTitular.set(key, { nome: r.nome_titular, quantidade: r.quantidade })
        }
      }
      const total = Array.from(byTitular.values()).reduce((s, v) => s + v.quantidade, 0)
      const list: TitularSummary[] = Array.from(byTitular.entries())
        .map(([id, v]) => ({
          id: id === '__sem_titular__' ? null : id,
          nome: v.nome,
          quantidade: v.quantidade,
          pct: total > 0 ? (v.quantidade / total) * 100 : 0,
        }))
        .sort((a, b) => b.pct - a.pct)
      setShareholders(list)
    }

    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { load() }, [orgSlug])

  async function saveSubsidiarias(list: Subsidiaria[]) {
    // Persist to localStorage — no DB migration required
    try { localStorage.setItem(subsidKey, JSON.stringify(list)) } catch { /* ignore */ }
    setSubsiduarias(list)
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="border-b border-border/50 bg-background px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-muted animate-pulse shrink-0" />
            <div className="flex flex-col gap-2">
              <div className="h-5 w-44 rounded bg-muted animate-pulse" />
              <div className="h-3 w-60 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-8 flex justify-center">
          <div className="w-full max-w-3xl space-y-6">
            <div className="flex justify-center gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 w-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
            <div className="flex justify-center">
              <div className="h-28 w-72 rounded-2xl bg-muted animate-pulse" />
            </div>
            <div className="flex justify-center gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 w-32 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Organização não encontrada.
      </div>
    )
  }

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #organograma-print, #organograma-print * { visibility: visible; }
          #organograma-print { position: absolute; inset: 0; padding: 24px; background: white; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 1.5cm; }
        }
      `}</style>

      <div className="flex flex-col">
        <PageHeader
          title="Organograma"
          description="Estrutura de governança societária do grupo"
          icon={NetworkIcon}
          iconGradient="from-blue-400 to-blue-700"
          actions={
            <div className="flex items-center gap-2 no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSheetOpen(true)}
              >
                <SettingsIcon className="size-3.5 mr-1.5" />
                Subsidiárias
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
              >
                <PrinterIcon className="size-3.5 mr-1.5" />
                Imprimir PDF
              </Button>
            </div>
          }
        />

        <div id="organograma-print" className="p-8">
          {/* Header for print */}
          <div className="mb-6 hidden print:flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-lg font-bold">{org.nome}</h1>
              <p className="text-xs text-gray-500">
                Estrutura de Governança Societária · {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
            {org.cnpj && <p className="text-xs font-mono text-gray-500">{org.cnpj}</p>}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 text-[11px] text-muted-foreground mb-8 no-print">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-blue-400" />
              Acionistas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-blue-800" />
              Holding
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full border-2 border-slate-400 bg-white" />
              Subsidiária (100%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full border-2 border-dashed border-amber-400 bg-amber-50" />
              Afiliada (&lt;100%)
            </span>
          </div>

          {shareholders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Users2Icon className="size-12 opacity-20" />
              <p className="text-sm">Nenhum dado de cap table encontrado.</p>
              <p className="text-xs">Registre operações de emissão de ações para visualizar o organograma.</p>
            </div>
          ) : (
            <OrgChartCanvas
              shareholders={shareholders}
              org={org}
              subsidiarias={subsidiarias}
            />
          )}

          {/* Footer for print */}
          <div className="mt-8 hidden print:block border-t pt-3">
            <p className="text-[9px] text-gray-400">
              Gerado pela plataforma de Gestão Societária · {org.nome} · {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <SubsidiariasSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        subsidiarias={subsidiarias}
        onSave={saveSubsidiarias}
      />
    </>
  )
}
