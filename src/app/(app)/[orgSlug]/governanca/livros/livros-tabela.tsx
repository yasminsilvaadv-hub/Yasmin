'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PlusIcon,
  PrinterIcon,
  BookOpenIcon,
  ExternalLinkIcon,
  InfoIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  PaperclipIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { criarLivro, atualizarLivro } from '@/app/actions/governanca'
import { LivroDrawer } from './livro-drawer'
import {
  getNaturezaConfig,
  CATEGORIAS,
  NATUREZAS_PRIMARIAS,
  type LivroRow,
  type OrgaoSimples,
} from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const SEL = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20'

const JUNTAS_COMERCIAIS = [
  'JUCEAC – Acre', 'JUCEAL – Alagoas', 'JUCEMAP – Amapá', 'JUCEA – Amazonas',
  'JUCEB – Bahia', 'JUCEC – Ceará', 'JUCDF – Distrito Federal', 'JUCEES – Espírito Santo',
  'JUCEG – Goiás', 'JUCEMA – Maranhão', 'JUCEMAT – Mato Grosso', 'JUCEMS – Mato Grosso do Sul',
  'JUCEMG – Minas Gerais', 'JUCEPA – Pará', 'JUCEP – Paraíba', 'JUCEPAR – Paraná',
  'JUCEPE – Pernambuco', 'JUCEPI – Piauí', 'JUCERJ – Rio de Janeiro',
  'JUCERN – Rio Grande do Norte', 'JUCERGS – Rio Grande do Sul', 'JUCER – Rondônia',
  'JUCERR – Roraima', 'JUCESC – Santa Catarina', 'JUCESP – São Paulo',
  'JUCESE – Sergipe', 'JUCETINS – Tocantins',
]

const PER_PAGE_OPTIONS = [25, 50, 100]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  livros: LivroRow[]
  orgaos: OrgaoSimples[]
  orgSlug: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try { return format(new Date(iso + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return iso }
}

const FORMA_LABEL: Record<string, string> = {
  escriturado: 'Escriturado',
  em_branco: 'Em branco',
  'Em branco': 'Em branco',
  'Escriturado': 'Escriturado',
  'Autenticado pela Junta Comercial': 'Junta Comercial',
  'Autenticado por Notário': 'Notário',
}

// ─── Anotações inline panel ───────────────────────────────────────────────────

function AnotacoesPanel({
  livro,
  orgSlug,
  onUpdated,
  onOpenDrawer,
}: {
  livro: LivroRow
  orgSlug: string
  onUpdated: (id: string, anotacoes: string | null) => void
  onOpenDrawer: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(livro.anotacoes ?? '')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => { setDraft(livro.anotacoes ?? '') }, [livro.anotacoes])

  const config = getNaturezaConfig(livro.natureza)
  const printUrl = config.printPath ? `/print/${orgSlug}/livro/${config.printPath}` : null

  async function handleSave() {
    setSaving(true)
    await atualizarLivro({ orgSlug, livro_id: livro.id, anotacoes: draft.trim() || null })
    onUpdated(livro.id, draft.trim() || null)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="py-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      {/* Anotações */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Anotações
          </p>
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Observações sobre este livro…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
                  <CheckIcon className="size-3.5" />
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setEditing(false); setDraft(livro.anotacoes ?? '') }}
                  disabled={saving}
                >
                  <XIcon className="size-3.5" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">
              {livro.anotacoes
                ? livro.anotacoes
                : <span className="text-muted-foreground italic">Sem anotações</span>
              }
            </p>
          )}
        </div>
        {!editing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs shrink-0"
            onClick={() => setEditing(true)}
          >
            <PencilIcon className="size-3.5" />
            {livro.anotacoes ? 'Editar' : 'Adicionar anotações'}
          </Button>
        )}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-1 pt-1 border-t border-border/40">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={onOpenDrawer}
        >
          Ver lançamentos
          <ChevronRightIcon className="size-3.5" />
        </Button>
        {printUrl && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => window.open(printUrl, '_blank')}
          >
            <PrinterIcon className="size-3.5" />
            Imprimir
            <ExternalLinkIcon className="size-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Novo Livro Dialog ────────────────────────────────────────────────────────

