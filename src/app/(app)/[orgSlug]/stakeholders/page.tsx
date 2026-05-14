'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { SearchIcon, PlusIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { criarPessoa, atualizarPessoa, excluirPessoa } from '@/app/actions/stakeholders'
import type { PessoaPayload } from '@/app/actions/stakeholders'
import type { TipoPessoa } from '@/lib/supabase/types'
import { ImportPlanilha } from '@/components/stakeholders/import-planilha'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Pessoa {
  id: string
  nome_completo: string
  cpf_cnpj: string | null
  tipo: TipoPessoa
  estado_civil: string | null
  profissao: string | null
  data_nascimento: string | null
  nacionalidade: string | null
  email_principal: string | null
  telefone_principal: string | null
  anotacoes: string | null
  created_at: string
}

interface Participacao {
  ativo_id: string
  codigo: string
  especie: string | null
  quantidade: number
  total_ativo: number
}

interface ContratoEquity {
  id: string
  sequencial: number
  tipo: string
  plano_nome: string | null
  quantidade_outorgada: number
  status: string
  data_aprovacao: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const ESTADO_CIVIL_OPTS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União estável' },
]

const TIPO_EQUITY_LABEL: Record<string, string> = {
  stock_options: 'Stock Options',
  rsu: 'RSU',
  phantom: 'Phantom',
  sar: 'SAR',
  partnership: 'Partnership',
}

const STATUS_CONTRATO_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  em_assinatura: 'Em assinatura',
  ativo: 'Ativo',
  cancelado: 'Cancelado',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Campo({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function TipoBadge({ tipo }: { tipo: TipoPessoa }) {
  const isPF = tipo === 'pessoa_fisica'
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        isPF
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      ].join(' ')}
    >
      {isPF ? 'PF' : 'PJ'}
    </span>
  )
}

// ─── Formulário (novo / editar) ───────────────────────────────────────────────

interface FormSheetProps {
  open: boolean
  onClose: () => void
  orgSlug: string
  pessoa?: Pessoa | null
  onSaved: () => void
}

