'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PrinterIcon, PencilIcon, CheckIcon, XIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { atualizarLivro } from '@/app/actions/governanca'
import { getNaturezaConfig } from './types'
import type { LivroRow } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OperacaoDetalhe {
  id: string
  tipo_operacao: string
  quantidade: number
  data_operacao: string
  metadata: Record<string, unknown> | null
  motivo: string | null
  preco_unitario: number | null
  ativo: { codigo: string; especie: string | null } | null
  pessoa_origem: { nome_completo: string; cpf_cnpj: string | null } | null
  pessoa_destino: { nome_completo: string; cpf_cnpj: string | null } | null
}

interface Props {
  livro: LivroRow | null
  open: boolean
  onClose: () => void
  orgSlug: string
  onUpdated?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try { return format(new Date(iso + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return iso }
}

const OP_LABELS: Record<string, string> = {
  subscricao: 'Subscrição',
  conversao: 'Conversão',
  transferencia: 'Transferência',
  emissao: 'Emissão',
  cancelamento: 'Cancelamento',
  onus_constituicao: 'Ônus — Constituição',
  onus_extincao: 'Ônus — Extinção',
  bonificacao: 'Bonificação',
  desdobramento: 'Desdobramento',
  grupamento: 'Grupamento',
}

function opLabel(tipo: string, meta: Record<string, unknown> | null) {
  const orig = meta?.tipo_original as string | undefined
  return OP_LABELS[orig ?? tipo] ?? OP_LABELS[tipo] ?? tipo
}

// ─── Campo row ────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words">{value}</span>
    </div>
  )
}

// ─── Editable field ───────────────────────────────────────────────────────────

