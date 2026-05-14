'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { PlusIcon, TrendingUpIcon, CalendarIcon, DollarSignIcon, LineChartIcon } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { inserirHistoricoPreco } from '@/app/actions/ativos'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ativo {
  id: string
  codigo: string
  nome_classe: string | null
  especie: string | null
}

interface HistoricoItem {
  id: string
  ativo_id: string
  preco: number
  data_registro: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function calcAnos(dataInicio: string, dataFim: string): number {
  const d1 = new Date(dataInicio + 'T00:00:00')
  const d2 = new Date(dataFim + 'T00:00:00')
  return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
}

function calcValorizacaoAnual(precoInicial: number, precoFinal: number, anos: number): number {
  if (anos <= 0 || precoInicial <= 0) return 0
  return (Math.pow(precoFinal / precoInicial, 1 / anos) - 1) * 100
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-primary">{formatBRL(payload[0].value)}</p>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
      <TrendingUpIcon className="mb-3 size-10 opacity-25" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HistoricoPrecoPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug
  const supabase = React.useMemo(() => createClient(), [])

  const [orgId, setOrgId] = React.useState<string | null>(null)
  const [ativos, setAtivos] = React.useState<Ativo[]>([])
  const [selectedAtivoId, setSelectedAtivoId] = React.useState<string>('')
  const [historico, setHistorico] = React.useState<HistoricoItem[]>([])
  const [loading, setLoading] = React.useState(true)

  // Sheet state
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [formAtivoId, setFormAtivoId] = React.useState<string>('')
  const [formData, setFormData] = React.useState('')
  const [formPreco, setFormPreco] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

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

      const { data: ativosData } = await supabase
        .from('ativos')
        .select('id, codigo, nome_classe, especie')
        .eq('organizacao_id', org.id)
        .eq('tipo', 'acao')
        .order('codigo')

      const list = ativosData ?? []
      setAtivos(list)
      if (list.length > 0) {
        setSelectedAtivoId(list[0].id)
        setFormAtivoId(list[0].id)
      }
      setLoading(false)
    }
    bootstrap()
  }, [orgSlug, supabase])

  // ── Fetch historico when selected ativo changes ────────────
  const refreshHistorico = React.useCallback(
    async (ativoId: string, currentOrgId: string) => {
      const { data } = await supabase
        .from('historico_preco_acao')
        .select('id, ativo_id, preco, data_registro')
        .eq('organizacao_id', currentOrgId)
        .eq('ativo_id', ativoId)
        .order('data_registro', { ascending: true })
      setHistorico(data ?? [])
    },
    [supabase]
  )

  React.useEffect(() => {
    if (!selectedAtivoId || !orgId) return
    refreshHistorico(selectedAtivoId, orgId)
  }, [selectedAtivoId, orgId, refreshHistorico])

  // ── Derived metrics ────────────────────────────────────────
  const primeiroRegistro = historico[0]
  const ultimoRegistro = historico[historico.length - 1]

  const valorizacaoTotal =
    primeiroRegistro && ultimoRegistro && primeiroRegistro.preco > 0
      ? ((ultimoRegistro.preco - primeiroRegistro.preco) / primeiroRegistro.preco) * 100
      : null

  const anos =
    primeiroRegistro && ultimoRegistro
      ? calcAnos(primeiroRegistro.data_registro, ultimoRegistro.data_registro)
      : 0

  const valorizacaoAnual =
    primeiroRegistro && ultimoRegistro && anos > 0
      ? calcValorizacaoAnual(primeiroRegistro.preco, ultimoRegistro.preco, anos)
      : null

  // ── Chart data ─────────────────────────────────────────────
  const chartData = historico.map((h) => ({
    data: formatDate(h.data_registro),
    preco: h.preco,
  }))

  // ── Save handler ───────────────────────────────────────────
  async function handleSave() {
    if (!formAtivoId || !formData || !formPreco) return
    setSaving(true)
    setSaveError(null)
    const result = await inserirHistoricoPreco({
      orgSlug,
      ativo_id: formAtivoId,
      preco: parseFloat(formPreco),
      data_registro: formData,
    })
    setSaving(false)
    if (result?.error) {
      setSaveError(result.error)
      return
    }
    setSheetOpen(false)
    setFormPreco('')
    setFormData('')
    // Refresh se ativo do form == ativo selecionado
    if (orgId) {
      if (formAtivoId === selectedAtivoId) {
        await refreshHistorico(selectedAtivoId, orgId)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="border-b border-border/50 bg-background px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-muted animate-pulse shrink-0" />
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-36 rounded bg-muted animate-pulse" />
              <div className="h-3 w-52 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="h-[300px] rounded-xl bg-muted animate-pulse" />
          <div className="rounded-lg border overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
                <div className="ml-auto h-3.5 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Histórico de Preço"
        description="Evolução do valor por ação ao longo do tempo"
        icon={LineChartIcon}
        iconGradient="from-emerald-400 to-green-600"
        actions={
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <PlusIcon />
            Novo preço
          </Button>
        }
      />

    <div className="p-6 space-y-6">

      {/* Seletor de ativo */}
      {ativos.length === 0 ? (
        <EmptyState message="Nenhuma ação cadastrada. Cadastre um ativo do tipo 'ação' primeiro." />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium whitespace-nowrap">Ativo:</label>
            <select
              value={selectedAtivoId}
              onChange={(e) => setSelectedAtivoId(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            >
              {ativos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo}
                  {a.nome_classe ? ` — ${a.nome_classe}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Último preço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSignIcon className="size-4" />
                  Último preço
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ultimoRegistro ? (
                  <>
                    <p className="text-2xl font-bold">{formatBRL(ultimoRegistro.preco)}</p>
                    <CardDescription className="mt-1">
                      em {formatDate(ultimoRegistro.data_registro)}
                    </CardDescription>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem registros</p>
                )}
              </CardContent>
            </Card>

            {/* Valorização total */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUpIcon className="size-4" />
                  Valorização total
                </CardTitle>
              </CardHeader>
              <CardContent>
                {valorizacaoTotal !== null ? (
                  <>
                    <p
                      className={`text-2xl font-bold ${valorizacaoTotal >= 0 ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {valorizacaoTotal >= 0 ? '+' : ''}
                      {valorizacaoTotal.toFixed(2)}%
                    </p>
                    <CardDescription className="mt-1">
                      desde {formatDate(primeiroRegistro!.data_registro)}
                    </CardDescription>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Dados insuficientes</p>
                )}
              </CardContent>
            </Card>

            {/* Valorização ao ano */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarIcon className="size-4" />
                  Valorização ao ano
                </CardTitle>
              </CardHeader>
              <CardContent>
                {valorizacaoAnual !== null ? (
                  <>
                    <p
                      className={`text-2xl font-bold ${valorizacaoAnual >= 0 ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {valorizacaoAnual >= 0 ? '+' : ''}
                      {valorizacaoAnual.toFixed(2)}% a.a.
                    </p>
                    <CardDescription className="mt-1">
                      {anos.toFixed(1)} anos de histórico
                    </CardDescription>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Dados insuficientes</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução histórica</CardTitle>
            </CardHeader>
            <CardContent>
              {historico.length < 2 ? (
                <EmptyState message="Adicione pelo menos 2 registros para visualizar o gráfico." />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="data"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v: number) => formatBRL(v)}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={96}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="preco"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                      activeDot={{ r: 5 }}
                    />
                    {ultimoRegistro && chartData.length > 0 && (
                      <ReferenceDot
                        x={chartData[chartData.length - 1].data}
                        y={ultimoRegistro.preco}
                        r={6}
                        fill="hsl(var(--primary))"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Sheet — Novo preço */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Novo preço</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4">
            {/* Ativo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Ativo</label>
              <select
                value={formAtivoId}
                onChange={(e) => setFormAtivoId(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              >
                {ativos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codigo}
                    {a.nome_classe ? ` — ${a.nome_classe}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Data */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Data do registro</label>
              <Input
                type="date"
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
              />
            </div>

            {/* Preço */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Preço (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formPreco}
                onChange={(e) => setFormPreco(e.target.value)}
              />
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formAtivoId || !formData || !formPreco}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
    </div>
  )
}