function FormSheet({ open, onClose, orgSlug, pessoa, onSaved }: FormSheetProps) {
  const isEdit = !!pessoa
  const [tipo, setTipo] = React.useState<TipoPessoa>(pessoa?.tipo ?? 'pessoa_fisica')
  const [loading, setLoading] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)

  // Sync tipo when editing a different person
  React.useEffect(() => {
    if (pessoa) setTipo(pessoa.tipo)
    else setTipo('pessoa_fisica')
  }, [pessoa, open])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const get = (k: string) => (fd.get(k) as string | null) || null

    const nomeCompleto = get('nome_completo')
    if (!nomeCompleto) {
      setErro('Nome completo é obrigatório.')
      setLoading(false)
      return
    }

    const payload: PessoaPayload = {
      nome_completo: nomeCompleto,
      cpf_cnpj: get('cpf_cnpj'),
      tipo,
      estado_civil: tipo === 'pessoa_fisica' ? get('estado_civil') : null,
      profissao: tipo === 'pessoa_fisica' ? get('profissao') : null,
      data_nascimento: tipo === 'pessoa_fisica' ? get('data_nascimento') : null,
      nacionalidade: tipo === 'pessoa_fisica' ? (get('nacionalidade') ?? 'Brasileira') : null,
      email_principal: get('email_principal'),
      telefone_principal: get('telefone_principal'),
      anotacoes: get('anotacoes'),
    }

    const result = isEdit && pessoa
      ? await atualizarPessoa(pessoa.id, orgSlug, payload)
      : await criarPessoa(orgSlug, payload)

    setLoading(false)

    if (result.error) {
      setErro(result.error)
    } else {
      onSaved()
      onClose()
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle>{isEdit ? 'Editar stakeholder' : 'Novo stakeholder'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* ── 1. Informações principais ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Informações principais
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="nome_completo">Nome completo *</Label>
                <Input
                  id="nome_completo"
                  name="nome_completo"
                  required
                  defaultValue={pessoa?.nome_completo ?? ''}
                  placeholder="Nome completo ou razão social"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpf_cnpj">CPF / CNPJ</Label>
                <Input
                  id="cpf_cnpj"
                  name="cpf_cnpj"
                  defaultValue={pessoa?.cpf_cnpj ?? ''}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  name="tipo"
                  className={selectClass}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoPessoa)}
                >
                  <option value="pessoa_fisica">Pessoa Física</option>
                  <option value="pessoa_juridica">Pessoa Jurídica</option>
                </select>
              </div>
            </div>

            {/* ── 2. Dados pessoais (só PF) ── */}
            {tipo === 'pessoa_fisica' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dados pessoais
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="estado_civil">Estado civil</Label>
                  <select
                    id="estado_civil"
                    name="estado_civil"
                    className={selectClass}
                    defaultValue={pessoa?.estado_civil ?? ''}
                  >
                    <option value="">Selecione…</option>
                    {ESTADO_CIVIL_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profissao">Profissão</Label>
                  <Input
                    id="profissao"
                    name="profissao"
                    defaultValue={pessoa?.profissao ?? ''}
                    placeholder="Ex: Engenheiro(a)"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="data_nascimento">Data de nascimento</Label>
                  <Input
                    type="date"
                    id="data_nascimento"
                    name="data_nascimento"
                    defaultValue={pessoa?.data_nascimento ?? ''}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nacionalidade">Nacionalidade</Label>
                  <Input
                    id="nacionalidade"
                    name="nacionalidade"
                    defaultValue={pessoa?.nacionalidade ?? 'Brasileira'}
                    placeholder="Brasileira"
                  />
                </div>
              </div>
            )}

            {/* ── 3. Contato ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contato
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="email_principal">E-mail</Label>
                <Input
                  type="email"
                  id="email_principal"
                  name="email_principal"
                  defaultValue={pessoa?.email_principal ?? ''}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefone_principal">Telefone</Label>
                <Input
                  id="telefone_principal"
                  name="telefone_principal"
                  defaultValue={pessoa?.telefone_principal ?? ''}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            {/* ── 4. Anotações ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Anotações
              </p>
              <textarea
                id="anotacoes"
                name="anotacoes"
                rows={4}
                defaultValue={pessoa?.anotacoes ?? ''}
                placeholder="Observações internas…"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>

          <SheetFooter className="border-t border-border px-5 py-3 flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar stakeholder'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Drawer de detalhes ───────────────────────────────────────────────────────

interface DetailDrawerProps {
  pessoa: Pessoa | null
  open: boolean
  onClose: () => void
  orgSlug: string
  onEdit: (p: Pessoa) => void
  onDeleted: () => void
}

function DetailDrawer({ pessoa, open, onClose, orgSlug, onEdit, onDeleted }: DetailDrawerProps) {
  const [participacoes, setParticipacoes] = React.useState<Participacao[]>([])
  const [contratos, setContratos] = React.useState<ContratoEquity[]>([])
  const [loadingTabs, setLoadingTabs] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('info')
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    if (!pessoa || !open) return
    setActiveTab('info')
  }, [pessoa, open])

  React.useEffect(() => {
    if (!pessoa || !open) return
    if (activeTab !== 'participacoes' && activeTab !== 'contratos') return

    setLoadingTabs(true)
    const supabase = createClient()

    if (activeTab === 'participacoes') {
      // Busca saldo consolidado por ativo (destino - origem)
      Promise.all([
        supabase
          .from('operacoes_ativos')
          .select('ativo_id, quantidade, ativos!inner(id, codigo, especie)')
          .eq('destino_id', pessoa.id),
        supabase
          .from('operacoes_ativos')
          .select('ativo_id, quantidade')
          .eq('origem_id', pessoa.id),
      ]).then(([destRes, origRes]) => {
        // Saldo = sum(destino) - sum(origem)
        const saldoMap: Record<string, { ativo_id: string; codigo: string; especie: string | null; quantidade: number }> = {}

        for (const row of (destRes.data ?? [])) {
          const ativo = Array.isArray(row.ativos) ? row.ativos[0] : row.ativos
          if (!ativo) continue
          const key = row.ativo_id
          if (!saldoMap[key]) {
            saldoMap[key] = { ativo_id: row.ativo_id, codigo: ativo.codigo, especie: (ativo as { especie?: string }).especie ?? null, quantidade: 0 }
          }
          saldoMap[key].quantidade += Number(row.quantidade)
        }
        for (const row of (origRes.data ?? [])) {
          const key = row.ativo_id
          if (saldoMap[key]) {
            saldoMap[key].quantidade -= Number(row.quantidade)
          }
        }

        // Busca total emitido por ativo para calcular %
        supabase
          .from('operacoes_ativos')
          .select('ativo_id, quantidade, tipo_operacao')
          .in('tipo_operacao', ['emissao'])
          .then(({ data: emissoes }) => {
            const totalMap: Record<string, number> = {}
            for (const e of (emissoes ?? [])) {
              totalMap[e.ativo_id] = (totalMap[e.ativo_id] ?? 0) + Number(e.quantidade)
            }

            const result: Participacao[] = Object.values(saldoMap)
              .filter((s) => s.quantidade > 0)
              .map((s) => ({
                ativo_id: s.ativo_id,
                codigo: s.codigo,
                especie: s.especie,
                quantidade: s.quantidade,
                total_ativo: totalMap[s.ativo_id] ?? 0,
              }))

            setParticipacoes(result)
            setLoadingTabs(false)
          })
      })
    }

    if (activeTab === 'contratos') {
      supabase
        .from('contratos_equity')
        .select('id, sequencial, tipo, status, quantidade_outorgada, data_aprovacao, plano:planos_equity(nome)')
        .eq('beneficiario_id', pessoa.id)
        .order('sequencial', { ascending: false })
        .then(({ data }) => {
          setContratos(
            (data ?? []).map((c) => {
              const plano = Array.isArray(c.plano) ? c.plano[0] : c.plano
              return {
                id: c.id,
                sequencial: c.sequencial,
                tipo: c.tipo,
                plano_nome: plano?.nome ?? null,
                quantidade_outorgada: c.quantidade_outorgada,
                status: c.status,
                data_aprovacao: c.data_aprovacao ?? null,
              }
            })
          )
          setLoadingTabs(false)
        })
    }
  }, [pessoa, open, activeTab])

  async function handleDelete() {
    if (!pessoa) return
    if (!confirm(`Excluir ${pessoa.nome_completo}? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    const result = await excluirPessoa(pessoa.id, orgSlug)
    setDeleting(false)
    if (result.error) {
      alert(result.error)
    } else {
      onDeleted()
      onClose()
    }
  }

  if (!pessoa) return null

  const nascFormatado = pessoa.data_nascimento
    ? new Date(pessoa.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
    : null

  const estadoCivilLabel =
    ESTADO_CIVIL_OPTS.find((o) => o.value === pessoa.estado_civil)?.label ?? pessoa.estado_civil

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <SheetTitle className="text-base leading-snug">{pessoa.nome_completo}</SheetTitle>
              {pessoa.cpf_cnpj && (
                <p className="text-xs text-muted-foreground mt-0.5">{pessoa.cpf_cnpj}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onEdit(pessoa)}>
                <PencilIcon className="size-3.5 mr-1" />
                Editar
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
                title="Excluir"
              >
                <Trash2Icon className="size-4" />
                <span className="sr-only">Excluir</span>
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList
             
              className="px-5 border-b border-border rounded-none w-full h-auto pb-0 justify-start gap-0"
            >
              {[
                { value: 'info', label: 'Informações' },
                { value: 'participacoes', label: 'Participações' },
                { value: 'contratos', label: 'Contratos' },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-active:border-foreground pb-2 px-3 text-xs"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Aba: Informações ── */}
            <TabsContent value="info" className="px-5 py-4">
              <div className="divide-y divide-border/50">
                <Campo label="Nome completo" value={pessoa.nome_completo} />
                <Campo label="CPF / CNPJ" value={pessoa.cpf_cnpj} />
                <Campo label="Tipo" value={pessoa.tipo === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'} />
                {pessoa.tipo === 'pessoa_fisica' && (
                  <>
                    <Campo label="Estado civil" value={estadoCivilLabel} />
                    <Campo label="Profissão" value={pessoa.profissao} />
                    <Campo label="Data de nascimento" value={nascFormatado} />
                    <Campo label="Nacionalidade" value={pessoa.nacionalidade} />
                  </>
                )}
                <Campo label="E-mail" value={pessoa.email_principal} />
                <Campo label="Telefone" value={pessoa.telefone_principal} />
                {pessoa.anotacoes && (
                  <div className="py-2">
                    <p className="text-xs text-muted-foreground mb-1">Anotações</p>
                    <p className="text-sm whitespace-pre-wrap">{pessoa.anotacoes}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Aba: Participações ── */}
            <TabsContent value="participacoes" className="px-5 py-4">
              {loadingTabs ? (
                <p className="text-sm text-muted-foreground text-center py-10">Carregando…</p>
              ) : participacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Nenhuma participação registrada
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {['Ativo', 'Código', 'Quantidade', '% estimado'].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {participacoes.map((p) => {
                        const pct = p.total_ativo > 0
                          ? ((p.quantidade / p.total_ativo) * 100).toFixed(2)
                          : null
                        return (
                          <tr key={p.ativo_id} className="border-b last:border-0">
                            <td className="px-3 py-2 text-muted-foreground text-xs">
                              {p.especie ?? '—'}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs font-semibold">
                              {p.codigo}
                            </td>
                            <td className="px-3 py-2 tabular-nums">
                              {p.quantidade.toLocaleString('pt-BR')}
                            </td>
                            <td className="px-3 py-2 tabular-nums text-muted-foreground">
                              {pct ? `${pct}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ── Aba: Contratos ── */}
            <TabsContent value="contratos" className="px-5 py-4">
              {loadingTabs ? (
                <p className="text-sm text-muted-foreground text-center py-10">Carregando…</p>
              ) : contratos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Nenhum contrato de equity
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {['ID', 'Tipo', 'Plano', 'Quantidade', 'Status', 'Data início'].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {contratos.map((c) => (
                        <tr key={c.id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            #{String(c.sequencial).padStart(3, '0')}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {TIPO_EQUITY_LABEL[c.tipo] ?? c.tipo}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {c.plano_nome ?? '—'}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {c.quantidade_outorgada.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {STATUS_CONTRATO_LABEL[c.status] ?? c.status}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                            {c.data_aprovacao
                              ? new Date(c.data_aprovacao + 'T00:00:00').toLocaleDateString('pt-BR')
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FiltroTipo = 'todos' | 'pessoa_fisica' | 'pessoa_juridica'

export default function StakeholdersPage() {
  const params = useParams()
  const orgSlug = params.orgSlug as string

  const [pessoas, setPessoas] = React.useState<Pessoa[]>([])
  const [loading, setLoading] = React.useState(true)

  // UI state
  const [busca, setBusca] = React.useState('')
  const [filtroTipo, setFiltroTipo] = React.useState<FiltroTipo>('todos')

  // Drawers / sheets
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [selectedPessoa, setSelectedPessoa] = React.useState<Pessoa | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Pessoa | null>(null)

  async function fetchPessoas() {
    setLoading(true)
    const supabase = createClient()
    const { data: org } = await supabase
      .from('organizacoes')
      .select('id')
      .eq('slug', orgSlug)
      .single()

    if (!org) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('pessoas')
      .select('*')
      .eq('organizacao_id', org.id)
      .order('nome_completo')

    setPessoas((data ?? []) as Pessoa[])
    setLoading(false)
  }

  React.useEffect(() => {
    fetchPessoas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug])

  const filtradas = React.useMemo(() => {
    let list = pessoas
    if (filtroTipo !== 'todos') {
      list = list.filter((p) => p.tipo === filtroTipo)
    }
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(
        (p) =>
          p.nome_completo.toLowerCase().includes(q) ||
          (p.cpf_cnpj ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [pessoas, filtroTipo, busca])

  function handleRowClick(p: Pessoa) {
    setSelectedPessoa(p)
    setDetailOpen(true)
  }

  function handleNovoClick() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function handleEdit(p: Pessoa) {
    setDetailOpen(false)
    setEditTarget(p)
    setFormOpen(true)
  }

  async function handleDeleteFromTable(p: Pessoa) {
    if (!confirm(`Excluir ${p.nome_completo}? Esta ação não pode ser desfeita.`)) return
    await excluirPessoa(p.id, orgSlug)
    fetchPessoas()
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Stakeholders"
        description="Pessoas físicas e jurídicas vinculadas à organização"
        icon={UsersIcon}
        iconGradient="from-violet-400 to-violet-600"
      />

      <div className="flex flex-col gap-4 p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome ou CPF/CNPJ…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Filtro tipo */}
        <select
          className={selectClass + ' w-auto min-w-[160px]'}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
        >
          <option value="todos">Todos</option>
          <option value="pessoa_fisica">Pessoa Física</option>
          <option value="pessoa_juridica">Pessoa Jurídica</option>
        </select>

        {/* Contador */}
        <span className="text-sm text-muted-foreground tabular-nums ml-auto">
          {filtradas.length} {filtradas.length === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}
        </span>

        {/* Importar / Novo */}
        <ImportPlanilha orgSlug={orgSlug} onSuccess={fetchPessoas} />
        <Button onClick={handleNovoClick}>
          <PlusIcon className="size-4 mr-1.5" />
          Novo stakeholder
        </Button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {['Nome', 'CPF / CNPJ', 'Tipo', 'E-mail', 'Telefone', ''].map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  {busca || filtroTipo !== 'todos'
                    ? 'Nenhum resultado encontrado'
                    : 'Nenhuma pessoa cadastrada'}
                </td>
              </tr>
            ) : (
              filtradas.map((p) => {
                const incompleto = !p.cpf_cnpj || !p.email_principal || !p.telefone_principal
                return (
                <tr
                  key={p.id}
                  className="border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => handleRowClick(p)}
                >
                  <td className="px-3 py-2.5 font-medium">
                    <span className="flex items-center gap-2">
                      {p.nome_completo}
                      {incompleto && (
                        <span
                          title="Perfil incompleto — faltam CPF/CNPJ, e-mail ou telefone"
                          className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0"
                        >
                          incompleto
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground tabular-nums">
                    {p.cpf_cnpj ?? <span className="text-border">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <TipoBadge tipo={p.tipo} />
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {p.email_principal ?? <span className="text-border">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground tabular-nums">
                    {p.telefone_principal ?? <span className="text-border">—</span>}
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <MoreHorizontalIcon className="size-4" />
                            <span className="sr-only">Ações</span>
                          </button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(p)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteFromTable(p)}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer de detalhes */}
      <DetailDrawer
        pessoa={selectedPessoa}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        orgSlug={orgSlug}
        onEdit={handleEdit}
        onDeleted={fetchPessoas}
      />

      {/* Sheet de formulário */}
      <FormSheet
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        orgSlug={orgSlug}
        pessoa={editTarget}
        onSaved={fetchPessoas}
      />
      </div>
    </div>
  )
}