function EditableRow({
  label,
  value,
  type = 'text',
  placeholder,
  onSave,
}: {
  label: string
  value: string | null
  type?: 'text' | 'date'
  placeholder?: string
  onSave: (v: string | null) => Promise<void>
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value ?? '')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => { setDraft(value ?? '') }, [value])

  async function handleSave() {
    setSaving(true)
    await onSave(draft.trim() || null)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="grid grid-cols-[160px_1fr] gap-2 py-2 border-b border-border/40 last:border-0 items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <Input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="h-7 text-sm flex-1"
            autoFocus
          />
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            onClick={handleSave}
            disabled={saving}
          >
            <CheckIcon className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            onClick={() => { setEditing(false); setDraft(value ?? '') }}
            disabled={saving}
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 py-2 border-b border-border/40 last:border-0 group items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {value ? (type === 'date' ? fmtDate(value) : value) : <span className="text-muted-foreground italic">—</span>}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => setEditing(true)}
        >
          <PencilIcon className="size-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LivroDrawer({ livro, open, onClose, orgSlug, onUpdated }: Props) {
  const supabase = React.useMemo(() => createClient(), [])
  const [operacao, setOperacao] = React.useState<OperacaoDetalhe | null>(null)
  const [loadingOp, setLoadingOp] = React.useState(false)

  // Load linked operation when drawer opens
  React.useEffect(() => {
    if (!open || !livro?.operacao_id) { setOperacao(null); return }
    setLoadingOp(true)
    supabase
      .from('operacoes_ativos')
      .select(`
        id, tipo_operacao, quantidade, data_operacao, metadata, motivo, preco_unitario,
        ativo:ativos ( codigo, especie ),
        pessoa_origem:pessoas!operacoes_ativos_origem_id_fkey ( nome_completo, cpf_cnpj ),
        pessoa_destino:pessoas!operacoes_ativos_destino_id_fkey ( nome_completo, cpf_cnpj )
      `)
      .eq('id', livro.operacao_id)
      .single()
      .then(({ data }) => {
        if (data) {
          const ativo = Array.isArray(data.ativo) ? data.ativo[0] : data.ativo
          const origem = Array.isArray(data.pessoa_origem) ? data.pessoa_origem[0] : data.pessoa_origem
          const destino = Array.isArray(data.pessoa_destino) ? data.pessoa_destino[0] : data.pessoa_destino
          setOperacao({
            id: data.id,
            tipo_operacao: data.tipo_operacao,
            quantidade: data.quantidade,
            data_operacao: data.data_operacao,
            metadata: data.metadata as Record<string, unknown> | null,
            motivo: data.motivo ?? null,
            preco_unitario: data.preco_unitario ?? null,
            ativo: ativo ? { codigo: (ativo as { codigo: string; especie?: string | null }).codigo, especie: (ativo as { codigo: string; especie?: string | null }).especie ?? null } : null,
            pessoa_origem: origem ? { nome_completo: (origem as { nome_completo: string; cpf_cnpj?: string | null }).nome_completo, cpf_cnpj: (origem as { nome_completo: string; cpf_cnpj?: string | null }).cpf_cnpj ?? null } : null,
            pessoa_destino: destino ? { nome_completo: (destino as { nome_completo: string; cpf_cnpj?: string | null }).nome_completo, cpf_cnpj: (destino as { nome_completo: string; cpf_cnpj?: string | null }).cpf_cnpj ?? null } : null,
          })
        }
        setLoadingOp(false)
      })
  }, [open, livro?.operacao_id, supabase])

  if (!livro) return null

  const config = getNaturezaConfig(livro.natureza)
  const printUrl = config.printPath ? `/print/${orgSlug}/livro/${config.printPath}` : null

  async function saveField(field: string, value: string | null) {
    await atualizarLivro({ orgSlug, livro_id: livro!.id, [field]: value })
    onUpdated?.()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-base leading-snug">{livro.natureza}</SheetTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  #{livro.numero_ordem.toString().padStart(3, '0')}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={`text-xs ${config.badgeClass}`}
                >
                  {livro.formato === 'digital' ? 'Digital' : 'Físico'}
                </Badge>
                {livro.periodo_inicio && (
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(livro.periodo_inicio)}
                    {livro.periodo_fim && livro.periodo_fim !== livro.periodo_inicio
                      ? ` – ${fmtDate(livro.periodo_fim)}`
                      : ''}
                  </span>
                )}
              </div>
            </div>
            {printUrl && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => window.open(printUrl, '_blank')}
              >
                <PrinterIcon className="size-3.5" />
                Imprimir
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="livro" className="flex flex-col h-full">
            <TabsList className="px-5 border-b border-border rounded-none w-full h-auto pb-0 justify-start gap-0 bg-transparent">
              <TabsTrigger
                value="livro"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-2 px-3 text-xs bg-transparent"
              >
                Livro
              </TabsTrigger>
              {livro.operacao_id && (
                <TabsTrigger
                  value="operacao"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-2 px-3 text-xs bg-transparent"
                >
                  Operação vinculada
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tab: Livro */}
            <TabsContent value="livro" className="px-5 py-4 mt-0">
              <div className="space-y-0">
                <Row label="Natureza" value={livro.natureza} />
                <Row label="Nº de ordem" value={`#${livro.numero_ordem.toString().padStart(3, '0')}`} />
                <Row label="Órgão social" value={livro.orgao?.nome ?? null} />
                <EditableRow
                  label="Período início"
                  value={livro.periodo_inicio}
                  type="date"
                  onSave={(v) => saveField('periodo_inicio', v)}
                />
                <EditableRow
                  label="Período fim"
                  value={livro.periodo_fim}
                  type="date"
                  onSave={(v) => saveField('periodo_fim', v)}
                />
                <EditableRow
                  label="Data de autenticação"
                  value={livro.data_autenticacao}
                  type="date"
                  onSave={(v) => saveField('data_autenticacao', v)}
                />
                <EditableRow
                  label="Órgão autenticador"
                  value={livro.orgao_autenticador}
                  placeholder="Ex.: Junta Comercial de SP"
                  onSave={(v) => saveField('orgao_autenticador', v)}
                />
              </div>

              {livro.orgao_autenticador && (
                <div className="mt-4 rounded-md bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Conteúdo / referência
                  </p>
                  <p className="text-sm">{livro.orgao_autenticador}</p>
                </div>
              )}
            </TabsContent>

            {/* Tab: Operação vinculada */}
            {livro.operacao_id && (
              <TabsContent value="operacao" className="px-5 py-4 mt-0">
                {loadingOp ? (
                  <p className="text-sm text-muted-foreground">Carregando operação…</p>
                ) : operacao ? (
                  <div className="space-y-0">
                    <Row
                      label="Data e hora"
                      value={format(new Date(operacao.data_operacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    />
                    <Row label="Tipo" value={opLabel(operacao.tipo_operacao, operacao.metadata)} />
                    <Row
                      label="Ativo"
                      value={
                        operacao.ativo
                          ? `${operacao.ativo.codigo}${operacao.ativo.especie ? ` (${operacao.ativo.especie})` : ''}`
                          : null
                      }
                    />
                    <Row
                      label="Quantidade"
                      value={Number(operacao.quantidade).toLocaleString('pt-BR')}
                    />
                    {operacao.pessoa_origem && (
                      <Row
                        label="Origem"
                        value={`${operacao.pessoa_origem.nome_completo}${operacao.pessoa_origem.cpf_cnpj ? ` — ${operacao.pessoa_origem.cpf_cnpj}` : ''}`}
                      />
                    )}
                    {operacao.pessoa_destino && (
                      <Row
                        label="Destino"
                        value={`${operacao.pessoa_destino.nome_completo}${operacao.pessoa_destino.cpf_cnpj ? ` — ${operacao.pessoa_destino.cpf_cnpj}` : ''}`}
                      />
                    )}
                    {operacao.preco_unitario != null && (
                      <Row
                        label="Preço unitário"
                        value={Number(operacao.preco_unitario).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      />
                    )}
                    {operacao.motivo && <Row label="Motivo" value={operacao.motivo} />}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Operação não encontrada
                  </p>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
