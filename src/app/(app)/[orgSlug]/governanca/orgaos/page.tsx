'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  PlusIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  criarOrgao,
  editarOrgao,
  excluirOrgao,
  adicionarMembroOrgao,
  editarMembroOrgao,
  excluirMembroOrgao,
} from '@/app/actions/governanca'
import { PageHeader } from '@/components/shared/page-header'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Orgao {
  id: string
  nome: string
  tipo: string
  membros_count?: number
}

interface MembroOrgao {
  id: string
  cargo: string
  data_inicio: string
  duracao_mandato: number | null
  status: 'ativo' | 'inativo'
  pessoa: { id: string; nome_completo: string } | null
}

interface Pessoa {
  id: string
  nome_completo: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return format(new Date(iso + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return iso
  }
}

const TIPOS_ORGAO = [
  'Conselho de Administração',
  'Diretoria',
  'Assembleia',
  'Conselho Fiscal',
  'Outro',
]

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyOrgaos() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
      <UsersIcon className="mb-3 size-10 opacity-25" />
      <p className="text-sm">Nenhum órgão social cadastrado.</p>
      <p className="text-xs mt-1">Clique em Novo órgão para começar.</p>
    </div>
  )
}

// ─── Membros inline panel ─────────────────────────────────────────────────────

function MembrosPanel({
  orgao,
  orgSlug,
  pessoas,
  onReload,
}: {
  orgao: Orgao
  orgSlug: string
  pessoas: Pessoa[]
  onReload: () => void
}) {
  const supabase = React.useMemo(() => createClient(), [])
  const [membros, setMembros] = React.useState<MembroOrgao[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingMembro, setEditingMembro] = React.useState<MembroOrgao | null>(null)
  const [deleting, setDeleting] = React.useState<string | null>(null)

  // form state
  const [fPessoaId, setFPessoaId] = React.useState('')
  const [fCargo, setFCargo] = React.useState('')
  const [fDataInicio, setFDataInicio] = React.useState('')
  const [fDuracao, setFDuracao] = React.useState('')
  const [fStatus, setFStatus] = React.useState<'ativo' | 'inativo'>('ativo')
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  React.useEffect(() => {
    loadMembros()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgao.id])

  async function loadMembros() {
    setLoading(true)
    const { data } = await supabase
      .from('membros_orgao')
      .select('id, cargo, data_inicio, duracao_mandato, status, pessoa:pessoas(id, nome_completo)')
      .eq('orgao_id', orgao.id)
      .order('data_inicio', { ascending: false })
    setMembros((data as unknown as MembroOrgao[]) ?? [])
    setLoading(false)
  }

  function resetForm() {
    setFPessoaId('')
    setFCargo('')
    setFDataInicio('')
    setFDuracao('')
    setFStatus('ativo')
    setSaveError(null)
    setEditingMembro(null)
  }

  function openCreate() {
    resetForm()
    setSheetOpen(true)
  }

  function openEdit(m: MembroOrgao) {
    setEditingMembro(m)
    setFPessoaId(m.pessoa?.id ?? '')
    setFCargo(m.cargo)
    setFDataInicio(m.data_inicio)
    setFDuracao(m.duracao_mandato?.toString() ?? '')
    setFStatus(m.status)
    setSaveError(null)
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!fCargo || !fDataInicio) return
    if (!editingMembro && !fPessoaId) return
    setSaving(true)
    setSaveError(null)

    let result: { error?: string; ok?: boolean }
    if (editingMembro) {
      result = await editarMembroOrgao({
        orgSlug,
        id: editingMembro.id,
        cargo: fCargo,
        data_inicio: fDataInicio,
        duracao_mandato: fDuracao ? parseInt(fDuracao) : null,
        status: fStatus,
      })
    } else {
      result = await adicionarMembroOrgao({
        orgSlug,
        orgao_id: orgao.id,
        pessoa_id: fPessoaId,
        cargo: fCargo,
        data_inicio: fDataInicio,
        duracao_mandato: fDuracao ? parseInt(fDuracao) : null,
        status: fStatus,
      })
    }

    setSaving(false)
    if (result?.error) { setSaveError(result.error); return }
    setSheetOpen(false)
    resetForm()
    await loadMembros()
    onReload()
  }

  async function handleDeleteMembro(id: string) {
    if (!confirm('Remover este membro? Esta ação não pode ser desfeita.')) return
    setDeleting(id)
    await excluirMembroOrgao(orgSlug, id)
    setDeleting(null)
    await loadMembros()
    onReload()
  }

  return (
    <tr>
      <td colSpan={5} className="p-0 border-b bg-muted/30">
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Membros de {orgao.nome}</p>
            <Button size="sm" onClick={openCreate}>
              <PlusIcon />
              Adicionar membro
            </Button>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground">Carregando membros…</p>
          ) : membros.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum membro cadastrado neste órgão.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium text-foreground">Nome</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Cargo</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Data de início</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Mandato (meses)</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Status</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {membros.map((m) => (
                    <tr
                      key={m.id}
                      className={`border-b last:border-0 hover:bg-muted/30 ${deleting === m.id ? 'opacity-50' : ''}`}
                    >
                      <td className="px-3 py-2">{m.pessoa?.nome_completo ?? '—'}</td>
                      <td className="px-3 py-2">{m.cargo}</td>
                      <td className="px-3 py-2">{formatDate(m.data_inicio)}</td>
                      <td className="px-3 py-2">{m.duracao_mandato ?? '—'}</td>
                      <td className="px-3 py-2">
                        <Badge
                          className={
                            m.status === 'ativo'
                              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400'
                          }
                          variant="outline"
                        >
                          {m.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <MoreHorizontalIcon className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(m)}>
                              <PencilIcon className="size-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteMembro(m.id)}
                            >
                              <Trash2Icon className="size-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sheet adicionar/editar membro */}
        <Sheet open={sheetOpen} onOpenChange={(v) => { if (!v) { setSheetOpen(false); resetForm() } }}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{editingMembro ? 'Editar membro' : 'Adicionar membro'}</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 overflow-y-auto">
              {!editingMembro && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">
                    Pessoa <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={fPessoaId}
                    onChange={(e) => setFPessoaId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="">Selecione uma pessoa…</option>
                    {pessoas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome_completo}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingMembro && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Pessoa</label>
                  <p className="text-sm px-3 py-2 rounded-md border border-input bg-muted/40">
                    {editingMembro.pessoa?.nome_completo ?? '—'}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Cargo <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Ex.: Presidente"
                  value={fCargo}
                  onChange={(e) => setFCargo(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Data de início <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={fDataInicio}
                  onChange={(e) => setFDataInicio(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Duração do mandato (meses)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex.: 24"
                  value={fDuracao}
                  onChange={(e) => setFDuracao(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={fStatus}
                  onChange={(e) => setFStatus(e.target.value as 'ativo' | 'inativo')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => { setSheetOpen(false); resetForm() }} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !fCargo || !fDataInicio || (!editingMembro && !fPessoaId)}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </td>
    </tr>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OrgaosPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug
  const supabase = React.useMemo(() => createClient(), [])

  const [orgId, setOrgId] = React.useState<string | null>(null)
  const [orgaos, setOrgaos] = React.useState<Orgao[]>([])
  const [pessoas, setPessoas] = React.useState<Pessoa[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState<string | null>(null)

  // Sheet criar/editar órgão
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingOrgao, setEditingOrgao] = React.useState<Orgao | null>(null)
  const [fNome, setFNome] = React.useState('')
  const [fTipo, setFTipo] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function bootstrap() {
      const { data: org } = await supabase
        .from('organizacoes')
        .select('id')
        .eq('slug', orgSlug)
        .single()
      if (!org) { setLoading(false); return }
      setOrgId(org.id)
      await Promise.all([fetchOrgaos(org.id), fetchPessoas(org.id)])
      setLoading(false)
    }
    bootstrap()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug])

  async function fetchOrgaos(currentOrgId: string) {
    const { data } = await supabase
      .from('orgaos_sociais')
      .select('id, nome, tipo')
      .eq('organizacao_id', currentOrgId)
      .order('nome')

    const orgaosWithCount: Orgao[] = await Promise.all(
      (data ?? []).map(async (o) => {
        const { count } = await supabase
          .from('membros_orgao')
          .select('*', { count: 'exact', head: true })
          .eq('orgao_id', o.id)
          .eq('status', 'ativo')
        return { ...o, membros_count: count ?? 0 }
      })
    )
    setOrgaos(orgaosWithCount)
  }

  async function fetchPessoas(currentOrgId: string) {
    const { data } = await supabase
      .from('pessoas')
      .select('id, nome_completo')
      .eq('organizacao_id', currentOrgId)
      .order('nome_completo')
    setPessoas(data ?? [])
  }

  function resetForm() {
    setFNome('')
    setFTipo('')
    setSaveError(null)
    setEditingOrgao(null)
  }

  function openCreate() {
    resetForm()
    setSheetOpen(true)
  }

  function openEdit(o: Orgao) {
    setEditingOrgao(o)
    setFNome(o.nome)
    setFTipo(o.tipo)
    setSaveError(null)
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!fNome || !fTipo) return
    setSaving(true)
    setSaveError(null)

    let result: { error?: string; ok?: boolean }
    if (editingOrgao) {
      result = await editarOrgao({ orgSlug, id: editingOrgao.id, nome: fNome, tipo: fTipo })
    } else {
      result = await criarOrgao({ orgSlug, nome: fNome, tipo: fTipo })
    }

    setSaving(false)
    if (result?.error) { setSaveError(result.error); return }
    setSheetOpen(false)
    resetForm()
    if (orgId) await fetchOrgaos(orgId)
  }

  async function handleDeleteOrgao(id: string) {
    if (!confirm('Excluir este órgão e todos os seus membros? Esta ação não pode ser desfeita.')) return
    setDeleting(id)
    if (expandedId === id) setExpandedId(null)
    await excluirOrgao(orgSlug, id)
    setDeleting(null)
    if (orgId) await fetchOrgaos(orgId)
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="border-b border-border/50 bg-background px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-muted animate-pulse shrink-0" />
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-56 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 flex flex-col gap-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
              </div>
              <div className="h-3 w-28 rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-7 w-24 rounded bg-muted" />
                <div className="h-7 w-24 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Órgãos Sociais"
        description="Diretoria, Conselho de Administração e demais órgãos"
        icon={UsersIcon}
        iconGradient="from-slate-400 to-slate-600"
        actions={
          <Button size="sm" onClick={openCreate}>
            <PlusIcon />
            Novo órgão
          </Button>
        }
      />

    <div className="p-6 space-y-6">

      {/* Tabela */}
      {orgaos.length === 0 ? (
        <EmptyOrgaos />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nº de membros ativos</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgaos.map((o) => (
                <React.Fragment key={o.id}>
                  <TableRow
                    className={`cursor-pointer select-none ${deleting === o.id ? 'opacity-50' : ''}`}
                    onClick={() => toggleExpand(o.id)}
                  >
                    <TableCell>
                      {expandedId === o.id
                        ? <ChevronDownIcon className="size-4 text-muted-foreground" />
                        : <ChevronRightIcon className="size-4 text-muted-foreground" />
                      }
                    </TableCell>
                    <TableCell className="font-medium">{o.nome}</TableCell>
                    <TableCell>{o.tipo}</TableCell>
                    <TableCell>{o.membros_count ?? 0}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontalIcon className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(o)}>
                            <PencilIcon className="size-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteOrgao(o.id)}
                          >
                            <Trash2Icon className="size-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedId === o.id && (
                    <MembrosPanel
                      orgao={o}
                      orgSlug={orgSlug}
                      pessoas={pessoas}
                      onReload={() => orgId && fetchOrgaos(orgId)}
                    />
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sheet — criar/editar órgão */}
      <Sheet open={sheetOpen} onOpenChange={(v) => { if (!v) { setSheetOpen(false); resetForm() } }}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editingOrgao ? 'Editar órgão' : 'Novo órgão social'}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Nome <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ex.: Conselho de Administração"
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
                onChange={(e) => setFTipo(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Selecione o tipo…</option>
                {TIPOS_ORGAO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => { setSheetOpen(false); resetForm() }} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !fNome || !fTipo}
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
