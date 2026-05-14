"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import {
  PlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileTextIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/page-header"
import {
  criarPlano,
  editarPlano,
  excluirPlano,
  criarPrograma,
  editarPrograma,
  criarProvento,
} from "@/app/actions/equity"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Ativo {
  id: string
  codigo: string
  tipo: string
}

interface ContratoResumo {
  id: string
  quantidade_outorgada: number
  status: string
  beneficiario_id: string | null
}

interface Programa {
  id: string
  nome: string
  pool: number
  contratos_equity?: ContratoResumo[]
}

interface Plano {
  id: string
  nome: string
  tipo: string
  pool_total: number
  data_inicio: string
  data_fim: string | null
  ativo_id: string
  ativos?: Ativo
  programas_equity?: Programa[]
  qtd_vestida?: number
}

interface Provento {
  id: string
  data_referencia: string
  tipo: string
  qtd_proventos_por_acao: number
  plano_id: string
  programa_id: string | null
  planos_equity?: { nome: string }
  programas_equity?: { nome: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Valores aceitos pelo DB check constraint
const TIPOS_PLANO: { value: string; label: string }[] = [
  { value: "stock_options", label: "Stock Options" },
  { value: "rsu",           label: "RSU" },
  { value: "phantom",       label: "Phantom" },
  { value: "sar",           label: "SAR" },
  { value: "partnership",   label: "Partnership" },
]

const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS_PLANO.map((t) => [t.value, t.label])
)

const TIPOS_PROVENTO = ["dividendo", "JCP", "bonificação"]

function formatDate(v: string | null | undefined) {
  if (!v) return "—"
  try {
    return format(new Date(v), "dd/MM/yyyy", { locale: ptBR })
  } catch {
    return v
  }
}

function tipoBadgeClass(tipo: string) {
  const map: Record<string, string> = {
    stock_options: "bg-blue-100 text-blue-800",
    rsu:           "bg-purple-100 text-purple-800",
    phantom:       "bg-amber-100 text-amber-800",
    sar:           "bg-orange-100 text-orange-800",
    partnership:   "bg-green-100 text-green-800",
  }
  return map[tipo] ?? "bg-muted text-muted-foreground"
}

function ProgressBar({
  value,
  max,
  className,
}: {
  value: number
  max: number
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <FileTextIcon className="mb-3 size-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Sheet Criar/Editar Plano ─────────────────────────────────────────────────

interface PlanoSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  orgSlug: string
  ativos: Ativo[]
  plano?: Plano | null
  onSuccess: () => void
}

function PlanoSheet({ open, onOpenChange, orgSlug, ativos, plano, onSuccess }: PlanoSheetProps) {
  const [nome, setNome] = React.useState("")
  const [tipo, setTipo] = React.useState("stock_options")
  const [ativoId, setAtivoId] = React.useState("")
  const [poolTotal, setPoolTotal] = React.useState("")
  const [dataInicio, setDataInicio] = React.useState("")
  const [dataFim, setDataFim] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (open) {
      setNome(plano?.nome ?? "")
      setTipo(plano?.tipo ?? "stock_options")
      setAtivoId(plano?.ativo_id ?? "")
      setPoolTotal(plano ? String(plano.pool_total) : "")
      setDataInicio(plano?.data_inicio ?? "")
      setDataFim(plano?.data_fim ?? "")
      setError(null)
    }
  }, [open, plano])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const payload = {
      orgSlug,
      nome,
      tipo,
      ativo_id: ativoId,
      pool_total: Number(poolTotal),
      data_inicio: dataInicio,
      data_fim: dataFim || null,
    }
    const res = plano
      ? await editarPlano({ ...payload, id: plano.id })
      : await criarPlano(payload)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onSuccess()
    onOpenChange(false)
  }

  const acoes = ativos.filter((a) => a.tipo === "acao")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{plano ? "Editar plano" : "Criar plano"}</SheetTitle>
          <SheetDescription>Preencha os dados do plano de equity.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pl-nome">Nome do plano</Label>
            <Input id="pl-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pl-tipo">Tipo</Label>
            <select
              id="pl-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {TIPOS_PLANO.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pl-ativo">Ativo vinculado</Label>
            <select
              id="pl-ativo"
              value={ativoId}
              onChange={(e) => setAtivoId(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Selecione um ativo</option>
              {acoes.map((a) => (
                <option key={a.id} value={a.id}>{a.codigo}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pl-pool">Pool total</Label>
            <Input
              id="pl-pool"
              type="number"
              min={0}
              value={poolTotal}
              onChange={(e) => setPoolTotal(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pl-inicio">Data início</Label>
              <Input id="pl-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pl-fim">Data fim</Label>
              <Input id="pl-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <SheetFooter className="px-0">
            <SheetClose render={<Button type="button" variant="outline" />}>Cancelar</SheetClose>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : plano ? "Salvar alterações" : "Criar plano"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Sheet Adicionar Programa ─────────────────────────────────────────────────

const NOMES_SUGERIDOS = [
  "Diretoria",
  "Gerentes",
  "Coordenadores / Especialistas",
  "Líderes Técnicos",
  "Fundadores",
]

interface ProgramaSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  orgSlug: string
  planoId: string
  plano: Plano | undefined
  /** Quando passado: modo edição */
  programa?: Programa | null
  onSuccess: () => void
}

function ProgramaSheet({ open, onOpenChange, orgSlug, planoId, plano, programa, onSuccess }: ProgramaSheetProps) {
  const editando = !!programa
  const [nome, setNome] = React.useState("")
  const [pool, setPool] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (open) {
      setNome(programa?.nome ?? "")
      setPool(programa ? String(Number(programa.pool)) : "")
      setError(null)
    }
  }, [open, programa])

  // Pool já alocado nos outros programas (excluindo o que está sendo editado)
  const poolJaAlocado = (plano?.programas_equity ?? [])
    .filter((p) => p.id !== programa?.id)
    .reduce((s, p) => s + Number(p.pool), 0)
  const poolRestante = Number(plano?.pool_total ?? 0) - poolJaAlocado
  const poolDesejado = Number(pool) || 0
  const poolAposNovo = poolJaAlocado + poolDesejado
  const excedeu = poolDesejado > 0 && Number(plano?.pool_total ?? 0) > 0 && poolAposNovo > Number(plano?.pool_total ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (excedeu) { setError("A soma dos programas excederia o pool total do plano."); return }
    setLoading(true)
    setError(null)
    const res = editando
      ? await editarPrograma({ orgSlug, id: programa!.id, nome, pool: poolDesejado })
      : await criarPrograma({ orgSlug, plano_id: planoId, nome, pool: poolDesejado })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editando ? "Editar programa" : "Novo programa"}</SheetTitle>
          {plano && (
            <SheetDescription>
              {editando ? "Altere o nome ou o pool do programa." : (
                <>Dentro do plano <span className="font-semibold text-foreground">{plano.nome}</span></>
              )}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Pool summary */}
        {plano && (
          <div className="mx-4 mt-2 mb-1 rounded-lg border border-border/60 bg-muted/30 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Pool total do plano</span>
              <span className="font-semibold tabular-nums">{plano.pool_total.toLocaleString("pt-BR")} ações</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  excedeu ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${Math.min(100, plano.pool_total > 0 ? (poolAposNovo / plano.pool_total) * 100 : 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Já alocado: <span className="font-medium text-foreground">{poolJaAlocado.toLocaleString("pt-BR")}</span>
              </span>
              <span className={cn("font-medium", excedeu ? "text-destructive" : "text-muted-foreground")}>
                Restante: {(plano.pool_total - poolAposNovo).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prog-nome">Nome do programa</Label>
            <Input
              id="prog-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Diretoria, Gerentes..."
              required
            />
            {/* Sugestões rápidas */}
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {NOMES_SUGERIDOS.filter(
                (s) => !plano?.programas_equity?.some((p) => p.nome.toLowerCase() === s.toLowerCase())
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNome(s)}
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border transition-colors",
                    nome === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prog-pool">
              Pool de ações
              {poolRestante > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (máx. disponível: {poolRestante.toLocaleString("pt-BR")})
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="prog-pool"
                type="number"
                min={0}
                value={pool}
                onChange={(e) => setPool(e.target.value)}
                className={cn(excedeu && "border-destructive focus-visible:ring-destructive/30")}
              />
              {pool && plano && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {plano.pool_total > 0
                    ? `${((poolDesejado / plano.pool_total) * 100).toFixed(1)}% do plano`
                    : ""}
                </span>
              )}
            </div>
            {excedeu && (
              <p className="text-xs text-destructive">
                Excede o pool disponível em {(poolAposNovo - (plano?.pool_total ?? 0)).toLocaleString("pt-BR")} ações.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <SheetFooter className="px-0 pt-2">
            <SheetClose render={<Button type="button" variant="outline" />}>Cancelar</SheetClose>
            <Button type="submit" disabled={loading || excedeu || !nome}>
              {loading ? "Salvando..." : editando ? "Salvar alterações" : "Criar programa"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Sheet Provento ───────────────────────────────────────────────────────────

interface ProventoSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  orgSlug: string
  planos: Plano[]
  onSuccess: () => void
}

function ProventoSheet({ open, onOpenChange, orgSlug, planos, onSuccess }: ProventoSheetProps) {
  const [planoId, setPlanoId] = React.useState("")
  const [programaId, setProgramaId] = React.useState("")
  const [dataRef, setDataRef] = React.useState("")
  const [qtd, setQtd] = React.useState("")
  const [tipo, setTipo] = React.useState("dividendo")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (open) { setPlanoId(""); setProgramaId(""); setDataRef(""); setQtd(""); setTipo("dividendo"); setError(null) }
  }, [open])

  const programas = planos.find((p) => p.id === planoId)?.programas_equity ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await criarProvento({
      orgSlug,
      plano_id: planoId,
      programa_id: programaId || null,
      data_referencia: dataRef,
      qtd_proventos_por_acao: Number(qtd),
      tipo,
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova distribuição</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Plano</Label>
            <select
              value={planoId}
              onChange={(e) => { setPlanoId(e.target.value); setProgramaId("") }}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Selecione</option>
              {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Programa</Label>
            <select
              value={programaId}
              onChange={(e) => setProgramaId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Todos os programas</option>
              {programas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data de referência</Label>
            <Input type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Qtd de proventos por ação</Label>
            <Input type="number" step="0.000001" min={0} value={qtd} onChange={(e) => setQtd(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {TIPOS_PROVENTO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <SheetFooter className="px-0">
            <SheetClose render={<Button type="button" variant="outline" />}>Cancelar</SheetClose>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Registrar"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Linha expandível de Plano ────────────────────────────────────────────────

function PlanoRow({
  plano,
  onEdit,
  onDelete,
  onAddPrograma,
  onEditPrograma,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reload,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgSlug,
}: {
  plano: Plano
  onEdit: (p: Plano) => void
  onDelete: (p: Plano) => void
  onAddPrograma: (planoId: string) => void
  onEditPrograma: (planoId: string, programa: Programa) => void
  reload: () => Promise<void>
  orgSlug: string
}) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/40"
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            )}
            <span className="font-medium">{plano.nome}</span>
            {plano.ativos && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                {plano.ativos.codigo}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDate(plano.data_inicio)}
          {plano.data_fim ? ` – ${formatDate(plano.data_fim)}` : ""}
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
              tipoBadgeClass(plano.tipo)
            )}
          >
            {TIPO_LABEL[plano.tipo] ?? plano.tipo}
          </span>
        </TableCell>
        <TableCell className="text-sm">{plano.pool_total.toLocaleString("pt-BR")}</TableCell>
        <TableCell className="w-48">
          <ProgressBar value={plano.qtd_vestida ?? 0} max={plano.pool_total} />
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(plano)}>
                <PencilIcon className="size-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(plano)} className="text-destructive">
                <Trash2Icon className="size-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/10 hover:bg-muted/10">
          <TableCell colSpan={6} className="py-4 pl-10 pr-6">
            <div className="flex flex-col gap-3">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Programas
                  </span>
                  {/* Pool allocation bar */}
                  {(plano.programas_equity ?? []).length > 0 && (() => {
                    const alocado = (plano.programas_equity ?? []).reduce((s, p) => s + Number(p.pool), 0)
                    const pct = Number(plano.pool_total) > 0 ? Math.round((alocado / Number(plano.pool_total)) * 100) : 0
                    return (
                      <span className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{alocado.toLocaleString("pt-BR")}</span>
                        {" / "}{Number(plano.pool_total).toLocaleString("pt-BR")} distribuídos em programas ({pct}%)
                      </span>
                    )
                  })()}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); onAddPrograma(plano.id) }}
                >
                  <PlusIcon className="size-3 mr-1" /> Novo programa
                </Button>
              </div>

              {/* Programs list */}
              {(plano.programas_equity ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Nenhum programa cadastrado. Adicione programas para segmentar o pool por nível hierárquico.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-border/40">
                  {(plano.programas_equity ?? []).map((prog) => {
                    const pool = Number(prog.pool) || 0
                    const contratos = prog.contratos_equity ?? []

                    // Contratos ativos/assinados = comprometidos
                    const contratosAtivos = contratos.filter(
                      (c) => c.status === "ativo" || c.status === "em_assinatura"
                    )
                    const outorgado = contratosAtivos.reduce(
                      (s, c) => s + Number(c.quantidade_outorgada), 0
                    )
                    const beneficiarios = new Set(
                      contratosAtivos.map((c) => c.beneficiario_id).filter(Boolean)
                    ).size

                    // Rascunhos (reservados mas não confirmados)
                    const rascunhos = contratos.filter((c) => c.status === "rascunho")
                    const reservado = rascunhos.reduce(
                      (s, c) => s + Number(c.quantidade_outorgada), 0
                    )

                    const pctOutorgado = pool > 0 ? Math.min(100, (outorgado / pool) * 100) : 0
                    const pctReservado = pool > 0 ? Math.min(100 - pctOutorgado, (reservado / pool) * 100) : 0
                    const restante = pool - outorgado - reservado

                    return (
                      <div key={prog.id} className="py-3 first:pt-0 last:pb-0">
                        {/* Program name + stats */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">{prog.nome}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {beneficiarios > 0 && (
                              <span>
                                <span className="font-medium text-foreground">{beneficiarios}</span>{" "}
                                {beneficiarios === 1 ? "beneficiário" : "beneficiários"}
                              </span>
                            )}
                            <span className="tabular-nums">
                              Pool:{" "}
                              {pool > 0 ? (
                                <span className="font-medium text-foreground">{pool.toLocaleString("pt-BR")} ações</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onEditPrograma(plano.id, prog) }}
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] border border-border/60 hover:bg-muted transition-colors"
                              title="Editar programa"
                            >
                              <PencilIcon className="size-3" /> Editar
                            </button>
                          </div>
                        </div>

                        {/* Stacked progress bar */}
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                          {/* Outorgado (contratos ativos + em assinatura) */}
                          <div
                            className="h-full bg-primary transition-all rounded-l-full"
                            style={{ width: `${pctOutorgado}%` }}
                            title={`Outorgado: ${outorgado.toLocaleString("pt-BR")} ações`}
                          />
                          {/* Reservado (rascunhos) */}
                          {pctReservado > 0 && (
                            <div
                              className="h-full bg-primary/35 transition-all"
                              style={{ width: `${pctReservado}%` }}
                              title={`Rascunho: ${reservado.toLocaleString("pt-BR")} ações`}
                            />
                          )}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="inline-block size-2 rounded-full bg-primary" />
                            Outorgado:{" "}
                            <span className="font-medium text-foreground tabular-nums">
                              {outorgado.toLocaleString("pt-BR")}
                            </span>{" "}
                            ({pctOutorgado.toFixed(1)}%)
                          </span>
                          {reservado > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block size-2 rounded-full bg-primary/35" />
                              Rascunho:{" "}
                              <span className="tabular-nums">{reservado.toLocaleString("pt-BR")}</span>
                            </span>
                          )}
                          {restante > 0 && (
                            <span className="flex items-center gap-1 ml-auto">
                              Disponível:{" "}
                              <span className="font-medium text-foreground tabular-nums">
                                {restante.toLocaleString("pt-BR")}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanosPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [planos, setPlanos] = React.useState<Plano[]>([])
  const [proventos, setProventos] = React.useState<Provento[]>([])
  const [ativos, setAtivos] = React.useState<Ativo[]>([])
  const [contratosAll, setContratosAll] = React.useState<{ plano_id: string; quantidade_outorgada: number; status: string }[]>([])
  const [loading, setLoading] = React.useState(true)

  // Filters
  const [busca, setBusca] = React.useState("")
  const [tipoFiltro, setTipoFiltro] = React.useState("todos")

  // Sheets
  const [planoSheet, setPlanoSheet] = React.useState(false)
  const [editando, setEditando] = React.useState<Plano | null>(null)
  const [programaSheet, setProgramaSheet] = React.useState(false)
  const [programaPlanoId, setProgramaPlanoId] = React.useState("")
  const [editandoPrograma, setEditandoPrograma] = React.useState<Programa | null>(null)
  const [proventoSheet, setProventoSheet] = React.useState(false)

  const supabase = React.useMemo(() => createClient(), [])

  async function fetchData() {
    setLoading(true)
    const { data: orgData } = await supabase
      .from("organizacoes")
      .select("id")
      .eq("slug", orgSlug)
      .single()

    if (!orgData) { setLoading(false); return }
    const orgId = orgData.id

    const [{ data: planosData }, { data: proventosData }, { data: ativosData }, { data: contratosData }] =
      await Promise.all([
        supabase
          .from("planos_equity")
          .select(`
            *,
            ativos(id, codigo, tipo),
            programas_equity(
              id, nome, pool,
              contratos_equity(
                id, quantidade_outorgada, status, beneficiario_id
              )
            )
          `)
          .eq("organizacao_id", orgId)
          .order("created_at", { ascending: false }),
        supabase
          .from("proventos_equity")
          .select("*, planos_equity(nome), programas_equity(nome)")
          .eq("organizacao_id", orgId)
          .order("data_referencia", { ascending: false }),
        supabase
          .from("ativos")
          .select("id, codigo, tipo")
          .eq("organizacao_id", orgId),
        // Todos os contratos — para somar pool comprometido vs. disponível
        supabase
          .from("contratos_equity")
          .select("plano_id, quantidade_outorgada, status")
          .eq("organizacao_id", orgId)
          .neq("status", "cancelado"),
      ])

    setPlanos((planosData as Plano[]) ?? [])
    setProventos((proventosData as Provento[]) ?? [])
    setAtivos((ativosData as Ativo[]) ?? [])
    setContratosAll((contratosData ?? []) as { plano_id: string; quantidade_outorgada: number; status: string }[])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { fetchData() }, [orgSlug])

  async function handleDelete(plano: Plano) {
    if (!confirm(`Excluir o plano "${plano.nome}"?`)) return
    await excluirPlano(orgSlug, plano.id)
    fetchData()
  }

  // ── Resumo global do pool ─────────────────────────────────
  const totalPool = planos.reduce((s, p) => s + Number(p.pool_total), 0)
  const totalOutorgadoAtivo = contratosAll
    .filter((c) => c.status === "ativo" || c.status === "em_assinatura")
    .reduce((s, c) => s + Number(c.quantidade_outorgada), 0)
  const totalRascunho = contratosAll
    .filter((c) => c.status === "rascunho")
    .reduce((s, c) => s + Number(c.quantidade_outorgada), 0)
  const totalDisponivel = totalPool - totalOutorgadoAtivo - totalRascunho

  const planosFiltrados = planos.filter((p) => {
    if (tipoFiltro !== "todos" && p.tipo !== tipoFiltro) return false
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Planos de Equity"
        description="Planos, programas e distribuições de proventos"
        icon={TrendingUpIcon}
        iconGradient="from-pink-400 to-rose-600"
      />

    <div className="flex flex-col gap-6 p-6">

      {/* ── Resumo global do pool — sempre visível, acima das tabs ── */}
      {loading ? (
        <div className="rounded-xl border border-border/70 bg-card p-4 animate-pulse h-[110px]" />
      ) : (
        <div className={cn(
          "rounded-xl border bg-card p-5 flex flex-col gap-3",
          "shadow-[0_0_0_1px_hsl(var(--border)/0.5),0_1px_4px_hsl(220_30%_11%/0.04)]",
          totalDisponivel < 0 ? "border-destructive/40" : "border-border/70"
        )}>
          {/* Alerta de pool negativo */}
          {totalDisponivel < 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
              <AlertTriangleIcon className="size-4 shrink-0 text-destructive mt-0.5" />
              <p className="text-xs font-medium text-destructive leading-relaxed">
                <span className="font-bold">Pool excedido em {Math.abs(totalDisponivel).toLocaleString("pt-BR")} ações.</span>{" "}
                Foram outorgadas mais opções do que o pool autoriza. Revise os contratos ativos ou aumente o pool total.
              </p>
            </div>
          )}

          {/* Top row: two stat numbers */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Pool total de equity
              </p>
              <p className="text-2xl font-bold tracking-tight mt-0.5">
                {totalPool.toLocaleString("pt-BR")}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">ações reservadas</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Disponível para outorgar
              </p>
              <p className={cn(
                "text-2xl font-bold tracking-tight mt-0.5",
                totalDisponivel > 0 ? "text-emerald-600 dark:text-emerald-400"
                  : totalDisponivel < 0 ? "text-destructive"
                  : "text-muted-foreground"
              )}>
                {totalDisponivel.toLocaleString("pt-BR")}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">ações</span>
              </p>
            </div>
          </div>

          {/* Stacked progress bar */}
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
            {totalPool > 0 && (
              <>
                <div
                  className={cn(
                    "h-full transition-all rounded-l-full",
                    totalDisponivel < 0 ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(100, (totalOutorgadoAtivo / totalPool) * 100)}%` }}
                  title={`Outorgado: ${totalOutorgadoAtivo.toLocaleString("pt-BR")}`}
                />
                {totalRascunho > 0 && (
                  <div
                    className={cn(
                      "h-full transition-all",
                      totalDisponivel < 0 ? "bg-destructive/40" : "bg-primary/30"
                    )}
                    style={{ width: `${Math.min(100 - Math.min(100, (totalOutorgadoAtivo / totalPool) * 100), (totalRascunho / totalPool) * 100)}%` }}
                    title={`Rascunho: ${totalRascunho.toLocaleString("pt-BR")}`}
                  />
                )}
              </>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full inline-block", totalDisponivel < 0 ? "bg-destructive" : "bg-primary")} />
              Outorgado:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {totalOutorgadoAtivo.toLocaleString("pt-BR")}
              </span>
              {totalPool > 0 && (
                <span className="text-muted-foreground/60">
                  ({((totalOutorgadoAtivo / totalPool) * 100).toFixed(1)}%)
                </span>
              )}
            </span>
            {totalRascunho > 0 && (
              <span className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full inline-block", totalDisponivel < 0 ? "bg-destructive/40" : "bg-primary/30")} />
                Rascunho:{" "}
                <span className="tabular-nums">{totalRascunho.toLocaleString("pt-BR")}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted-foreground/20 inline-block" />
              Disponível:{" "}
              <span className={cn(
                "font-semibold tabular-nums",
                totalDisponivel > 0 ? "text-emerald-600 dark:text-emerald-400"
                  : totalDisponivel < 0 ? "text-destructive font-bold"
                  : "text-muted-foreground"
              )}>
                {totalDisponivel.toLocaleString("pt-BR")}
              </span>
              {totalPool > 0 && (
                <span className="text-muted-foreground/60">
                  ({((totalDisponivel / totalPool) * 100).toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="planos">
        <TabsList>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="proventos">Proventos</TabsTrigger>
        </TabsList>

        {/* ── Aba Planos ─────────────────────────────────────────────────────── */}
        <TabsContent value="planos" className="mt-4 flex flex-col gap-4">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="todos">Todos</option>
              {TIPOS_PLANO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por nome do plano..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-3"
              />
            </div>
            <Button
              onClick={() => { setEditando(null); setPlanoSheet(true) }}
            >
              <PlusIcon className="size-4 mr-2" /> Criar plano
            </Button>
          </div>

          {/* Tabela */}
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : planosFiltrados.length === 0 ? (
            <EmptyState message="Nenhum plano encontrado." />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Pool total</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planosFiltrados.map((plano) => (
                    <PlanoRow
                      key={plano.id}
                      plano={plano}
                      onEdit={(p) => { setEditando(p); setPlanoSheet(true) }}
                      onDelete={handleDelete}
                      onAddPrograma={(id) => { setEditandoPrograma(null); setProgramaPlanoId(id); setProgramaSheet(true) }}
                      onEditPrograma={(planoId, prog) => { setEditandoPrograma(prog); setProgramaPlanoId(planoId); setProgramaSheet(true) }}
                      reload={fetchData}
                      orgSlug={orgSlug}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Aba Proventos ───────────────────────────────────────────────────── */}
        <TabsContent value="proventos" className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => setProventoSheet(true)}>
              <PlusIcon className="size-4 mr-2" /> Nova distribuição
            </Button>
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : proventos.length === 0 ? (
            <EmptyState message="Nenhum provento registrado." />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Programa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd por ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proventos.map((prov) => (
                    <TableRow key={prov.id}>
                      <TableCell className="text-sm">{formatDate(prov.data_referencia)}</TableCell>
                      <TableCell className="text-sm">{prov.planos_equity?.nome ?? "—"}</TableCell>
                      <TableCell className="text-sm">{prov.programas_equity?.nome ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{prov.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {prov.qtd_proventos_por_acao.toLocaleString("pt-BR", { minimumFractionDigits: 6 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sheets */}
      <PlanoSheet
        open={planoSheet}
        onOpenChange={setPlanoSheet}
        orgSlug={orgSlug}
        ativos={ativos}
        plano={editando}
        onSuccess={fetchData}
      />
      <ProgramaSheet
        open={programaSheet}
        onOpenChange={(v) => { if (!v) setEditandoPrograma(null); setProgramaSheet(v) }}
        orgSlug={orgSlug}
        planoId={programaPlanoId}
        plano={planos.find((p) => p.id === programaPlanoId)}
        programa={editandoPrograma}
        onSuccess={fetchData}
      />
      <ProventoSheet
        open={proventoSheet}
        onOpenChange={setProventoSheet}
        orgSlug={orgSlug}
        planos={planos}
        onSuccess={fetchData}
      />
    </div>
    </div>
  )
}
