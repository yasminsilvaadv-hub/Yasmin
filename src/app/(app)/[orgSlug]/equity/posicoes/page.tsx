'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingUpIcon, TrendingDownIcon, ChevronDownIcon, ChevronUpIcon, UsersIcon } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContratoRaw {
  id: string
  sequencial: number
  status: string
  tipo: string
  quantidade_outorgada: number
  preco_exercicio_strike: number | null
  data_aprovacao: string | null
  beneficiario_id: string
  pessoas: { id: string; nome_completo: string } | null
  planos_equity: {
    id: string
    nome: string
    ativo_id: string
    ativos: { id: string; codigo: string; especie: string | null } | null
  } | null
}

interface PrecoItem {
  ativo_id: string
  preco: number
  data_registro: string
}

interface ContratoAgrupado {
  id: string
  sequencial: number
  status: string
  tipo: string
  quantidade: number
  strike: number | null
  data_aprovacao: string | null
  plano: string
  upside: number | null
  upsidePct: number | null
  precoAtual: number | null
}

interface PosicaoBeneficiario {
  pessoa_id: string
  nome: string
  contratos: ContratoAgrupado[]
  quantidadeTotal: number
  strikeMediaPonderada: number | null
  precoAtual: number | null
  upsideTotal: number | null
  upsidePctMedio: number | null
  ativo_id: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

const tipoLabel: Record<string, string> = {
  stock_options: 'Stock Options',
  rsu: 'RSU',
  phantom: 'Phantom',
  sar: 'SAR',
  partnership: 'Partnership',
}

const statusLabel: Record<string, string> = {
  rascunho: 'Rascunho',
  em_assinatura: 'Em assinatura',
  ativo: 'Ativo',
  cancelado: 'Cancelado',
}

const statusClass: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  em_assinatura: 'bg-blue-100 text-blue-700',
  ativo: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function MiniChart({ historico, strike, precoAtual }: {
  historico: PrecoItem[]
  strike: number | null
  precoAtual: number | null
}) {
  if (historico.length < 2) {
    return (
      <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">
        Sem histórico de preço suficiente
      </div>
    )
  }

  const data = historico.map(h => ({
    data: new Date(h.data_registro + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    preco: h.preco,
  }))

  const isGreen = precoAtual != null && strike != null ? precoAtual >= strike : true

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
        <XAxis
          dataKey="data"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `R$${v}`}
          width={52}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [formatBRL(Number(v)), 'Preço']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
        />
        {strike != null && (
          <ReferenceLine
            y={strike}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 2"
            label={{ value: `Strike ${formatBRL(strike)}`, position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="preco"
          stroke={isGreen ? '#22c55e' : '#ef4444'}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function CardPosicao({ posicao, historico }: { posicao: PosicaoBeneficiario; historico: PrecoItem[] }) {
  const [aberto, setAberto] = React.useState(false)

  const upside = posicao.upsideTotal
  const upsidePct = posicao.upsidePctMedio
  const emAlta = upside != null && upside >= 0
  const inicial = posicao.nome.charAt(0).toUpperCase()

  const histFiltrado = posicao.ativo_id
    ? historico.filter(h => h.ativo_id === posicao.ativo_id)
    : []

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden bg-background">
      {/* ── Linha principal ── */}
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
      >
        {/* Avatar */}
        <div className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold select-none',
          emAlta ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        )}>
          {inicial}
        </div>

        {/* Nome */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-foreground truncate">{posicao.nome}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {posicao.contratos.length} contrato{posicao.contratos.length !== 1 ? 's' : ''} ·{' '}
            {posicao.quantidadeTotal.toLocaleString('pt-BR')} opções
          </p>
        </div>

        {/* Strike médio */}
        <div className="hidden sm:block text-right shrink-0 w-28">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Strike médio</p>
          <p className="text-sm font-semibold text-foreground">
            {posicao.strikeMediaPonderada != null ? formatBRL(posicao.strikeMediaPonderada) : '—'}
          </p>
        </div>

        {/* Preço atual */}
        <div className="hidden sm:block text-right shrink-0 w-28">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Preço atual</p>
          <p className="text-sm font-semibold text-foreground">
            {posicao.precoAtual != null ? formatBRL(posicao.precoAtual) : '—'}
          </p>
        </div>

        {/* Upside */}
        <div className="text-right shrink-0 w-36">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Upside total</p>
          {upside != null ? (
            <div className={cn('flex items-center justify-end gap-1', emAlta ? 'text-emerald-600' : 'text-red-500')}>
              {emAlta
                ? <TrendingUpIcon className="size-3.5 shrink-0" />
                : <TrendingDownIcon className="size-3.5 shrink-0" />
              }
              <span className="text-sm font-bold">{formatBRL(upside)}</span>
              {upsidePct != null && (
                <span className="text-xs font-medium">({formatPct(upsidePct)})</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-muted-foreground ml-1">
          {aberto ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
        </div>
      </button>

      {/* ── Detalhe expandido ── */}
      {aberto && (
        <div className="border-t border-border/50 bg-muted/20 px-5 py-4 space-y-4">
          {/* Gráfico de preço */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Evolução do preço da ação
            </p>
            <MiniChart
              historico={histFiltrado}
              strike={posicao.strikeMediaPonderada}
              precoAtual={posicao.precoAtual}
            />
          </div>

          {/* Tabela de contratos */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Contratos
            </p>
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qtd</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Strike</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preço atual</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upside</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {posicao.contratos.map(c => (
                    <tr key={c.id} className="border-b border-border/30 last:border-0">
                      <td className="px-3 py-2.5 text-sm text-foreground">{c.plano}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {tipoLabel[c.tipo] ?? c.tipo}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-foreground tabular-nums">
                        {c.quantidade.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-foreground tabular-nums">
                        {c.strike != null ? formatBRL(c.strike) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right text-foreground tabular-nums">
                        {c.precoAtual != null ? formatBRL(c.precoAtual) : '—'}
                      </td>
                      <td className={cn(
                        'px-3 py-2.5 text-sm text-right font-semibold tabular-nums',
                        c.upside == null ? 'text-muted-foreground' :
                        c.upside >= 0 ? 'text-emerald-600' : 'text-red-500'
                      )}>
                        {c.upside != null ? (
                          <>
                            {formatBRL(c.upside)}
                            {c.upsidePct != null && (
                              <span className="ml-1 text-xs font-normal">({formatPct(c.upsidePct)})</span>
                            )}
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', statusClass[c.status] ?? 'bg-gray-100 text-gray-700')}>
                          {statusLabel[c.status] ?? c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumo no mobile */}
          <div className="flex sm:hidden gap-6 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Strike médio</p>
              <p className="font-semibold">{posicao.strikeMediaPonderada != null ? formatBRL(posicao.strikeMediaPonderada) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Preço atual</p>
              <p className="font-semibold">{posicao.precoAtual != null ? formatBRL(posicao.precoAtual) : '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PosicoesPage() {
  const params = useParams()
  const orgSlug = params.orgSlug as string

  const [posicoes, setPosicoes] = React.useState<PosicaoBeneficiario[]>([])
  const [historico, setHistorico] = React.useState<PrecoItem[]>([])
  const [ultimoPreco, setUltimoPreco] = React.useState<{ preco: number; data: string } | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      // 1. Busca org
      const { data: org } = await supabase
        .from('organizacoes')
        .select('id')
        .eq('slug', orgSlug)
        .single()

      if (!org) { setLoading(false); return }

      // 2. Busca contratos ativos com beneficiário e plano
      const { data: contratos } = await supabase
        .from('contratos_equity')
        .select(`
          id, sequencial, status, tipo,
          quantidade_outorgada, preco_exercicio_strike, data_aprovacao,
          beneficiario_id,
          pessoas ( id, nome_completo ),
          planos_equity!inner (
            id, nome, ativo_id,
            ativos ( id, codigo, especie )
          )
        `)
        .eq('organizacao_id', org.id)
        .in('status', ['ativo', 'em_assinatura', 'rascunho'])
        .order('beneficiario_id')

      // 3. Coleta ativo_ids únicos
      const ativoIdsSet = new Set<string>()
      for (const c of (contratos ?? [])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aid = (c.planos_equity as any)?.ativo_id as string | undefined
        if (aid) ativoIdsSet.add(aid)
      }
      const ativoIds = Array.from(ativoIdsSet)

      // 4. Busca histórico de preço para todos os ativos relevantes
      let hist: PrecoItem[] = []
      let ultimo: { preco: number; data: string } | null = null

      if (ativoIds.length > 0) {
        const { data: h } = await supabase
          .from('historico_preco_acao')
          .select('ativo_id, preco, data_registro')
          .eq('organizacao_id', org.id)
          .in('ativo_id', ativoIds)
          .order('data_registro', { ascending: true })

        hist = (h ?? []) as PrecoItem[]

        // Último preço (qualquer ativo)
        if (hist.length > 0) {
          const last = hist[hist.length - 1]
          ultimo = { preco: last.preco, data: last.data_registro }
        }
      }

      setHistorico(hist)
      setUltimoPreco(ultimo)

      // 5. Agrupa por beneficiário
      const mapaPrecoAtual: Record<string, number> = {}
      for (const h of hist) {
        mapaPrecoAtual[h.ativo_id] = h.preco // sobrescreve com o mais recente (já ordenado asc)
      }

      const mapaBenef: Record<string, PosicaoBeneficiario> = {}

      for (const c of (contratos ?? []) as unknown as ContratoRaw[]) {
        const pessoaId = c.beneficiario_id
        const nome = c.pessoas?.nome_completo ?? 'Desconhecido'
        const ativo_id = c.planos_equity?.ativo_id ?? null
        const precoAtual = ativo_id ? (mapaPrecoAtual[ativo_id] ?? null) : null
        const strike = c.preco_exercicio_strike

        const upside = precoAtual != null && strike != null
          ? (precoAtual - strike) * c.quantidade_outorgada
          : null
        const upsidePct = precoAtual != null && strike != null && strike > 0
          ? ((precoAtual - strike) / strike) * 100
          : null

        const contratoAgrupado: ContratoAgrupado = {
          id: c.id,
          sequencial: c.sequencial,
          status: c.status,
          tipo: c.tipo,
          quantidade: c.quantidade_outorgada,
          strike,
          data_aprovacao: c.data_aprovacao,
          plano: c.planos_equity?.nome ?? '—',
          precoAtual,
          upside,
          upsidePct,
        }

        if (!mapaBenef[pessoaId]) {
          mapaBenef[pessoaId] = {
            pessoa_id: pessoaId,
            nome,
            contratos: [],
            quantidadeTotal: 0,
            strikeMediaPonderada: null,
            precoAtual,
            upsideTotal: null,
            upsidePctMedio: null,
            ativo_id,
          }
        }

        mapaBenef[pessoaId].contratos.push(contratoAgrupado)
        mapaBenef[pessoaId].quantidadeTotal += c.quantidade_outorgada

        if (upside != null) {
          mapaBenef[pessoaId].upsideTotal = (mapaBenef[pessoaId].upsideTotal ?? 0) + upside
        }
      }

      // Calcula strike médio ponderado por pessoa
      for (const p of Object.values(mapaBenef)) {
        let sumStrikeQtd = 0
        let sumQtd = 0
        for (const c of p.contratos) {
          if (c.strike != null) {
            sumStrikeQtd += c.strike * c.quantidade
            sumQtd += c.quantidade
          }
        }
        if (sumQtd > 0) {
          p.strikeMediaPonderada = sumStrikeQtd / sumQtd
        }

        if (p.strikeMediaPonderada != null && p.precoAtual != null && p.strikeMediaPonderada > 0) {
          p.upsidePctMedio = ((p.precoAtual - p.strikeMediaPonderada) / p.strikeMediaPonderada) * 100
        }
      }

      // Ordena por upside total decrescente
      const sorted = Object.values(mapaBenef).sort((a, b) => (b.upsideTotal ?? -Infinity) - (a.upsideTotal ?? -Infinity))
      setPosicoes(sorted)
      setLoading(false)
    }

    load()
  }, [orgSlug])

  // ── Totais ──────────────────────────────────────────────────────────────────
  const upsideGlobal = posicoes.reduce((acc, p) => acc + (p.upsideTotal ?? 0), 0)
  const qtdGlobal    = posicoes.reduce((acc, p) => acc + p.quantidadeTotal, 0)

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Posições por Beneficiário"
        description="Preço da ação vs. posição de cada stakeholder com equity plan"
        icon={TrendingUpIcon}
        iconGradient="from-emerald-400 to-emerald-600"
      />

      <div className="p-6 space-y-5">

        {/* ── Cards de resumo ── */}
        {!loading && posicoes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Preço atual */}
            <div className="border border-border/60 rounded-xl px-4 py-3 bg-background">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Preço atual da ação</p>
              <p className="text-xl font-bold text-foreground mt-0.5">
                {ultimoPreco ? formatBRL(ultimoPreco.preco) : '—'}
              </p>
              {ultimoPreco && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Atualizado em {formatDate(ultimoPreco.data)}
                </p>
              )}
            </div>

            {/* Beneficiários */}
            <div className="border border-border/60 rounded-xl px-4 py-3 bg-background">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Beneficiários</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{posicoes.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">com contratos ativos</p>
            </div>

            {/* Total de opções */}
            <div className="border border-border/60 rounded-xl px-4 py-3 bg-background">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total de opções</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{qtdGlobal.toLocaleString('pt-BR')}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">outorgadas</p>
            </div>

            {/* Upside total */}
            <div className="border border-border/60 rounded-xl px-4 py-3 bg-background">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Upside total</p>
              <p className={cn(
                'text-xl font-bold mt-0.5',
                upsideGlobal >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {formatBRL(upsideGlobal)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {upsideGlobal >= 0 ? 'acima do strike' : 'abaixo do strike'}
              </p>
            </div>
          </div>
        )}

        {/* ── Lista de posições ── */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-border/60 rounded-xl px-5 py-4 flex items-center gap-4">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-24 hidden sm:block" />
                <Skeleton className="h-5 w-24 hidden sm:block" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </div>
        ) : posicoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center border border-border/60 rounded-xl">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <UsersIcon className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Nenhuma posição encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie contratos de equity com status &quot;Ativo&quot; ou &quot;Em assinatura&quot; para visualizar as posições.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {posicoes.map(p => (
              <CardPosicao key={p.pessoa_id} posicao={p} historico={historico} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
