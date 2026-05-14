'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  PlusIcon,
  CalendarIcon,
  ClipboardListIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import {
  criarEvento,
  editarEvento,
  excluirEvento,
  atualizarStatusEvento,
  criarRequisito,
  excluirRequisito,
} from '@/app/actions/governanca'

// ─── Types ────────────────────────────────────────────────────────────────────

type EventoStatus = 'pendente' | 'concluido' | 'cancelado'
type EventoTipo = 'rca' | 'ago' | 'age' | 'rd'
type RequisitoStatus = 'cumprido' | 'pendente' | 'atrasado'

interface OrgaoSocial {
  id: string
  nome: string
}

interface Evento {
  id: string
  nome: string
  tipo: EventoTipo
  data_hora: string
  status: EventoStatus
  ordem_do_dia: string | null
  orgao: { id: string; nome: string } | null
}

interface Requisito {
  id: string
  evento_id: string
  descricao: string
  tipo: string
  status: RequisitoStatus
  prazo: string | null
  evento?: { nome: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return iso
  }
}

function formatDate(iso: string) {
  try {
    return format(new Date(iso + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return iso
  }
}

const TIPO_LABEL: Record<EventoTipo, string> = {
  rca: 'RCA',
  ago: 'AGO',
  age: 'AGE',
  rd: 'RD',
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function EventoStatusBadge({ status }: { status: EventoStatus }) {
  const map: Record<EventoStatus, string> = {
    pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    concluido: 'bg-green-100 text-green-800 border-green-200',
    cancelado: 'bg-red-100 text-red-800 border-red-200',
  }
  const label: Record<EventoStatus, string> = {
    pendente: 'Pendente',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  }
  return (
    <Badge variant="outline" className={map[status]}>
      {label[status]}
    </Badge>
  )
}

function RequisitoStatusBadge({ status }: { status: RequisitoStatus }) {
  const map: Record<RequisitoStatus, string> = {
    pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    cumprido: 'bg-green-100 text-green-800 border-green-200',
    atrasado: 'bg-red-100 text-red-800 border-red-200',
  }
  const label: Record<RequisitoStatus, string> = {
    pendente: 'Pendente',
    cumprido: 'Cumprido',
    atrasado: 'Atrasado',
  }
  return (
    <Badge variant="outline" className={map[status]}>
      {label[status]}
    </Badge>
  )
}

function TipoBadge({ tipo }: { tipo: EventoTipo }) {
  return (
    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 font-mono">
      {TIPO_LABEL[tipo]}
    </Badge>
  )
}

// ─── Drawer de evento (detalhes + abas) ───────────────────────────────────────

function EventoDrawer({
  evento,
  orgSlug,
  orgaos,
  open,
  onClose,
  onUpdated,
  onDeleted,
}: {
  evento: Evento | null
  orgSlug: string
  orgaos: OrgaoSocial[]
  open: boolean
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
}) {
  const supabase = React.useMemo(() => createClient(), [])
  const [requisitos, setRequisitos] = React.useState<Requisito[]>([])
  const [loadingReqs, setLoadingReqs] = React.useState(false)
  const [deletingReq, setDeletingReq] = React.useState<string | null>(null)

  // status edit
  const [editStatus, setEditStatus] = React.useState<EventoStatus>('pendente')
  const [savingStatus, setSavingStatus] = React.useState(false)

  // edit mode for event fields
  const [editMode, setEditMode] = React.useState(false)
  const [eNome, setENome] = React.useState('')
  const [eTipo, setETipo] = React.useState<EventoTipo | ''>('')
  const [eOrgaoId, setEOrgaoId] = React.useState('')
  const [eDataHora, setEDataHora] = React.useState('')
  const [eOrdemDoDia, setEOrdemDoDia] = React.useState('')
  const [savingEdit, setSavingEdit] = React.useState(false)
  const [editError, setEditError] = React.useState<string | null>(null)

  // deleting event
  const [deletingEvento, setDeletingEvento] = React.useState(false)

  // add requisito form
  const [fDescricao, setFDescricao] = React.useState('')
  const [fTipo, setFTipo] = React.useState('')
  const [fPrazo, setFPrazo] = React.useState('')
  const [savingReq, setSavingReq] = React.useState(false)
  const [reqError, setReqError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!evento) return
    setEditStatus(evento.status)
    setEditMode(false)
    setEditError(null)
    loadRequisitos(evento.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento?.id])

  async function loadRequisitos(eventoId: string) {
    setLoadingReqs(true)
    const { data } = await supabase
      .from('requisitos_evento')
      .select('*')
      .eq('evento_id', eventoId)
      .order('created_at')
    setRequisitos((data ?? []) as Requisito[])
    setLoadingReqs(false)
  }

  function enterEditMode() {
    if (!evento) return
    setENome(evento.nome)
    setETipo(evento.tipo)
    setEOrgaoId(evento.orgao?.id ?? '')
    // datetime-local format: "YYYY-MM-DDTHH:MM"
    setEDataHora(evento.data_hora ? evento.data_hora.slice(0, 16) : '')
    setEOrdemDoDia(evento.ordem_do_dia ?? '')
    setEditError(null)
    setEditMode(true)
  }

  async function handleSaveEdit() {
    if (!evento || !eNome || !eTipo || !eDataHora) return
    setSavingEdit(true)
    setEditError(null)
    const result = await editarEvento({
      orgSlug,
      id: evento.id,
      nome: eNome,
      tipo: eTipo as EventoTipo,
      orgao_id: eOrgaoId || null,
      data_hora: eDataHora,
      ordem_do_dia: eOrdemDoDia || null,
    })
    setSavingEdit(false)
    if (result?.error) { setEditError(result.error); return }
    setEditMode(false)
    onUpdated()
  }

  async function handleDeleteEvento() {
    if (!evento) return
    if (!confirm(`Excluir o evento "${evento.nome}"? Esta ação não pode ser desfeita.`)) return
    setDeletingEvento(true)
    await excluirEvento(orgSlug, evento.id)
    setDeletingEvento(false)
    onDeleted()
  }

  async function handleSaveStatus() {
    if (!evento) return
    setSavingStatus(true)
    await atualizarStatusEvento({ orgSlug, evento_id: evento.id, status: editStatus })
    setSavingStatus(false)
    onUpdated()
  }

  async function handleAddRequisito() {
    if (!evento || !fDescricao || !fTipo) return
    setSavingReq(true)
    setReqError(null)
    const result = await criarRequisito({
      orgSlug,
      evento_id: evento.id,
      descricao: fDescricao,
      tipo: fTipo,
      prazo: fPrazo || null,
    })
    setSavingReq(false)
    if (result?.error) { setReqError(result.error); return }
    setFDescricao('')
    setFTipo('')
    setFPrazo('')
    await loadRequisitos(evento.id)
  }

  async function handleDeleteRequisito(id: string) {
    if (!confirm('Remover este requisito?')) return
    setDeletingReq(id)
    await excluirRequisito(orgSlug, id)
    setDeletingReq(null)
    if (evento) await loadRequisitos(evento.id)
  }

  if (!evento) return null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="line-clamp-2">{evento.nome}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Tabs defaultValue="evento">
            <TabsList className="w-full">
              <TabsTrigger value="evento" className="flex-1">Evento</TabsTrigger>
              <TabsTrigger value="requisitos" className="flex-1">Requisitos</TabsTrigger>
              <TabsTrigger value="documentos" className="flex-1">Documentos</TabsTrigger>
            </TabsList>

            {/* ── Tab Evento ── */}
            <TabsContent value="evento" className="mt-4 space-y-4">
              {!editMode ? (
                <>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Tipo</dt>
                      <dd className="mt-0.5"><TipoBadge tipo={evento.tipo} /></dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Órgão</dt>
                      <dd className="mt-0.5 font-medium">{evento.orgao?.nome ?? '—'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Data e hora</dt>
                      <dd className="mt-0.5 font-medium">{formatDateTime(evento.data_hora)}</dd>
                    </div>
                    {evento.ordem_do_dia && (
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Ordem do dia</dt>
                        <dd className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">{evento.ordem_do_dia}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={enterEditMode}>
                      <PencilIcon className="size-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={handleDeleteEvento}
                      disabled={deletingEvento}
                    >
                      <Trash2Icon className="size-3.5 mr-1" />
                      {deletingEvento ? 'Excluindo…' : 'Excluir evento'}
                    </Button>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm font-medium">Alterar status</p>
                    <div className="flex gap-2 items-center">
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as EventoStatus)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <Button
                        size="sm"
                        onClick={handleSaveStatus}
                        disabled={savingStatus || editStatus === evento.status}
                      >
                        {savingStatus ? 'Salvando…' : 'Salvar'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* Edit mode form */
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Nome <span className="text-destructive">*</span></label>
                    <Input value={eNome} onChange={(e) => setENome(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Tipo <span className="text-destructive">*</span></label>
                    <select
                      value={eTipo}
                      onChange={(e) => setETipo(e.target.value as EventoTipo)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="">Selecione o tipo…</option>
                      <option value="rca">RCA — Reunião do Conselho de Administração</option>
                      <option value="ago">AGO — Assembleia Geral Ordinária</option>
                      <option value="age">AGE — Assembleia Geral Extraordinária</option>
                      <option value="rd">RD — Reunião de Diretoria</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Órgão social</label>
                    <select
                      value={eOrgaoId}
                      onChange={(e) => setEOrgaoId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="">Nenhum / não aplicável</option>
                      {orgaos.map((o) => (
                        <option key={o.id} value={o.id}>{o.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Data e hora <span className="text-destructive">*</span></label>
                    <Input
                      type="datetime-local"
                      value={eDataHora}
                      onChange={(e) => setEDataHora(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Ordem do dia</label>
                    <textarea
                      value={eOrdemDoDia}
                      onChange={(e) => setEOrdemDoDia(e.target.value)}
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                  </div>

                  {editError && <p className="text-sm text-destructive">{editError}</p>}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={savingEdit || !eNome || !eTipo || !eDataHora}
                    >
                      {savingEdit ? 'Salvando…' : 'Salvar alterações'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditMode(false)} disabled={savingEdit}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Tab Requisitos ── */}
            <TabsContent value="requisitos" className="mt-4 space-y-4">
              {loadingReqs ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : requisitos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum requisito cadastrado.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-3 py-2 text-left font-medium">Descrição</th>
                        <th className="px-3 py-2 text-left font-medium">Tipo</th>
                        <th className="px-3 py-2 text-left font-medium">Prazo</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {requisitos.map((r) => (
                        <tr
                          key={r.id}
                          className={`border-b last:border-0 hover:bg-muted/20 ${deletingReq === r.id ? 'opacity-50' : ''}`}
                        >
                          <td className="px-3 py-2">{r.descricao}</td>
                          <td className="px-3 py-2">{r.tipo}</td>
                          <td className="px-3 py-2">{r.prazo ? formatDate(r.prazo) : '—'}</td>
                          <td className="px-3 py-2"><RequisitoStatusBadge status={r.status} /></td>
                          <td className="px-3 py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteRequisito(r.id)}
                              disabled={deletingReq === r.id}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Adicionar requisito */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <p className="text-sm font-medium">Adicionar requisito</p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    Descrição <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Ex.: Publicação no DOU"
                    value={fDescricao}
                    onChange={(e) => setFDescricao(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    Tipo <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Ex.: Legal, Regulatório, Interno…"
                    value={fTipo}
                    onChange={(e) => setFTipo(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Prazo</label>
                  <Input
                    type="date"
                    value={fPrazo}
                    onChange={(e) => setFPrazo(e.target.value)}
                  />
                </div>

                {reqError && <p className="text-xs text-destructive">{reqError}</p>}

                <Button
                  size="sm"
                  onClick={handleAddRequisito}
                  disabled={savingReq || !fDescricao || !fTipo}
                >
                  {savingReq ? 'Salvando…' : 'Adicionar'}
                </Button>
              </div>
            </TabsContent>

            {/* ── Tab Documentos ── */}
            <TabsContent value="documentos" className="mt-4">
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                <ClipboardListIcon className="size-9 opacity-25" />
                <p className="text-sm font-medium">Documentos</p>
                <p className="text-xs">Em breve</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EventosPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug
  const supabase = React.useMemo(() => createClient(), [])

  const [orgId, setOrgId] = React.useState<string | null>(null)
  const [orgaos, setOrgaos] = React.useState<OrgaoSocial[]>([])
  const [eventos, setEventos] = React.useState<Evento[]>([])
  const [requisitos, setRequisitos] = React.useState<Requisito[]>([])
  const [loading, setLoading] = React.useState(true)

  // filters — eventos
  const [filterNome, setFilterNome] = React.useState('')
  const [filterTipo, setFilterTipo] = React.useState<string>('')

  // filters — requisitos
  const [filterReqStatus, setFilterReqStatus] = React.useState<string>('')

  // sheet novo evento
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [fNome, setFNome] = React.useState('')
  const [fTipo, setFTipo] = React.useState<EventoTipo | ''>('')
  const [fOrgaoId, setFOrgaoId] = React.useState('')
  const [fDataHora, setFDataHora] = React.useState('')
  const [fOrdemDoDia, setFOrdemDoDia] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // drawer evento selecionado
  const [selectedEvento, setSelectedEvento] = React.useState<Evento | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  React.useEffect(() => {
    async function bootstrap() {
      const { data: org } = await supabase
        .from('organizacoes')
        .select('id')
        .eq('slug', orgSlug)
        .single()
      if (!org) { setLoading(false); return }
      setOrgId(org.id)
      await Promise.all([
        fetchEventos(org.id),
        fetchRequisitos(org.id),
        fetchOrgaos(org.id),
      ])
      setLoading(false)
    }
    bootstrap()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug])

  async function fetchEventos(currentOrgId: string) {
    const { data } = await supabase
      .from('eventos')
      .select('id, nome, tipo, data_hora, status, ordem_do_dia, orgao:orgaos_sociais(id, nome)')
      .eq('organizacao_id', currentOrgId)
      .order('data_hora', { ascending: false })
    setEventos((data ?? []) as unknown as Evento[])
  }

  async function fetchRequisitos(currentOrgId: string) {
    const { data } = await supabase
      .from('requisitos_evento')
      .select('*, evento:eventos!inner(nome, organizacao_id)')
      .eq('eventos.organizacao_id', currentOrgId)
      .order('created_at', { ascending: false })
    setRequisitos((data ?? []) as unknown as Requisito[])
  }

  async function fetchOrgaos(currentOrgId: string) {
    const { data } = await supabase
      .from('orgaos_sociais')
      .select('id, nome')
      .eq('organizacao_id', currentOrgId)
      .order('nome')
    setOrgaos(data ?? [])
  }

  function resetForm() {
    setFNome('')
    setFTipo('')
    setFOrgaoId('')
    setFDataHora('')
    setFOrdemDoDia('')
    setSaveError(null)
  }

  async function handleSaveEvento() {
    if (!fNome || !fTipo || !fDataHora) return
    setSaving(true)
    setSaveError(null)
    const result = await criarEvento({
      orgSlug,
      nome: fNome,
      tipo: fTipo as EventoTipo,
      orgao_id: fOrgaoId || null,
      data_hora: fDataHora,
      ordem_do_dia: fOrdemDoDia || null,
    })
    setSaving(false)
    if (result?.error) { setSaveError(result.error); return }
    setSheetOpen(false)
    resetForm()
    if (orgId) await Promise.all([fetchEventos(orgId), fetchRequisitos(orgId)])
  }

  function handleRowClick(evento: Evento) {
    setSelectedEvento(evento)
    setDrawerOpen(true)
  }

  async function handleEventoUpdated() {
    if (!orgId) return
    await Promise.all([fetchEventos(orgId), fetchRequisitos(orgId)])
    // refresh selected evento from updated list
    setSelectedEvento((prev) => {
      if (!prev) return null
      return eventos.find((e) => e.id === prev.id) ?? prev
    })
  }

  async function handleEventoDeleted() {
    setDrawerOpen(false)
    setSelectedEvento(null)
    if (orgId) await Promise.all([fetchEventos(orgId), fetchRequisitos(orgId)])
  }

  // filtered lists
  const filteredEventos = React.useMemo(() => {
    return eventos.filter((e) => {
      const matchNome = !filterNome || e.nome.toLowerCase().includes(filterNome.toLowerCase())
      const matchTipo = !filterTipo || e.tipo === filterTipo
      return matchNome && matchTipo
    })
  }, [eventos, filterNome, filterTipo])

  const filteredRequisitos = React.useMemo(() => {
    return requisitos.filter((r) => !filterReqStatus || r.status === filterReqStatus)
  }, [requisitos, filterReqStatus])

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
        title="Eventos Societários"
        description="Assembleias, reuniões de conselho e requisitos"
        icon={CalendarIcon}
        iconGradient="from-indigo-400 to-indigo-600"
        actions={
          <Button size="sm" onClick={() => { resetForm(); setSheetOpen(true) }}>
            <PlusIcon />
            Novo evento
          </Button>
        }
      />

    <div className="p-6 space-y-6">

      {/* Tabs */}
      <Tabs defaultValue="eventos">
        <TabsList>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="requisitos">Requisitos</TabsTrigger>
        </TabsList>

        {/* ── Aba Eventos ── */}
        <TabsContent value="eventos" className="mt-4 space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar por nome…"
              value={filterNome}
              onChange={(e) => setFilterNome(e.target.value)}
              className="w-56"
            />
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Todos os tipos</option>
              <option value="rca">RCA</option>
              <option value="ago">AGO</option>
              <option value="age">AGE</option>
              <option value="rd">RD</option>
            </select>
          </div>

          {filteredEventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <CalendarIcon className="mb-3 size-10 opacity-25" />
              <p className="text-sm">Nenhum evento encontrado.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Órgão</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEventos.map((e) => (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(e)}
                    >
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(e.data_hora)}
                      </TableCell>
                      <TableCell className="font-medium">{e.nome}</TableCell>
                      <TableCell>{e.orgao?.nome ?? '—'}</TableCell>
                      <TableCell><TipoBadge tipo={e.tipo} /></TableCell>
                      <TableCell><EventoStatusBadge status={e.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Aba Requisitos ── */}
        <TabsContent value="requisitos" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <select
              value={filterReqStatus}
              onChange={(e) => setFilterReqStatus(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="cumprido">Cumprido</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>

          {filteredRequisitos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <ClipboardListIcon className="mb-3 size-10 opacity-25" />
              <p className="text-sm">Nenhum requisito encontrado.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prazo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequisitos.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {(r.evento as unknown as { nome: string } | null)?.nome ?? '—'}
                      </TableCell>
                      <TableCell>{r.descricao}</TableCell>
                      <TableCell>{r.tipo}</TableCell>
                      <TableCell><RequisitoStatusBadge status={r.status} /></TableCell>
                      <TableCell>{r.prazo ? formatDate(r.prazo) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sheet — Novo evento */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Novo evento</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-1 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Nome <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ex.: AGO 2025"
                value={fNome}
                onChange={(e) => setFNome(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Tipo <span className="text-destructive">*</span>
              </label>
              <select
                value={fTipo}
                onChange={(e) => setFTipo(e.target.value as EventoTipo | '')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Selecione o tipo…</option>
                <option value="rca">RCA — Reunião do Conselho de Administração</option>
                <option value="ago">AGO — Assembleia Geral Ordinária</option>
                <option value="age">AGE — Assembleia Geral Extraordinária</option>
                <option value="rd">RD — Reunião de Diretoria</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Órgão social</label>
              <select
                value={fOrgaoId}
                onChange={(e) => setFOrgaoId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Nenhum / não aplicável</option>
                {orgaos.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Data e hora <span className="text-destructive">*</span>
              </label>
              <Input
                type="datetime-local"
                value={fDataHora}
                onChange={(e) => setFDataHora(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Ordem do dia</label>
              <textarea
                placeholder="Descreva os pontos da pauta…"
                value={fOrdemDoDia}
                onChange={(e) => setFOrdemDoDia(e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEvento}
              disabled={saving || !fNome || !fTipo || !fDataHora}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Drawer — detalhe do evento */}
      <EventoDrawer
        evento={selectedEvento}
        orgSlug={orgSlug}
        orgaos={orgaos}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={handleEventoUpdated}
        onDeleted={handleEventoDeleted}
      />
    </div>
    </div>
  )
}
