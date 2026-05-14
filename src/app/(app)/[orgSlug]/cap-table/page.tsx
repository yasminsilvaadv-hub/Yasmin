'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DownloadIcon,
  ChevronDownIcon,
  UsersIcon,
  LayersIcon,
  TrendingUpIcon,
  PieChartIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapTableRow {
  ativo_id: string
  codigo: string
  especie: string | null
  nome_classe: string | null
  tipo: string
  titular_id: string | null
  nome_titular: string | null
  quantidade: number
  capital_social: number
}

interface AtivoGroup {
  ativo_id: string
  codigo: string
  especie: string | null
  nome_classe: string | null
  tipo: string
  capital_social: number
  quantidade: number
  titulares: TitularEntry[]
}

interface TitularEntry {
  titular_id: string | null
  nome_titular: string | null
  quantidade: number
}

interface TitularGroup {
  titular_id: string | null
  nome_titular: string | null
  quantidade: number
  ativos: { codigo: string; tipo: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPct(n: number, total: number) {
  return total > 0 ? ((n / total) * 100).toFixed(2) + '%' : '0%'
}

function formatNum(n: number) {
  return n.toLocaleString('pt-BR')
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function today(): string {
  // Use local date, not UTC — avoids returning "tomorrow" for users UTC-3 after 21h
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Paleta de cores para badges de código de ativo
const BADGE_COLORS: string[] = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
]

const codigoColorCache = new Map<string, string>()
let colorIndex = 0
function getBadgeColor(codigo: string): string {
  if (!codigoColorCache.has(codigo)) {
    codigoColorCache.set(codigo, BADGE_COLORS[colorIndex % BADGE_COLORS.length])
    colorIndex++
  }
  return codigoColorCache.get(codigo)!
}

function CodigoBadge({ codigo }: { codigo: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        getBadgeColor(codigo)
      )}
    >
      {codigo.toUpperCase()}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <LayersIcon className="mb-3 size-10 opacity-25" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Linha expansível (Por Ativo) ─────────────────────────────────────────────

function AtivoExpandableRow({
  group,
  totalAtual,
  totalFuturo,
  qtdFutura,
}: {
  group: AtivoGroup
  totalAtual: number
  totalFuturo: number
  qtdFutura: number
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <TableRow
        className="cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <TableCell className="font-medium">
          <span className="flex items-center gap-2">
            <ChevronDownIcon
              className={cn(
                'size-4 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
            {group.nome_classe || group.codigo}
          </span>
        </TableCell>
        <TableCell>
          <CodigoBadge codigo={group.codigo} />
        </TableCell>
        <TableCell className="capitalize">{group.especie ?? '—'}</TableCell>
        <TableCell className="text-right">{formatNum(group.quantidade)}</TableCell>
        <TableCell className="text-right">{formatPct(group.quantidade, totalAtual)}</TableCell>
        <TableCell className="text-right">{formatNum(qtdFutura)}</TableCell>
        <TableCell className="text-right">{formatPct(qtdFutura, totalFuturo)}</TableCell>
      </TableRow>

      {open && (
        <>
          {/* Sub-header */}
          <TableRow className="bg-muted/30">
            <TableCell colSpan={2} />
            <TableCell className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Titular
            </TableCell>
            <TableCell className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quantidade
            </TableCell>
            <TableCell className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              %
            </TableCell>
            <TableCell colSpan={2} />
          </TableRow>
          {group.titulares.length === 0 ? (
            <TableRow className="bg-muted/20">
              <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-3">
                Sem titulares registrados
              </TableCell>
            </TableRow>
          ) : (
            group.titulares.map((t, i) => (
              <TableRow key={t.titular_id ?? `sem-titular-${i}`} className="bg-muted/20">
                <TableCell colSpan={2} />
                <TableCell className="text-sm">{t.nome_titular ?? 'Tesouraria'}</TableCell>
                <TableCell className="text-right text-sm">{formatNum(t.quantidade)}</TableCell>
                <TableCell className="text-right text-sm">
                  {formatPct(t.quantidade, totalAtual)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            ))
          )}
        </>
      )}
    </>
  )
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(rows: CapTableRow[], dataRef: string) {
  const headers = [
    'Ativo',
    'Código',
    'Espécie',
    'Tipo',
    'Titular',
    'Quantidade',
    'Capital Social (R$)',
  ]
  const lines = [
    headers.join(';'),
    ...rows.map((r) =>
      [
        r.nome_classe ?? r.codigo,
        r.codigo,
        r.especie ?? '',
        r.tipo,
        r.nome_titular ?? 'Tesouraria',
        r.quantidade,
        r.capital_social,
      ].join(';')
    ),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cap-table-${dataRef}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CapTablePage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug
  const supabase = React.useMemo(() => createClient(), [])

  const [orgId, setOrgId] = React.useState<string | null>(null)
  const [dataRef, setDataRef] = React.useState<string>(today())
  const [incluirTesouraria, setIncluirTesouraria] = React.useState(false)
  const [incluirUsufruto, setIncluirUsufruto] = React.useState(false)
  const [rows, setRows] = React.useState<CapTableRow[]>([])
  const [qtdFuturaMap, setQtdFuturaMap] = React.useState<Map<string, number>>(new Map())
  const [loading, setLoading] = React.useState(true)

  // ── Bootstrap ──────────────────────────────────────────────
  React.useEffect(() => {
    async function bootstrap() {
      const { data: org } = await supabase
        .from('organizacoes')
        .select('id')
        .eq('slug', orgSlug)
        .single()
      if (!org) {
        setLoading(false)
        return
      }
      setOrgId(org.id)
      setLoading(false)
    }
    bootstrap()
  }, [orgSlug, supabase])

  // ── Fetch cap table + contratos equity ────────────────────
  React.useEffect(() => {
    if (!orgId || !dataRef) return

    async function fetchData() {
      setLoading(true)

      // Cap table via RPC
      const { data: capData, error: capErr } = await supabase.rpc('calcular_cap_table', {
        p_org_id: orgId!,
        p_data_ref: dataRef,
        p_incluir_tesouraria: incluirTesouraria,
        p_incluir_usufruto: incluirUsufruto,
      })

      if (!capErr && capData) {
        setRows(capData as CapTableRow[])
      } else {
        setRows([])
      }

      // Pool total dos planos de equity = dilution futura máxima
      // (inclui ações reservadas ainda não outorgadas em contratos)
      const { data: planosEquity } = await supabase
        .from('planos_equity')
        .select('pool_total')
        .eq('organizacao_id', orgId!)

      const totalPool = (planosEquity ?? []).reduce(
        (sum, p) => sum + Number(p.pool_total ?? 0),
        0
      )
      setQtdFuturaMap(new Map([['__total__', totalPool]]))

      setLoading(false)
    }

    fetchData()
  }, [orgId, dataRef, incluirTesouraria, incluirUsufruto, supabase])

  // ── Derived data ───────────────────────────────────────────

  // Agrupa por ativo
  const ativoMap = React.useMemo(() => {
    const map = new Map<string, AtivoGroup>()
    for (const row of rows) {
      if (!map.has(row.ativo_id)) {
        map.set(row.ativo_id, {
          ativo_id: row.ativo_id,
          codigo: row.codigo,
          especie: row.especie,
          nome_classe: row.nome_classe,
          tipo: row.tipo,
          capital_social: row.capital_social,
          quantidade: 0,
          titulares: [],
        })
      }
      const g = map.get(row.ativo_id)!
      g.quantidade += row.quantidade
      if (row.titular_id !== null || row.nome_titular !== null) {
        g.titulares.push({
          titular_id: row.titular_id,
          nome_titular: row.nome_titular,
          quantidade: row.quantidade,
        })
      }
    }
    return map
  }, [rows])

  // Agrupa por titular
  const titularMap = React.useMemo(() => {
    const map = new Map<string, TitularGroup>()
    for (const row of rows) {
      const key = row.titular_id ?? '__tesouraria__'
      if (!map.has(key)) {
        map.set(key, {
          titular_id: row.titular_id,
          nome_titular: row.nome_titular,
          quantidade: 0,
          ativos: [],
        })
      }
      const g = map.get(key)!
      g.quantidade += row.quantidade
      if (!g.ativos.find((a) => a.codigo === row.codigo)) {
        g.ativos.push({ codigo: row.codigo, tipo: row.tipo })
      }
    }
    return map
  }, [rows])

  const totalAtual = React.useMemo(
    () => Array.from(ativoMap.values()).reduce((s, g) => s + g.quantidade, 0),
    [ativoMap]
  )

  const totalPool = qtdFuturaMap.get('__total__') ?? 0
  const totalOpcoes = totalPool
  const totalFuturo = totalAtual + totalOpcoes

  const capitalSocial = React.useMemo(() => {
    // capital_social vem da função — pega o valor único (é o mesmo em todas as linhas)
    if (rows.length > 0) return rows[0].capital_social
    return 0
  }, [rows])

  // ── Qtd futura por ativo: distribuímos proporcionalmente ──
  function getQtdFutura(group: AtivoGroup): number {
    if (totalAtual === 0 || totalOpcoes === 0) return group.quantidade
    // Distribui opções proporcionalmente à participação atual
    const opcoesProporcional = Math.round((group.quantidade / totalAtual) * totalOpcoes)
    return group.quantidade + opcoesProporcional
  }

  const ativoGroups = Array.from(ativoMap.values())
  const titularGroups = Array.from(titularMap.values()).sort(
    (a, b) => b.quantidade - a.quantidade
  )

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Cap Table"
        description="Estrutura acionária da organização"
        icon={PieChartIcon}
        iconGradient="from-blue-400 to-blue-600"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCSV(rows, dataRef)}
            disabled={rows.length === 0}
          >
            <DownloadIcon />
            Exportar CSV
          </Button>
        }
      />

    <div className="p-6 space-y-6">

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Data de referência */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium whitespace-nowrap">Data de referência:</label>
          <input
            type="date"
            value={dataRef}
            onChange={(e) => setDataRef(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
        </div>

        {/* Toggle tesouraria */}
        <label className="flex cursor-pointer items-center gap-2">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={incluirTesouraria}
              onChange={(e) => setIncluirTesouraria(e.target.checked)}
            />
            <div
              className={cn(
                'h-5 w-9 rounded-full transition-colors',
                incluirTesouraria ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            />
            <div
              className={cn(
                'absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform',
                incluirTesouraria ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </div>
          <span className="text-sm">Considerar tesouraria?</span>
        </label>

        {/* Toggle usufruto */}
        <label className="flex cursor-pointer items-center gap-2">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={incluirUsufruto}
              onChange={(e) => setIncluirUsufruto(e.target.checked)}
            />
            <div
              className={cn(
                'h-5 w-9 rounded-full transition-colors',
                incluirUsufruto ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            />
            <div
              className={cn(
                'absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform',
                incluirUsufruto ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </div>
          <span className="text-sm">Considerar usufrutos?</span>
        </label>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <LayersIcon className="size-4" />
              Capital social
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBRL(capitalSocial)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UsersIcon className="size-4" />
              Total de ações atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNum(totalAtual)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              em {formatDate(dataRef)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUpIcon className="size-4" />
              Total de ações futuro (diluído)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNum(totalFuturo)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalOpcoes > 0 ? `+${formatNum(totalOpcoes)} do pool de equity (não emitidas)` : 'Sem pool de equity cadastrado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Abas */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <EmptyState message="Nenhum dado de cap table para a data selecionada." />
      ) : (
        <Tabs defaultValue="por-ativo">
          <TabsList>
            <TabsTrigger value="por-ativo">Por Ativo</TabsTrigger>
            <TabsTrigger value="por-titular">Por Titular</TabsTrigger>
          </TabsList>

          {/* ABA: Por Ativo */}
          <TabsContent value="por-ativo">
            <div className="rounded-lg border overflow-x-auto mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Espécie</TableHead>
                    <TableHead className="text-right">Qtd atual</TableHead>
                    <TableHead className="text-right">% atual</TableHead>
                    <TableHead className="text-right">Qtd diluída</TableHead>
                    <TableHead className="text-right">% diluída</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ativoGroups.map((group) => (
                    <AtivoExpandableRow
                      key={group.ativo_id}
                      group={group}
                      totalAtual={totalAtual}
                      totalFuturo={totalFuturo}
                      qtdFutura={getQtdFutura(group)}
                    />
                  ))}
                  {/* Totais */}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right">{formatNum(totalAtual)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                    <TableCell className="text-right">{formatNum(totalFuturo)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ABA: Por Titular */}
          <TabsContent value="por-titular">
            <div className="rounded-lg border overflow-x-auto mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titular</TableHead>
                    <TableHead className="text-right">Qtd total</TableHead>
                    <TableHead className="text-right">% atual</TableHead>
                    <TableHead>Classes de ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titularGroups.map((t) => (
                    <TableRow key={t.titular_id ?? '__tesouraria__'}>
                      <TableCell className="font-medium">
                        {t.nome_titular ?? 'Tesouraria'}
                      </TableCell>
                      <TableCell className="text-right">{formatNum(t.quantidade)}</TableCell>
                      <TableCell className="text-right">
                        {formatPct(t.quantidade, totalAtual)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.ativos.map((a) => (
                            <CodigoBadge key={a.codigo} codigo={a.codigo} />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totais */}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatNum(totalAtual)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
    </div>
  )
}
