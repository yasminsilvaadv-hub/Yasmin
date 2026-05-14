'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SearchIcon, DownloadIcon, SlidersHorizontalIcon, ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { OperacaoDrawer } from './operacao-drawer'
import { NovaOperacaoSheet } from './nova-operacao-sheet'
import type { OperacaoRow, AtivoSimples, PessoaSimples, TipoOperacao } from './types'
import { tipoLabel, tipoBadgeClass, TIPOS_OPERACAO } from './utils'
import { cn } from '@/lib/utils'

interface Props {
  operacoes: OperacaoRow[]
  ativos: AtivoSimples[]
  pessoas: PessoaSimples[]
  orgSlug: string
}

function TipoBadge({ tipo, metadata }: { tipo: TipoOperacao; metadata?: Record<string, unknown> | null }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tipoBadgeClass(tipo, metadata)
      )}
    >
      {tipoLabel(tipo, metadata)}
    </span>
  )
}

function AtivoBadge({ ativo }: { ativo: OperacaoRow['ativo'] }) {
  if (!ativo) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono font-semibold text-foreground">
        {ativo.codigo}
      </span>
      {ativo.especie && (
        <span className="text-xs text-muted-foreground">{ativo.especie}</span>
      )}
    </span>
  )
}

function exportCSV(operacoes: OperacaoRow[]) {
  const header = ['Data e hora', 'Ativo', 'Tipo', 'Origem', 'Destino', 'Quantidade']
  const rows = operacoes.map((op) => [
    format(new Date(op.data_operacao), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    op.ativo ? `${op.ativo.codigo}${op.ativo.especie ? ` (${op.ativo.especie})` : ''}` : '',
    tipoLabel(op.tipo_operacao, op.metadata),
    op.pessoa_origem?.nome ?? '',
    op.pessoa_destino?.nome ?? '',
    String(op.quantidade),
  ])
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'operacoes.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function OperacoesTabela({ operacoes, ativos, pessoas, orgSlug }: Props) {
  const [busca, setBusca] = React.useState('')
  const [selectedOp, setSelectedOp] = React.useState<OperacaoRow | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [tipoNova, setTipoNova] = React.useState<TipoOperacao>('emissao')

  const filtradas = React.useMemo(() => {
    if (!busca.trim()) return operacoes
    const q = busca.toLowerCase()
    return operacoes.filter((op) => {
      const codigo = op.ativo?.codigo?.toLowerCase() ?? ''
      const especie = op.ativo?.especie?.toLowerCase() ?? ''
      const tipo = tipoLabel(op.tipo_operacao, op.metadata).toLowerCase()
      const origem = op.pessoa_origem?.nome?.toLowerCase() ?? ''
      const destino = op.pessoa_destino?.nome?.toLowerCase() ?? ''
      return (
        codigo.includes(q) ||
        especie.includes(q) ||
        tipo.includes(q) ||
        origem.includes(q) ||
        destino.includes(q)
      )
    })
  }, [operacoes, busca])

  function handleRowClick(op: OperacaoRow) {
    setSelectedOp(op)
    setDrawerOpen(true)
  }

  function handleNovaOperacao(tipo: TipoOperacao) {
    setTipoNova(tipo)
    setFormOpen(true)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar operação…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>

        <Button variant="outline" size="default">
          <SlidersHorizontalIcon />
          Filtros
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => exportCSV(filtradas)}
          title="Exportar CSV"
        >
          <DownloadIcon />
          <span className="sr-only">Exportar CSV</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Nova operação
                <ChevronDownIcon className="size-4" />
              </button>
            }
          >
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {TIPOS_OPERACAO.map((t) => (
              <DropdownMenuItem key={t.value} onClick={() => handleNovaOperacao(t.value)}>
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-border mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {['Data e hora', 'Ativo', 'Tipo', 'Origem', 'Destino', 'Quantidade'].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  Nenhuma operação encontrada
                </td>
              </tr>
            ) : (
              filtradas.map((op) => (
                <tr
                  key={op.id}
                  className="border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => handleRowClick(op)}
                >
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground text-xs">
                    {format(new Date(op.data_operacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </td>
                  <td className="px-3 py-2.5">
                    <AtivoBadge ativo={op.ativo} />
                  </td>
                  <td className="px-3 py-2.5">
                    <TipoBadge tipo={op.tipo_operacao} metadata={op.metadata} />
                  </td>
                  <td className="px-3 py-2.5 text-sm">
                    {op.pessoa_origem?.nome ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-sm">
                    {op.pessoa_destino?.nome ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-right">
                    {Number(op.quantidade).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer de detalhes */}
      <OperacaoDrawer
        operacao={selectedOp}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Sheet de nova operação */}
      <NovaOperacaoSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        tipoInicial={tipoNova}
        orgSlug={orgSlug}
        ativos={ativos}
        pessoas={pessoas}
      />
    </>
  )
}
