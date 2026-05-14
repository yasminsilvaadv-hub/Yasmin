"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Trash2Icon,
  PencilIcon,
  FileTextIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/page-header"
import {
  criarCalendario,
  editarCalendario,
  excluirCalendario,
  type ParcelaVestingInput,
} from "@/app/actions/equity"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParcelaCalendario {
  id: string
  numero_parcela: number
  eh_cliff: boolean
  duracao: number
  unidade: "anos" | "meses"
  prazo_exercicio: number
  percentual: number
}

interface Calendario {
  id: string
  nome: string
  parcelas_vesting: ParcelaCalendario[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <FileTextIcon className="mb-3 size-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Formulário de Parcelas ───────────────────────────────────────────────────

interface ParcelaForm {
  numero_parcela: number
  eh_cliff: boolean
  duracao: string
  unidade: "anos" | "meses"
  prazo_exercicio: string
  percentual: string
}

function newParcela(numero: number): ParcelaForm {
  return {
    numero_parcela: numero,
    eh_cliff: false,
    duracao: "1",
    unidade: "anos",
    prazo_exercicio: "90",
    percentual: "",
  }
}

function parcelaFromDB(p: ParcelaCalendario, idx: number): ParcelaForm {
  return {
    numero_parcela: idx + 1,
    eh_cliff: p.eh_cliff ?? false,
    duracao: String(p.duracao ?? 1),
    unidade: p.unidade ?? "anos",
    prazo_exercicio: String(p.prazo_exercicio ?? 90),
    // cliff rows have 0.0001 in DB — show as empty in form
    percentual: (p.eh_cliff) ? "" : String(p.percentual ?? ""),
  }
}

// ─── Sheet Criar/Editar Calendário ────────────────────────────────────────────

interface CalendarioSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  orgSlug: string
  /** Quando passado: modo edição */
  calendario?: Calendario | null
  onSuccess: () => void
}

function CalendarioSheet({ open, onOpenChange, orgSlug, calendario, onSuccess }: CalendarioSheetProps) {
  const editando = !!calendario
  const [nome, setNome] = React.useState("")
  const [parcelas, setParcelas] = React.useState<ParcelaForm[]>([newParcela(1)])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (open) {
      setError(null)
      if (calendario) {
        setNome(calendario.nome)
        const sorted = [...(calendario.parcelas_vesting ?? [])].sort(
          (a, b) => a.numero_parcela - b.numero_parcela
        )
        setParcelas(sorted.length > 0 ? sorted.map(parcelaFromDB) : [newParcela(1)])
      } else {
        setNome("")
        setParcelas([newParcela(1)])
      }
    }
  }, [open, calendario])

  const totalPercentual = parcelas.reduce((s, p) => s + (p.eh_cliff ? 0 : (parseFloat(p.percentual) || 0)), 0)

  function addParcela() {
    setParcelas((prev) => [...prev, newParcela(prev.length + 1)])
  }

  function removeParcela(idx: number) {
    setParcelas((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, numero_parcela: i + 1 }))
    )
  }

  function updateParcela<K extends keyof ParcelaForm>(idx: number, key: K, value: ParcelaForm[K]) {
    setParcelas((prev) => prev.map((p, i) => (i === idx ? { ...p, [key]: value } : p)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (totalPercentual > 100.01) {
      setError(`Total das parcelas não pode ultrapassar 100%. Atual: ${totalPercentual.toFixed(2)}%`)
      return
    }

    setLoading(true)
    const parcelasInput: ParcelaVestingInput[] = parcelas.map((p) => ({
      ordem: p.numero_parcela,
      cliff: p.eh_cliff,
      duracao: Number(p.duracao),
      unidade: p.unidade,
      prazo_exercicio: Number(p.prazo_exercicio),
      // cliff rows send 0; the action converts to 0.0001 before inserting
      percentual: p.eh_cliff ? 0 : (parseFloat(p.percentual) || 0),
    }))

    const res = editando
      ? await editarCalendario({ orgSlug, id: calendario!.id, nome, parcelas: parcelasInput })
      : await criarCalendario({ orgSlug, nome, parcelas: parcelasInput })

    setLoading(false)
    if (res.error) { setError(res.error); return }
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editando ? "Editar calendário" : "Novo calendário de vesting"}</SheetTitle>
          <SheetDescription>
            Configure as parcelas de vesting. O total pode ser menor que 100% (cliff com 0% é válido).
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 py-4">

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cal-nome">Nome do calendário</Label>
            <Input
              id="cal-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex: 4 anos — 25%/ano"
              required
            />
          </div>

          {/* Templates rápidos */}
          {!editando && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Templates rápidos
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNome("4 anos — 25%/ano")
                    setParcelas([
                      { numero_parcela: 1, eh_cliff: false, duracao: "1", unidade: "anos", prazo_exercicio: "90", percentual: "25" },
                      { numero_parcela: 2, eh_cliff: false, duracao: "1", unidade: "anos", prazo_exercicio: "90", percentual: "25" },
                      { numero_parcela: 3, eh_cliff: false, duracao: "1", unidade: "anos", prazo_exercicio: "90", percentual: "25" },
                      { numero_parcela: 4, eh_cliff: false, duracao: "1", unidade: "anos", prazo_exercicio: "90", percentual: "25" },
                    ])
                  }}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs border border-border hover:border-primary/50 hover:text-foreground text-muted-foreground transition-colors"
                >
                  4 anos · 25%/ano
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNome("Cliff 1 ano + 4 anos — 25%/ano")
                    setParcelas([
                      { numero_parcela: 1, eh_cliff: true,  duracao: "1", unidade: "anos", prazo_exercicio: "90", percentual: ""  },
                      { numero_parcela: 2, eh_cliff: false, duracao: "1", unidade: "anos", prazo_exercicio: "90", percentual: "25" },
                      { numero_parcela: 3, eh_cliff: false, duracao: "1", unidade: "anos", prazo_exercicio: "90", percentual: "25" },
                      { numero_parcela: 4, eh_cliff: false, duracao: "1", unidade: "anos", prazo_exercicio: "90", percentual: "25" },
                      { numero_parcela: 5, eh_cliff: false, duracao: "1", unidade: "anos", prazo_exercicio: "90", percentual: "25" },
                    ])
                  }}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs border border-border hover:border-primary/50 hover:text-foreground text-muted-foreground transition-colors"
                >
                  Cliff 1 ano + 4 anos · 25%/ano
                </button>
              </div>
            </div>
          )}

          {/* Parcelas */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                Parcelas
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (cada linha = 1 período de vesting)
                </span>
              </span>
              <Button type="button" size="sm" variant="outline" onClick={addParcela}>
                <PlusIcon className="size-3.5 mr-1" /> Adicionar parcela
              </Button>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground w-8">#</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Cliff?</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Duração</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Unidade</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Prazo exercício (dias)</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">% vesting</th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {parcelas.map((p, idx) => (
                    <tr key={idx} className={cn("border-b last:border-0", p.eh_cliff && "bg-amber-50/40")}>
                      <td className="px-3 py-1.5 text-muted-foreground text-xs">{p.numero_parcela}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={p.eh_cliff}
                            onChange={(e) => {
                              updateParcela(idx, "eh_cliff", e.target.checked)
                              if (e.target.checked) updateParcela(idx, "percentual", "")
                            }}
                            className="rounded border-input"
                          />
                          {p.eh_cliff && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 rounded px-1">
                              cliff
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          min={1}
                          value={p.duracao}
                          onChange={(e) => updateParcela(idx, "duracao", e.target.value)}
                          className="h-7 w-20 text-xs"
                          required
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <select
                          value={p.unidade}
                          onChange={(e) => updateParcela(idx, "unidade", e.target.value as "anos" | "meses")}
                          className="flex h-7 w-24 rounded-md border border-input bg-transparent px-2 py-0.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="meses">meses</option>
                          <option value="anos">anos</option>
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          value={p.prazo_exercicio}
                          onChange={(e) => updateParcela(idx, "prazo_exercicio", e.target.value)}
                          className="h-7 w-20 text-xs"
                          required
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={p.eh_cliff ? "" : p.percentual}
                          onChange={(e) => updateParcela(idx, "percentual", e.target.value)}
                          disabled={p.eh_cliff}
                          required={!p.eh_cliff}
                          className={cn("h-7 w-20 text-xs", p.eh_cliff && "opacity-40 cursor-not-allowed")}
                          placeholder={p.eh_cliff ? "cliff" : "0"}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => removeParcela(idx)}
                          disabled={parcelas.length === 1}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-right text-muted-foreground">
                      Total vesting
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-xs font-bold",
                        Math.abs(totalPercentual - 100) < 0.01
                          ? "text-green-600"
                          : totalPercentual > 100
                          ? "text-destructive"
                          : "text-amber-600"
                      )}
                    >
                      {totalPercentual.toFixed(2)}%
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {totalPercentual < 99.99 && totalPercentual > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                ⚠ Total de {totalPercentual.toFixed(2)}% — as ações restantes ({(100 - totalPercentual).toFixed(2)}%) não terão data de liberação definida.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <SheetFooter className="px-0">
            <SheetClose render={<Button type="button" variant="outline" />}>Cancelar</SheetClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : editando ? "Salvar alterações" : "Criar calendário"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Linha expandível do calendário ──────────────────────────────────────────

function CalendarioRow({
  cal,
  onEdit,
  onDelete,
}: {
  cal: Calendario
  onEdit: (c: Calendario) => void
  onDelete: (c: Calendario) => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const parcelas = [...(cal.parcelas_vesting ?? [])].sort((a, b) => a.numero_parcela - b.numero_parcela)
  // cliff rows store 0.0001 in DB — exclude them from the display total
  const totalPct = parcelas.reduce((s, p) => s + (p.eh_cliff ? 0 : (Number(p.percentual) || 0)), 0)

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/30"
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell>
          <span className="flex items-center gap-2">
            <ChevronDownIcon
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
            <span className="font-medium">{cal.nome}</span>
          </span>
        </TableCell>
        <TableCell className="text-center text-sm text-muted-foreground">
          {parcelas.length} {parcelas.length === 1 ? "parcela" : "parcelas"}
        </TableCell>
        <TableCell className="text-center">
          <span
            className={cn(
              "text-sm font-semibold",
              Math.abs(totalPct - 100) < 0.01
                ? "text-green-600"
                : totalPct > 100
                ? "text-destructive"
                : "text-amber-600"
            )}
          >
            {totalPct.toFixed(2)}%
          </span>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(cal)}>
                <PencilIcon className="size-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(cal)} className="text-destructive">
                <Trash2Icon className="size-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Parcelas expandidas */}
      {expanded && (
        <TableRow className="bg-muted/10 hover:bg-muted/10">
          <TableCell colSpan={4} className="py-3 pl-10 pr-6">
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wide text-muted-foreground">Tipo</th>
                    <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wide text-muted-foreground">Duração</th>
                    <th className="px-3 py-1.5 text-right text-[10px] uppercase tracking-wide text-muted-foreground">% vesting</th>
                    <th className="px-3 py-1.5 text-right text-[10px] uppercase tracking-wide text-muted-foreground">Prazo exercício</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelas.map((p) => (
                    <tr key={p.id} className={cn("border-b last:border-0", p.eh_cliff && "bg-amber-50/40")}>
                      <td className="px-3 py-1.5 text-muted-foreground">{p.numero_parcela}</td>
                      <td className="px-3 py-1.5">
                        {p.eh_cliff ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">
                            Cliff
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700">
                            Vesting
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {p.duracao} {p.unidade}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold">
                        {p.eh_cliff ? "—" : `${Number(p.percentual).toFixed(2)}%`}
                      </td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">
                        {p.prazo_exercicio} dias
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendariosPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [calendarios, setCalendarios] = React.useState<Calendario[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editando, setEditando] = React.useState<Calendario | null>(null)

  const supabase = React.useMemo(() => createClient(), [])

  async function fetchData() {
    setLoading(true)
    const { data: orgData } = await supabase
      .from("organizacoes")
      .select("id")
      .eq("slug", orgSlug)
      .single()

    if (!orgData) { setLoading(false); return }

    const { data } = await supabase
      .from("calendarios_vesting")
      .select("id, nome, parcelas_vesting(*)")
      .eq("organizacao_id", orgData.id)
      .order("created_at", { ascending: false })

    setCalendarios((data as Calendario[]) ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { fetchData() }, [orgSlug])

  function handleEdit(cal: Calendario) {
    setEditando(cal)
    setSheetOpen(true)
  }

  async function handleDelete(cal: Calendario) {
    if (!confirm(`Excluir o calendário "${cal.nome}"? Contratos vinculados perderão o vesting.`)) return
    await excluirCalendario(orgSlug, cal.id)
    fetchData()
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Calendários de Vesting"
        description="Configure os schedules de liberação de ações para os contratos"
        icon={CalendarDaysIcon}
        iconGradient="from-teal-400 to-teal-600"
        actions={
          <Button size="sm" onClick={() => { setEditando(null); setSheetOpen(true) }}>
            <PlusIcon className="size-4 mr-1.5" /> Novo calendário
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : calendarios.length === 0 ? (
          <EmptyState message="Nenhum calendário cadastrado." />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Parcelas</TableHead>
                  <TableHead className="text-center">Total %</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {calendarios.map((cal) => (
                  <CalendarioRow
                    key={cal.id}
                    cal={cal}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <CalendarioSheet
          open={sheetOpen}
          onOpenChange={(v) => { if (!v) setEditando(null); setSheetOpen(v) }}
          orgSlug={orgSlug}
          calendario={editando}
          onSuccess={fetchData}
        />
      </div>
    </div>
  )
}