function NovoLivroDialog({
  natureza,
  open,
  onClose,
  orgaos,
  orgSlug,
  onSaved,
}: {
  natureza: string
  open: boolean
  onClose: () => void
  orgaos: OrgaoSimples[]
  orgSlug: string
  onSaved: () => void
}) {
  const config = getNaturezaConfig(natureza)

  const [fOrgaoId, setFOrgaoId] = React.useState('')
  const [fPeriodoInicio, setFPeriodoInicio] = React.useState('')
  const [fPeriodoFim, setFPeriodoFim] = React.useState('')
  const [fFormato, setFFormato] = React.useState<'digital' | 'fisico' | ''>('')
  const [fAnotacoes, setFAnotacoes] = React.useState('')
  const [fAutenticado, setFAutenticado] = React.useState(false)
  const [fDataAuth, setFDataAuth] = React.useState('')
  const [fJunta, setFJunta] = React.useState('')
  const [fFormaAuth, setFFormaAuth] = React.useState<'escriturado' | 'em_branco' | ''>('')
  const [fFiles, setFFiles] = React.useState<FileList | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setFOrgaoId(''); setFPeriodoInicio(''); setFPeriodoFim('')
    setFFormato(''); setFAnotacoes(''); setFAutenticado(false)
    setFDataAuth(''); setFJunta(''); setFFormaAuth('')
    setFFiles(null); setSaveError(null)
  }, [open, natureza])

  const canSave =
    !!fFormato &&
    (!config.exigeOrgao || !!fOrgaoId) &&
    (!fAutenticado || (!!fDataAuth && !!fJunta && !!fFormaAuth))

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const result = await criarLivro({
      orgSlug,
      natureza,
      orgao_id: fOrgaoId || null,
      periodo_inicio: fPeriodoInicio || null,
      periodo_fim: fPeriodoFim || null,
      formato: fFormato as 'digital' | 'fisico',
      autenticado: fAutenticado,
      data_autenticacao: fAutenticado ? fDataAuth || null : null,
      orgao_autenticador: fAutenticado ? fJunta || null : null,
      forma_autenticacao: fAutenticado ? fFormaAuth || null : null,
      local_autenticacao: null,
      anotacoes: fAnotacoes || null,
    })
    setSaving(false)
    if (result?.error) { setSaveError(result.error); return }
    onSaved()
    onClose()
  }

  const selectedFiles = fFiles ? Array.from(fFiles) : []

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{config.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Banner informativo */}
          {config.textoAjuda && (
            <div className="flex gap-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3.5 py-3">
              <InfoIcon className="size-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                  {config.textoAjuda}
                </p>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-800"
                >
                  Clique aqui para entender como funciona
                </a>
              </div>
            </div>
          )}

          {/* Órgão social — somente quando exige */}
          {config.exigeOrgao && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Órgão social <span className="text-destructive">*</span>
              </label>
              <select value={fOrgaoId} onChange={(e) => setFOrgaoId(e.target.value)} className={SEL}>
                <option value="">Digite para buscar um órgão social…</option>
                {orgaos.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nº ordem (auto) + Formato */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                Nº de ordem
                <span
                  title="O número de ordem é calculado automaticamente — será o próximo número disponível para este tipo de livro."
                  className="inline-flex size-4 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] cursor-help select-none"
                >
                  ?
                </span>
              </label>
              <Input value="Automático" disabled className="bg-muted/50 text-muted-foreground cursor-not-allowed" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Formato <span className="text-destructive">*</span>
              </label>
              <select
                value={fFormato}
                onChange={(e) => setFFormato(e.target.value as 'digital' | 'fisico' | '')}
                className={SEL}
              >
                <option value="">Selecione…</option>
                <option value="digital">Digital</option>
                <option value="fisico">Físico</option>
              </select>
            </div>
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Início da escrituração</label>
              <Input type="date" value={fPeriodoInicio} onChange={(e) => setFPeriodoInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fim da escrituração</label>
              <Input
                type="date"
                value={fPeriodoFim}
                min={fPeriodoInicio || undefined}
                onChange={(e) => setFPeriodoFim(e.target.value)}
              />
            </div>
          </div>

          {/* Anotações */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Anotações</label>
            <textarea
              rows={2}
              placeholder="Observações livres sobre este livro…"
              value={fAnotacoes}
              onChange={(e) => setFAnotacoes(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 resize-none"
            />
          </div>

          {/* Autenticação */}
          <div className="border-t border-border/60 pt-4 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={fAutenticado}
                onChange={(e) => setFAutenticado(e.target.checked)}
                className="size-4 rounded accent-foreground cursor-pointer"
              />
              <span className="text-sm font-medium">Livro já autenticado</span>
            </label>

            {fAutenticado && (
              <div className="space-y-3 pl-6 border-l-2 border-border/60">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Data de autenticação <span className="text-destructive">*</span>
                    </label>
                    <Input type="date" value={fDataAuth} onChange={(e) => setFDataAuth(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Junta Comercial <span className="text-destructive">*</span>
                    </label>
                    <select value={fJunta} onChange={(e) => setFJunta(e.target.value)} className={SEL}>
                      <option value="">Selecione…</option>
                      {JUNTAS_COMERCIAIS.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Forma de autenticação <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="forma-auth"
                        value="escriturado"
                        checked={fFormaAuth === 'escriturado'}
                        onChange={() => setFFormaAuth('escriturado')}
                        className="accent-foreground"
                      />
                      Livro escriturado
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="forma-auth"
                        value="em_branco"
                        checked={fFormaAuth === 'em_branco'}
                        onChange={() => setFFormaAuth('em_branco')}
                        className="accent-foreground"
                      />
                      Livro em branco
                    </label>
                  </div>
                </div>

                {/* Documentos auxiliares */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Documentos auxiliares <span className="text-muted-foreground font-normal">(opcional)</span></label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-transparent px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors">
                      <PaperclipIcon className="size-3.5 text-muted-foreground" />
                      Procurar arquivos
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => setFFiles(e.target.files)}
                      />
                    </label>
                    {selectedFiles.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {selectedFiles.length} arquivo{selectedFiles.length > 1 ? 's' : ''} selecionado{selectedFiles.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="space-y-1">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <PaperclipIcon className="size-3 shrink-0" />
                          <span className="truncate">{f.name}</span>
                          <span className="shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground/70">
                    Upload requer configuração do armazenamento no Supabase Storage.
                  </p>
                </div>
              </div>
            )}
          </div>

          {saveError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-sm text-destructive">{saveError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Salvando…' : 'Salvar livro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LivrosTabela({ livros, orgaos, orgSlug }: Props) {
  // Filters
  const [filterNome, setFilterNome] = React.useState('')
  const [filterOrgaoId, setFilterOrgaoId] = React.useState('')

  // Accordion
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())

  // Pagination
  const [page, setPage] = React.useState(0)
  const [perPage, setPerPage] = React.useState(50)

  // Local state
  const [localLivros, setLocalLivros] = React.useState(livros)
  React.useEffect(() => setLocalLivros(livros), [livros])

  // Drawer
  const [selectedLivro, setSelectedLivro] = React.useState<LivroRow | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // New livro dialog
  const [dialogNatureza, setDialogNatureza] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // Reset page when filters or perPage change
  React.useEffect(() => setPage(0), [filterNome, filterOrgaoId, perPage])

  // Filtering
  const filtered = React.useMemo(() => {
    const nome = filterNome.toLowerCase()
    return localLivros
      .filter((l) => !nome || l.natureza.toLowerCase().includes(nome))
      .filter((l) => !filterOrgaoId || l.orgao?.id === filterOrgaoId)
  }, [localLivros, filterNome, filterOrgaoId])

  // Pagination
  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const safePage = Math.min(page, totalPages - 1)
  const paginated = filtered.slice(safePage * perPage, (safePage + 1) * perPage)

  const start = totalItems === 0 ? 0 : safePage * perPage + 1
  const end = Math.min((safePage + 1) * perPage, totalItems)

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAnotacoesUpdated(id: string, anotacoes: string | null) {
    setLocalLivros((prev) => prev.map((l) => (l.id === id ? { ...l, anotacoes } : l)))
  }

  function openDrawer(l: LivroRow) {
    setSelectedLivro(l)
    setDrawerOpen(true)
  }

  return (
    <>
      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Filtrar por tipo de livro…"
            value={filterNome}
            onChange={(e) => setFilterNome(e.target.value)}
            className="pl-8"
          />
        </div>

        <select
          value={filterOrgaoId}
          onChange={(e) => setFilterOrgaoId(e.target.value)}
          className={cn(SEL, 'w-auto max-w-48')}
        >
          <option value="">Todos os órgãos</option>
          {orgaos.map((o) => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>

        {/* Dropdown + novo livro */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button size="sm" className="ml-auto">
              <PlusIcon className="size-4" />
              Novo livro
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-72">
            {CATEGORIAS.map((cat, i) => (
              <React.Fragment key={cat.key}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wider px-2 py-1.5">
                    {cat.label}
                  </DropdownMenuLabel>
                  {NATUREZAS_PRIMARIAS.filter((n) => n.categoria === cat.key).map((n) => (
                    <DropdownMenuItem
                      key={n.value}
                      className="text-sm cursor-pointer gap-2"
                      onClick={() => { setDialogNatureza(n.value); setDialogOpen(true) }}
                    >
                      <span className={cn('inline-block size-2 rounded-full border shrink-0', n.badgeClass)} />
                      {n.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Table ── */}
      <div className="mt-4 rounded-xl border border-border overflow-hidden">
        {totalItems === 0 && !filterNome && !filterOrgaoId ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
            <BookOpenIcon className="mb-3 size-10 opacity-20" />
            <p className="text-sm font-medium">Nenhum livro societário</p>
            <p className="text-xs mt-1 max-w-xs">
              Os livros são criados automaticamente ao registrar operações de ativos ou concluir eventos,
              ou manualmente com o botão acima.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="w-9" />
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tipo / Órgão
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16">
                      Nº
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">
                      Data início
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">
                      Data fim
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">
                      Formato
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-44">
                      Autenticação
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">
                      Forma
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                          <SearchIcon className="mb-2 size-8 opacity-20" />
                          <p className="text-sm">Nenhum livro encontrado para os filtros aplicados</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((l) => {
                      const config = getNaturezaConfig(l.natureza)
                      const isExpanded = expandedRows.has(l.id)
                      const isAutenticado = l.autenticado

                      return (
                        <React.Fragment key={l.id}>
                          <tr
                            className={cn(
                              'border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors',
                              isExpanded && 'bg-muted/20 hover:bg-muted/30'
                            )}
                            onClick={() => toggleRow(l.id)}
                          >
                            {/* Expand icon */}
                            <td className="w-9 pl-3 pr-1">
                              <ChevronDownIcon
                                className={cn(
                                  'size-4 text-muted-foreground/60 transition-transform duration-150',
                                  isExpanded && 'rotate-180'
                                )}
                              />
                            </td>

                            {/* Tipo / Órgão */}
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'inline-block size-2 rounded-full border shrink-0',
                                    config.badgeClass
                                  )}
                                />
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{l.natureza}</p>
                                  {l.orgao && (
                                    <p className="text-xs text-muted-foreground truncate">{l.orgao.nome}</p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Nº */}
                            <td className="px-3 py-3">
                              <span className="font-mono text-xs text-muted-foreground">
                                #{l.numero_ordem.toString().padStart(3, '0')}
                              </span>
                            </td>

                            {/* Data início */}
                            <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                              {fmtDate(l.periodo_inicio)}
                            </td>

                            {/* Data fim */}
                            <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                              {fmtDate(l.periodo_fim)}
                            </td>

                            {/* Formato */}
                            <td className="px-3 py-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  l.formato === 'digital'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                )}
                              >
                                {l.formato === 'digital' ? 'Digital' : 'Físico'}
                              </Badge>
                            </td>

                            {/* Autenticação */}
                            <td className="px-3 py-3">
                              {isAutenticado ? (
                                <div>
                                  <Badge className="bg-green-100 text-green-700 border-transparent text-xs">
                                    Autenticado
                                  </Badge>
                                  {l.data_autenticacao && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                                      {fmtDate(l.data_autenticacao)}
                                    </p>
                                  )}
                                  {l.orgao_autenticador && (
                                    <p className="text-[10px] text-muted-foreground truncate max-w-36">
                                      {l.orgao_autenticador}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Forma */}
                            <td className="px-3 py-3 text-xs text-muted-foreground">
                              {l.forma_autenticacao
                                ? FORMA_LABEL[l.forma_autenticacao] ?? l.forma_autenticacao
                                : '—'}
                            </td>
                          </tr>

                          {/* Expanded panel */}
                          {isExpanded && (
                            <tr className="border-b border-border/50 bg-muted/10">
                              <td />
                              <td colSpan={7} className="px-3 pb-1">
                                <AnotacoesPanel
                                  livro={l}
                                  orgSlug={orgSlug}
                                  onUpdated={handleAnotacoesUpdated}
                                  onOpenDrawer={() => openDrawer(l)}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination footer ── */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border/60 bg-muted/10 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Itens por página:</span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
                >
                  {PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="tabular-nums">
                  {totalItems === 0 ? '0 itens' : `${start}–${end} de ${totalItems} itens`}
                </span>
                <div className="flex gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Drawer detalhe ── */}
      <LivroDrawer
        livro={selectedLivro}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        orgSlug={orgSlug}
      />

      {/* ── Dialog novo livro ── */}
      {dialogNatureza && (
        <NovoLivroDialog
          natureza={dialogNatureza}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          orgaos={orgaos}
          orgSlug={orgSlug}
          onSaved={() => window.location.reload()}
        />
      )}
    </>
  )
}
