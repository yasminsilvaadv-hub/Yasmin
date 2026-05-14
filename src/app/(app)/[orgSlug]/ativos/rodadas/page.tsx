'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { PlusIcon, TrendingUpIcon, RocketIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { inserirRodada, editarRodada, excluirRodada } from '@/app/actions/ativos'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rodada {
  id: string
  nome: string
  data: string
  valuation_pre: number | null
  valuation_pos: number | null
  valor_captado: number | null
  preco_por_acao: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(n: number | null) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function numOrNull(val: string): number | null {
  const parsed = parseFloat(val)
  return isNaN(parsed) ? null : parsed
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
      <TrendingUpIcon className="mb-3 size-10 opacity-25" />
      <p className="text-sm">Nenhuma rodada registrada.</p>
      <p className="text-xs mt-1">Clique em Nova rodada para começar.</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RodasPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug
  const supabase = React.useMemo(() => createClient(), [])

  const [orgId, setOrgId] = React.useState<string | null>(null)
  const [rodadas, setRodadas] = React.useState<Rodada[]>([])
  const [loading, setLoading] = React.useState(true)

  // Sheet state
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingRodada, setEditingRodada] = React.useState<Rodada | null>(null)
  const [formNome, setFormNome] = React.useState('')
  const [formData, setFormData] = React.useState('')
  const [formValuationPre, setFormValuationPre] = React.useState('')
  const [formValuationPos, setFormValuationPos] = React.useState('')
  const [formValorCaptado, setFormValorCaptado] = React.useState('')
  const [formPrecoPorAcao, setFormPrecoPorAcao] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState<string | null>(null)

  // ── Bootstrap ──────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await fetchRodadas(org.id)
      setLoading(false)
    }
    bootstrap()
  }, [orgSlug, supabase])

  async function fetchRodadas(currentOrgId: string) {
    const { data } = await supabase
      .from('rodadas_investimento')
      .select('id, nome, data, valuation_pre, valuation_pos, valor_captado, preco_por_acao')
      .eq('organizacao_id', currentOrgId)
      .order('data', { ascending: false })
    setRodadas(data ?? [])
  }

  function resetForm() {
    setFormNome('')
    setFormData('')
    setFormValuationPre('')
    setFormValuationPos('')
    setFormValorCaptado('')
    setFormPrecoPorAcao('')
    setSaveError(null)
    setEditingRodada(null)
  }

  function openCreate() {
    resetForm()
    setSheetOpen(true)
  }

  function openEdit(r: Rodada) {
    setEditingRodada(r)
    setFormNome(r.nome)
    setFormData(r.data)
    setFormValuationPre(r.valuation_pre?.toString() ?? '')
    setFormValuationPos(r.valuation_pos?.toString() ?? '')
    setFormValorCaptado(r.valor_captado?.toString() ?? '')
    setFormPrecoPorAcao(r.preco_por_acao?.toString() ?? '')
    setSaveError(null)
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!formNome || !formData) return
    setSaving(true)
    setSaveError(null)

    let result: { error?: string; ok?: boolean }
    if (editingRodada) {
      result = await editarRodada({
        orgSlug,
        id: editingRodada.id,
        nome: formNome,
        data: formData,
        valuation_pre: numOrNull(formValuationPre),
        valuation_pos: numOrNull(formValuationPos),
        valor_captado: numOrNull(formValorCaptado),
        preco_por_acao: numOrNull(formPrecoPorAcao),
      })
    } else {
      result = await inserirRodada({
        orgSlug,
        nome: formNome,
        data: formData,
        valuation_pre: numOrNull(formValuationPre),
        valuation_pos: numOrNull(formValuationPos),
        valor_captado: numOrNull(formValorCaptado),
        preco_por_acao: numOrNull(formPrecoPorAcao),
      })
    }

    setSaving(false)

    if (result?.error) {
      setSaveError(result.error)
      return
    }

    setSheetOpen(false)
    resetForm()
    if (orgId) await fetchRodadas(orgId)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta rodada? Esta ação não pode ser desfeita.')) return
    setDeleting(id)
    await excluirRodada(orgSlug, id)
    setDeleting(null)
    if (orgId) await fetchRodadas(orgId)
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Rodadas de Investimento"
        description="Histórico de captações e valuations"
        icon={RocketIcon}
        iconGradient="from-orange-400 to-orange-600"
        actions={
          <Button size="sm" onClick={openCreate}>
            <PlusIcon />
            Nova rodada
          </Button>
        }
      />

    <div className="p-6 space-y-6">

      {/* Tabela */}
      {rodadas.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valuation Pré (R$)</TableHead>
                <TableHead className="text-right">Valuation Pós (R$)</TableHead>
                <TableHead className="text-right">Valor captado (R$)</TableHead>
                <TableHead className="text-right">Preço por ação (R$)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rodadas.map((r) => (
                <TableRow key={r.id} className={deleting === r.id ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell>{formatDate(r.data)}</TableCell>
                  <TableCell className="text-right">{formatBRL(r.valuation_pre)}</TableCell>
                  <TableCell className="text-right">{formatBRL(r.valuation_pos)}</TableCell>
                  <TableCell className="text-right">{formatBRL(r.valor_captado)}</TableCell>
                  <TableCell className="text-right">{formatBRL(r.preco_por_acao)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}>
                          <PencilIcon className="size-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2Icon className="size-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sheet — criar/editar rodada */}
      <Sheet open={sheetOpen} onOpenChange={(v) => { if (!v) { setSheetOpen(false); resetForm() } }}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editingRodada ? 'Editar rodada' : 'Nova rodada'}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Nome <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ex.: Série A"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Data <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Valuation Pré (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formValuationPre}
                onChange={(e) => setFormValuationPre(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Valuation Pós (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formValuationPos}
                onChange={(e) => setFormValuationPos(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Valor captado (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formValorCaptado}
                onChange={(e) => setFormValorCaptado(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Preço por ação (R$)</label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.0000"
                value={formPrecoPorAcao}
                onChange={(e) => setFormPrecoPorAcao(e.target.value)}
              />
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => { setSheetOpen(false); resetForm() }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formNome || !formData}
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
