'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, CopyIcon, CheckIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AcionistaRow {
  titular_id: string | null
  nome: string
  cpf_cnpj: string | null
  participacoes: { codigo: string; especie: string | null; quantidade: number }[]
  total: number
  percentual: number
}

interface Props {
  acionistas: AcionistaRow[]
  totalAcoes: number
  orgSlug: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

function fmtPct(n: number) {
  return n.toFixed(4).replace('.', ',') + '%'
}

function fmtCpfCnpj(v: string | null): string {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return v
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function QuadroAcionistas({ acionistas, totalAcoes, orgSlug }: Props) {
  const [copied, setCopied] = React.useState(false)

  // All unique ativo codes that appear (sorted: ON first, then others)
  const codigos = React.useMemo(() => {
    const set = new Set(acionistas.flatMap((a) => a.participacoes.map((p) => p.codigo)))
    return Array.from(set).sort((a, b) => {
      if (a.includes('ON')) return -1
      if (b.includes('ON')) return 1
      return a.localeCompare(b)
    })
  }, [acionistas])

  function buildTextTable(): string {
    const header = ['Acionista', 'CPF/CNPJ', ...codigos, 'Total', '%'].join('\t')
    const rows = acionistas.map((a) => [
      a.nome,
      a.cpf_cnpj ? fmtCpfCnpj(a.cpf_cnpj) : '—',
      ...codigos.map((c) => {
        const p = a.participacoes.find((p) => p.codigo === c)
        return p ? p.quantidade.toString() : '0'
      }),
      a.total.toString(),
      fmtPct(a.percentual),
    ].join('\t'))
    const totais = [
      'TOTAL', '—',
      ...codigos.map((c) =>
        acionistas.reduce((s, a) => {
          const p = a.participacoes.find((p) => p.codigo === c)
          return s + (p?.quantidade ?? 0)
        }, 0).toString()
      ),
      totalAcoes.toString(),
      '100,0000%',
    ].join('\t')
    return [header, ...rows, totais].join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildTextTable()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Quadro de Acionistas</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Posição atual · {acionistas.length} acionista{acionistas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs h-7"
          >
            {copied ? (
              <>
                <CheckIcon className="size-3 text-green-600" />
                Copiado!
              </>
            ) : (
              <>
                <CopyIcon className="size-3" />
                Copiar tabela
              </>
            )}
          </Button>
          <Link
            href={`/${orgSlug}/cap-table`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Cap Table
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Acionista
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  CPF / CNPJ
                </th>
                {codigos.map((c) => (
                  <th
                    key={c}
                    className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Total
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {acionistas.map((a, i) => (
                <tr
                  key={a.titular_id ?? `anon-${i}`}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium">{a.nome}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {fmtCpfCnpj(a.cpf_cnpj)}
                  </td>
                  {codigos.map((c) => {
                    const p = a.participacoes.find((p) => p.codigo === c)
                    return (
                      <td key={c} className="px-3 py-2.5 text-right tabular-nums text-xs">
                        {p ? fmt(p.quantidade) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {fmt(a.total)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-xs">
                    {fmtPct(a.percentual)}
                  </td>
                </tr>
              ))}

              {/* Total row */}
              <tr className="bg-muted/40 font-semibold border-t-2 border-border">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5" />
                {codigos.map((c) => {
                  const subtotal = acionistas.reduce((s, a) => {
                    const p = a.participacoes.find((p) => p.codigo === c)
                    return s + (p?.quantidade ?? 0)
                  }, 0)
                  return (
                    <td key={c} className="px-3 py-2.5 text-right tabular-nums text-xs">
                      {fmt(subtotal)}
                    </td>
                  )
                })}
                <td className="px-4 py-2.5 text-right tabular-nums">{fmt(totalAcoes)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-xs">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
