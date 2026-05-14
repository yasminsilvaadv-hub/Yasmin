"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { format, addMonths, isBefore } from "date-fns"
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
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import {
} from "@/components/ui/tooltip"
import {
  PlusIcon,
  InfoIcon,
  FileTextIcon,
  UploadIcon,
  Trash2Icon,
  SearchIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/page-header"
import {
  criarContrato,
  atualizarStatusContrato,
  adicionarHistoricoContrato,
  vincularCalendario,
} from "@/app/actions/equity"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Pessoa {
  id: string
  nome_completo: string
  cpf_cnpj: string
}

interface Ativo {
  id: string
  codigo: string
  tipo: string
}

interface Programa {
  id: string
  nome: string
  pool: number
}

interface Plano {
  id: string
  nome: string
  tipo: string
  ativo_id: string
  ativos?: Ativo
  programas_equity?: Programa[]
}

interface Calendario {
  id: string
  nome: string
  parcelas_vesting: ParcelaVesting[]
}

interface ParcelaVesting {
  id: string
  numero_parcela: number
  eh_cliff: boolean
  duracao: number
  unidade: "anos" | "meses"
  prazo_exercicio: number
  percentual: number
}

interface HistoricoContrato {
  id: string
  data_operacao: string
  descricao: string
  quantidade_acoes: number | null
  valor_operacao: number | null
  saldo_acoes: number | null
}

interface DocumentoContrato {
  id: string
  nome: string
  formato: string
  tamanho: number
  data_upload: string
  url_storage: string
}

interface Contrato {
  id: string
  sequencial: number
  status: string
  tipo: string
  natureza: string
  quantidade_outorgada: number
  preco_exercicio_strike: number | null
  data_aprovacao: string | null
  data_assinatura: string | null
  data_validade: string | null
  beneficiario_id: string
  plano_id: string
  programa_id: string | null
  calendario_id: string | null
  pessoas?: Pessoa
  planos_equity?: Plano
  programas_equity?: Programa | null
  calendarios_vesting?: Calendario | null
  historico_contratos?: HistoricoContrato[]
  documentos_contrato?: DocumentoContrato[]
}

// ─── Constants & Helpers ─────────────────────────────────────────────────────

const tipoEquityLabel: Record<string, string> = {
  stock_options: "Stock Options",
  rsu: "RSU",
  phantom: "Phantom",
  sar: "SAR",
  partnership: "Partnership",
}

const statusContratoClass: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-700",
  em_assinatura: "bg-blue-100 text-blue-700",
  ativo: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}

const statusLabel: Record<string, string> = {
  rascunho: "Rascunho",
  em_assinatura: "Em assinatura",
  ativo: "Ativo",
  cancelado: "Cancelado",
}

const NATUREZAS = ["mercantil", "gratuita"]

function formatDate(v: string | null | undefined) {
  if (!v) return "—"
  try { return format(new Date(v), "dd/MM/yyyy", { locale: ptBR }) } catch { return v }
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "—"
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function contratoId(c: Contrato) {
  const prefix =
    c.tipo === "stock_options"
      ? "SO"
      : c.tipo === "rsu"
      ? "RSU"
      : c.tipo === "phantom"
      ? "PH"
      : c.tipo === "sar"
      ? "SAR"
      : "EQ"
  return `${prefix}-${c.sequencial}`
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <FileTextIcon className="mb-3 size-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden min-w-[60px]">
        <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  )
}

// Calcula parcelas de vesting com datas absolutas a partir da data_aprovacao
function calcularParcelasVesting(
  parcelas: ParcelaVesting[],
  dataAprovacao: string,
  quantidadeOutorgada: number
) {
  const inicio = new Date(dataAprovacao)
  let offset = 0 // acumula duração em meses

  return parcelas
    .slice()
    .sort((a, b) => a.numero_parcela - b.numero_parcela)
    .map((p) => {
      const duracaoMeses = p.unidade === "anos" ? p.duracao * 12 : p.duracao
      offset += duracaoMeses
      const dataSubscricao = addMonths(inicio, offset)
      // cliff não veste ações (percentual é null no banco)
      const pct = p.eh_cliff ? 0 : (p.percentual ?? 0)
      const quantidade = Math.round((pct / 100) * quantidadeOutorgada)
      const hoje = new Date()
      // cliff: a data passa mas não conta como "vestida" para fins de quantidade
      const vestida = !p.eh_cliff && (isBefore(dataSubscricao, hoje) || dataSubscricao.toDateString() === hoje.toDateString())
      return {
        ...p,
        dataSubscricao,
        quantidade,
        vestida,
      }
    })
}

// ─── Formulário Novo Contrato ─────────────────────────────────────────────────

interface NovoContratoSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  orgSlug: string
  planos: Plano[]
  calendarios: Calendario[]
  pessoas: Pessoa[]
  onSuccess: () => void
}

function NovoContratoSheet({
  open,
  onOpenChange,
  orgSlug,
  planos,
  calendarios,
  pessoas,
  onSuccess,
}: NovoContratoSheetProps) {
  const [beneficiarioId, setBeneficiarioId] = React.useState("")
  const [tipo, setTipo] = React.useState("stock_options")
  const [planoId, setPlanoId] = React.useState("")
  const [programaId, setProgramaId] = React.useState("")
  const [calendarioId, setCalendarioId] = React.useState("")
  const [quantidade, setQuantidade] = React.useState("")
  const [natureza, setNatureza] = React.useState("mercantil")
  const [dataAprovacao, setDataAprovacao] = React.useState("")
  const [dataAssinatura, setDataAssinatura] = React.useState("")
  const [dataValidade, setDataValidade] = React.useState("")
  const [strikeInfo, setStrikeInfo] = React.useState<{ preco: number; data: string } | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const supabase = React.useMemo(() => createClient(), [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (open) {
      setBeneficiarioId("")
      setTipo("stock_options")
      setPlanoId("")
      setProgramaId("")
      setCalendarioId("")
      setQuantidade("")
      setNatureza("mercantil")
      setDataAprovacao("")
      setDataAssinatura("")
      setDataValidade("")
      setStrikeInfo(null)
      setError(null)
    }
  }, [open])

  // Busca strike automaticamente quando data_aprovacao e plano são preenchidos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!dataAprovacao || !planoId) { setStrikeInfo(null); return }
    const plano = planos.find((p) => p.id === planoId)
    if (!plano?.ativo_id) { setStrikeInfo(null); return }

    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from("historico_preco_acao")
        .select("preco, data_registro")
        .eq("ativo_id", plano.ativo_id)
        .lte("data_registro", dataAprovacao)
        .order("data_registro", { ascending: false })
        .limit(1)
        .single()

      if (!cancelled && data) {
        setStrikeInfo({ preco: data.preco, data: data.data_registro })
      } else if (!cancelled) {
        setStrikeInfo(null)
      }
    })()
    return () => { cancelled = true }
  }, [dataAprovacao, planoId])

  const programas = planos.find((p) => p.id === planoId)?.programas_equity ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await criarContrato({
      orgSlug,
      beneficiario_id: beneficiarioId,
      tipo,
      plano_id: planoId,
      programa_id: programaId || null,
      calendario_id: calendarioId || null,
      quantidade_outorgada: Number(quantidade),
      natureza,
      data_aprovacao: dataAprovacao,
      data_assinatura: dataAssinatura || null,
      data_validade: dataValidade || null,
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo contrato</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label>Beneficiário</Label>
            <select
              value={beneficiarioId}
              onChange={(e) => setBeneficiarioId(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Selecione</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>{p.nome_completo}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Object.entries(tipoEquityLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Plano</Label>
            <select
              value={planoId}
              onChange={(e) => { setPlanoId(e.target.value); setProgramaId("") }}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Selecione</option>
              {planos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Programa</Label>
            <select
              value={programaId}
              onChange={(e) => setProgramaId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Nenhum</option>
              {programas.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Calendário de vesting</Label>
            <select
              value={calendarioId}
              onChange={(e) => setCalendarioId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Nenhum</option>
              {calendarios.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Quantidade outorgada</Label>
              <Input
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Natureza</Label>
              <select
                value={natureza}
                onChange={(e) => setNatureza(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {NATUREZAS.map((n) => (
                  <option key={n} value={n} className="capitalize">{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Data de aprovação</Label>
            <Input
              type="date"
              value={dataAprovacao}
              onChange={(e) => setDataAprovacao(e.target.value)}
              required
            />
            {strikeInfo && (
              <p className="text-xs text-muted-foreground">
                Strike:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(strikeInfo.preco)}
                </span>{" "}
                (preço em {formatDate(strikeInfo.data)})
              </p>
            )}
            {dataAprovacao && planoId && !strikeInfo && (
              <p className="text-xs text-amber-600">Nenhum preço registrado para essa data.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Data de assinatura</Label>
              <Input
                type="date"
                value={dataAssinatura}
                onChange={(e) => setDataAssinatura(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data de validade</Label>
              <Input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <SheetFooter className="px-0">
            <SheetClose render={<Button type="button" variant="outline" />}>Cancelar</SheetClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar contrato"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Drawer de detalhes do contrato ──────────────────────────────────────────

interface ContratoDrawerProps {
  contrato: Contrato | null
  open: boolean
  onOpenChange: (v: boolean) => void
  orgSlug: string
  onRefresh: () => void
  calendarios: Calendario[]
}

function ContratoDrawer({ contrato, open, onOpenChange, orgSlug, onRefresh, calendarios }: ContratoDrawerProps) {
  const [tab, setTab] = React.useState("info")
  const [histDesc, setHistDesc] = React.useState("")
  const [histQtd, setHistQtd] = React.useState("")
  const [histValor, setHistValor] = React.useState("")
  const [histLoading, setHistLoading] = React.useState(false)
  const [uploadLoading, setUploadLoading] = React.useState(false)
  const [statusLoading, setStatusLoading] = React.useState(false)
  const [calSelecionado, setCalSelecionado] = React.useState("")
  const [vincLoading, setVincLoading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const supabase = React.useMemo(() => createClient(), [])

  if (!contrato) return null

  const cal = contrato.calendarios_vesting
  const parcelas = cal?.parcelas_vesting ?? []
  const parcelasCalc =
    contrato.data_aprovacao && parcelas.length > 0
      ? calcularParcelasVesting(parcelas, contrato.data_aprovacao, contrato.quantidade_outorgada)
      : []

  const qtdVestida = parcelasCalc.filter((p) => p.vestida).reduce((s, p) => s + p.quantidade, 0)
  const qtdDisponivel = qtdVestida // simplificado — sem exercícios registrados
  const precoOutorgaTotal =
    contrato.preco_exercicio_strike != null
      ? contrato.preco_exercicio_strike * contrato.quantidade_outorgada
      : null

  async function handleStatusChange(status: string) {
    setStatusLoading(true)
    await atualizarStatusContrato(orgSlug, contrato!.id, status)
    setStatusLoading(false)
    onRefresh()
  }

  async function handleRegistrarHistorico(e: React.FormEvent) {
    e.preventDefault()
    setHistLoading(true)
    await adicionarHistoricoContrato({
      orgSlug,
      contrato_id: contrato!.id,
      descricao: histDesc,
      qtd_acoes: histQtd ? Number(histQtd) : null,
      valor: histValor ? Number(histValor) : null,
    })
    setHistLoading(false)
    setHistDesc("")
    setHistQtd("")
    setHistValor("")
    onRefresh()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)
    const path = `contratos/${contrato!.id}/${Date.now()}_${file.name}`
    const { error: uploadErr } = await supabase.storage
      .from("documentos")
      .upload(path, file)

    if (!uploadErr) {
      await supabase.from("documentos_contrato").insert({
        contrato_id: contrato!.id,
        nome: file.name,
        url_storage: path,
        formato: file.name.split(".").pop()?.toUpperCase() ?? "?",
        tamanho: file.size,
        data_upload: new Date().toISOString(),
      })
      onRefresh()
    }
    setUploadLoading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm("Excluir este documento?")) return
    await supabase.from("documentos_contrato").delete().eq("id", docId)
    onRefresh()
  }

  const InfoRow = ({ label, value }: { label: React.ReactNode; value: React.ReactNode }) => (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 text-sm text-muted-foreground w-48">{label}</td>
      <td className="py-2 text-sm font-medium">{value ?? "—"}</td>
    </tr>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold">{contratoId(contrato)}</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  statusContratoClass[contrato.status] ?? "bg-muted text-muted-foreground"
                )}
              >
                {statusLabel[contrato.status] ?? contrato.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {contrato.pessoas?.nome_completo ?? "—"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <div className="px-6 border-b">
            <TabsList className="h-auto p-0 bg-transparent gap-1 rounded-none">
              {[
                { value: "info", label: "Informações" },
                { value: "vesting", label: "Vesting" },
                { value: "holder", label: "Holder" },
                { value: "assinaturas", label: "Assinaturas" },
                { value: "historico", label: "Histórico" },
                { value: "documentos", label: "Documentos" },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab 1 — Informações gerais */}
          <TabsContent value="info" className="p-6 mt-0">
            <table className="w-full">
              <tbody>
                <InfoRow label="Tipo de contrato" value={tipoEquityLabel[contrato.tipo] ?? contrato.tipo} />
                <InfoRow
                  label="Status"
                  value={
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        statusContratoClass[contrato.status]
                      )}
                    >
                      {statusLabel[contrato.status] ?? contrato.status}
                    </span>
                  }
                />
                <InfoRow label="Plano" value={contrato.planos_equity?.nome} />
                <InfoRow label="Programa" value={contrato.programas_equity?.nome} />
                <InfoRow label="Qtd outorgada" value={contrato.quantidade_outorgada?.toLocaleString("pt-BR")} />
                <InfoRow label="Qtd vestida" value={qtdVestida.toLocaleString("pt-BR")} />
                <InfoRow label="Qtd disponível p/ exercício" value={qtdDisponivel.toLocaleString("pt-BR")} />
                <InfoRow label="Preço de outorga total" value={formatCurrency(precoOutorgaTotal)} />
                <InfoRow
                  label={
                    <span className="flex items-center gap-1">
                      Strike (R$)
                      <InfoIcon className="size-3 text-muted-foreground" />
                    </span>
                  }
                  value={
                    contrato.preco_exercicio_strike != null
                      ? contrato.preco_exercicio_strike.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })
                      : "—"
                  }
                />
                <InfoRow label="Natureza" value={<span className="capitalize">{contrato.natureza}</span>} />
                <InfoRow label="Data aprovação" value={formatDate(contrato.data_aprovacao)} />
                <InfoRow label="Data assinatura" value={formatDate(contrato.data_assinatura)} />
                <InfoRow label="Data validade" value={formatDate(contrato.data_validade)} />
              </tbody>
            </table>

            <div className="mt-6 flex flex-wrap gap-2">
              {contrato.status === "rascunho" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusLoading}
                  onClick={() => handleStatusChange("em_assinatura")}
                >
                  Enviar p/ assinatura
                </Button>
              )}
              {contrato.status === "em_assinatura" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusLoading}
                  onClick={() => handleStatusChange("ativo")}
                >
                  Marcar como ativo
                </Button>
              )}
              {contrato.status !== "cancelado" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={statusLoading}
                  onClick={() => handleStatusChange("cancelado")}
                >
                  Cancelar contrato
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Tab 2 — Calendário de vesting */}
          <TabsContent value="vesting" className="p-6 mt-0">
            <div className="flex flex-col gap-4">
              {/* Vincular / trocar calendário */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">Calendário de vesting</p>
                <div className="flex gap-2">
                  <select
                    value={calSelecionado || contrato.calendario_id || ""}
                    onChange={(e) => setCalSelecionado(e.target.value)}
                    className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Nenhum calendário</option>
                    {calendarios.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={vincLoading || (!calSelecionado && !contrato.calendario_id)}
                    onClick={async () => {
                      setVincLoading(true)
                      const idToSet = calSelecionado || null
                      await vincularCalendario(orgSlug, contrato.id, idToSet)
                      setVincLoading(false)
                      onRefresh()
                    }}
                  >
                    {vincLoading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
              {/* vesting timeline content */}
              {!cal ? (
                <p className="text-sm text-muted-foreground">Selecione um calendário acima para ver o progresso de vesting.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Calendário</span>
                      <p className="font-medium">{cal.nome}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Início</span>
                      <p className="font-medium">{formatDate(contrato.data_aprovacao)}</p>
                    </div>
                  </div>

                  {parcelasCalc.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Preencha a data de aprovação para calcular as parcelas.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-3 py-2 text-left text-xs text-muted-foreground">#</th>
                            <th className="px-3 py-2 text-left text-xs text-muted-foreground">Tipo</th>
                            <th className="px-3 py-2 text-left text-xs text-muted-foreground">Data subscrição</th>
                            <th className="px-3 py-2 text-left text-xs text-muted-foreground">Prazo exercício</th>
                            <th className="px-3 py-2 text-right text-xs text-muted-foreground">Qtd</th>
                            <th className="px-3 py-2 text-left text-xs text-muted-foreground w-32">Progresso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parcelasCalc.map((p) => (
                            <tr key={p.id} className="border-b last:border-0">
                              <td className="px-3 py-2 text-muted-foreground">{p.numero_parcela}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                    p.eh_cliff
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-blue-100 text-blue-700"
                                  )}
                                >
                                  {p.eh_cliff ? "Cliff" : "Normal"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm">{formatDate(p.dataSubscricao.toISOString())}</td>
                              <td className="px-3 py-2 text-sm text-muted-foreground">{p.prazo_exercicio} dias</td>
                              <td className="px-3 py-2 text-right text-sm">{p.quantidade.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-2">
                                <ProgressBar value={p.vestida ? p.quantidade : 0} max={p.quantidade} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 3 — Holder */}
          <TabsContent value="holder" className="p-6 mt-0">
            {!contrato.pessoas ? (
              <p className="text-sm text-muted-foreground">Beneficiário não encontrado.</p>
            ) : (
              <table className="w-full">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-sm text-muted-foreground w-40">Nome</td>
                    <td className="py-2 text-sm font-medium">{contrato.pessoas.nome_completo}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-sm text-muted-foreground">CPF/CNPJ</td>
                    <td className="py-2 text-sm font-medium">{contrato.pessoas.cpf_cnpj ?? "—"}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </TabsContent>

          {/* Tab 4 — Assinaturas */}
          <TabsContent value="assinaturas" className="p-6 mt-0">
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                <p className="font-medium">Integração com ClickSign — em breve</p>
                <p className="mt-1 text-xs">Envio e monitoramento de envelopes será disponibilizado em breve.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clicksign-link">Link / ID do envelope ClickSign</Label>
                <Input
                  id="clicksign-link"
                  placeholder="https://app.clicksign.com/..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 5 — Histórico */}
          <TabsContent value="historico" className="p-6 mt-0 flex flex-col gap-4">
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Data</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Descrição</th>
                    <th className="px-3 py-2 text-right text-xs text-muted-foreground">Qtd ações</th>
                    <th className="px-3 py-2 text-right text-xs text-muted-foreground">Valor</th>
                    <th className="px-3 py-2 text-right text-xs text-muted-foreground">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {(contrato.historico_contratos ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">
                        Nenhum evento registrado.
                      </td>
                    </tr>
                  ) : (
                    (contrato.historico_contratos ?? []).map((h) => (
                      <tr key={h.id} className="border-b last:border-0">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(h.data_operacao)}</td>
                        <td className="px-3 py-2">{h.descricao}</td>
                        <td className="px-3 py-2 text-right">{h.quantidade_acoes?.toLocaleString("pt-BR") ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(h.valor_operacao)}</td>
                        <td className="px-3 py-2 text-right">{h.saldo_acoes?.toLocaleString("pt-BR") ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleRegistrarHistorico} className="flex flex-col gap-3 border rounded-md p-4">
              <p className="text-sm font-semibold">Registrar evento</p>
              <div className="flex flex-col gap-1.5">
                <Label>Descrição</Label>
                <Input
                  value={histDesc}
                  onChange={(e) => setHistDesc(e.target.value)}
                  placeholder="Ex: Exercício de opções"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Qtd ações</Label>
                  <Input
                    type="number"
                    min={0}
                    value={histQtd}
                    onChange={(e) => setHistQtd(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={histValor}
                    onChange={(e) => setHistValor(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" size="sm" disabled={histLoading}>
                {histLoading ? "Registrando..." : "Registrar evento"}
              </Button>
            </form>
          </TabsContent>

          {/* Tab 6 — Documentos */}
          <TabsContent value="documentos" className="p-6 mt-0 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Documentos</p>
              <label>
                <input
                  type="file"
                  ref={fileRef}
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploadLoading}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadLoading}
                  onClick={() => fileRef.current?.click()}
                >
                  <UploadIcon className="size-3.5 mr-1.5" />
                  {uploadLoading ? "Enviando..." : "Anexar documento"}
                </Button>
              </label>
            </div>

            {(contrato.documentos_contrato ?? []).length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum documento anexado.
              </div>
            ) : (
              <div className="rounded-md border divide-y">
                {(contrato.documentos_contrato ?? []).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    <FileTextIcon className="size-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(doc.tamanho)} · {formatDate(doc.data_upload)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs uppercase flex-shrink-0">
                      {doc.formato}
                    </Badge>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

// ─── Tabela de contratos ──────────────────────────────────────────────────────

function TabelaContratos({
  contratos,
  onSelect,
}: {
  contratos: Contrato[]
  onSelect: (c: Contrato) => void
}) {
  if (contratos.length === 0) {
    return <EmptyState message="Nenhum contrato neste status." />
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Beneficiário</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Programa</TableHead>
            <TableHead className="text-right">Qtd outorgada</TableHead>
            <TableHead>Data aprovação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progresso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contratos.map((c) => {
            const parcelas = c.calendarios_vesting?.parcelas_vesting ?? []
            const parcelasCalc =
              c.data_aprovacao && parcelas.length > 0
                ? calcularParcelasVesting(parcelas, c.data_aprovacao, c.quantidade_outorgada)
                : []
            const qtdVestida = parcelasCalc.filter((p) => p.vestida).reduce((s, p) => s + p.quantidade, 0)

            return (
              <TableRow
                key={c.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => onSelect(c)}
              >
                <TableCell className="font-mono text-sm font-semibold">{contratoId(c)}</TableCell>
                <TableCell className="text-sm">{c.pessoas?.nome_completo ?? "—"}</TableCell>
                <TableCell>
                  <span className="text-xs">{tipoEquityLabel[c.tipo] ?? c.tipo}</span>
                </TableCell>
                <TableCell className="text-sm">{c.planos_equity?.nome ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.programas_equity?.nome ?? "—"}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {c.quantidade_outorgada?.toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(c.data_aprovacao)}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                      statusContratoClass[c.status] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {statusLabel[c.status] ?? c.status}
                  </span>
                </TableCell>
                <TableCell className="w-32">
                  <ProgressBar value={qtdVestida} max={c.quantidade_outorgada} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContratosPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [contratos, setContratos] = React.useState<Contrato[]>([])
  const [planos, setPlanos] = React.useState<Plano[]>([])
  const [calendarios, setCalendarios] = React.useState<Calendario[]>([])
  const [pessoas, setPessoas] = React.useState<Pessoa[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busca, setBusca] = React.useState("")
  const [novoSheet, setNovoSheet] = React.useState(false)
  const [selectedContrato, setSelectedContrato] = React.useState<Contrato | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

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

    const [
      { data: contratosData },
      { data: planosData },
      { data: calData },
      { data: pessoasData },
    ] = await Promise.all([
      supabase
        .from("contratos_equity")
        .select(
          `*, pessoas(*), planos_equity(*, ativos(*), programas_equity(*)), programas_equity(*), calendarios_vesting(*, parcelas_vesting(*)), historico_contratos(*), documentos_contrato(*)`
        )
        .eq("organizacao_id", orgId)
        .order("sequencial", { ascending: false }),
      supabase
        .from("planos_equity")
        .select("id, nome, tipo, ativo_id, ativos(id, codigo, tipo), programas_equity(*)")
        .eq("organizacao_id", orgId),
      supabase
        .from("calendarios_vesting")
        .select("id, nome, parcelas_vesting(*)")
        .eq("organizacao_id", orgId),
      supabase
        .from("pessoas")
        .select("id, nome_completo, cpf_cnpj")
        .eq("organizacao_id", orgId),
    ])

    setContratos((contratosData as unknown as Contrato[]) ?? [])
    setPlanos((planosData as unknown as Plano[]) ?? [])
    setCalendarios((calData as unknown as Calendario[]) ?? [])
    setPessoas((pessoasData as unknown as Pessoa[]) ?? [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { fetchData() }, [orgSlug])

  // Sync selected contrato with fresh data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (selectedContrato) {
      const fresh = contratos.find((c) => c.id === selectedContrato.id)
      if (fresh) setSelectedContrato(fresh)
    }
  }, [contratos])

  function openDrawer(c: Contrato) {
    setSelectedContrato(c)
    setDrawerOpen(true)
  }

  const filtrados = contratos.filter((c) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      c.pessoas?.nome_completo?.toLowerCase().includes(q) ||
      c.planos_equity?.nome?.toLowerCase().includes(q) ||
      contratoId(c).toLowerCase().includes(q)
    )
  })

  const rascunhos = filtrados.filter((c) => c.status === "rascunho")
  const emAssinatura = filtrados.filter((c) => c.status === "em_assinatura")
  const ativos = filtrados.filter((c) => c.status === "ativo")

  const totalAtivos = contratos.filter((c) => c.status === "ativo").length
  const total = contratos.length

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Contratos de Equity"
        description="Gerencie todos os contratos de equity da organização"
        icon={TrendingUpIcon}
        iconGradient="from-violet-400 to-violet-600"
      />

    <div className="flex flex-col gap-6 p-6">
      {/* Barra global */}
      <div className="rounded-lg border p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Contratos ativos</span>
          <span className="text-muted-foreground">
            {totalAtivos} ativos de {total} total
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: total > 0 ? `${Math.round((totalAtivos / total) * 100)}%` : "0%" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Total: {total} contratos</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, plano ou ID..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm">
          <SlidersHorizontalIcon className="size-3.5 mr-1.5" /> Filtros
        </Button>
        <Button onClick={() => setNovoSheet(true)}>
          <PlusIcon className="size-4 mr-2" /> Novo contrato
        </Button>
      </div>

      {/* Abas por status */}
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <Tabs defaultValue="rascunho">
          <TabsList>
            <TabsTrigger value="rascunho">
              Rascunho
              {rascunhos.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted px-1.5 text-xs">
                  {rascunhos.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="em_assinatura">
              Em Assinatura
              {emAssinatura.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 px-1.5 text-xs">
                  {emAssinatura.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ativo">
              Contratos Ativos
              {ativos.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-green-100 text-green-700 px-1.5 text-xs">
                  {ativos.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="rascunho" className="mt-4">
            <TabelaContratos contratos={rascunhos} onSelect={openDrawer} />
          </TabsContent>
          <TabsContent value="em_assinatura" className="mt-4">
            <TabelaContratos contratos={emAssinatura} onSelect={openDrawer} />
          </TabsContent>
          <TabsContent value="ativo" className="mt-4">
            <TabelaContratos contratos={ativos} onSelect={openDrawer} />
          </TabsContent>
        </Tabs>
      )}

      {/* Formulário novo contrato */}
      <NovoContratoSheet
        open={novoSheet}
        onOpenChange={setNovoSheet}
        orgSlug={orgSlug}
        planos={planos}
        calendarios={calendarios}
        pessoas={pessoas}
        onSuccess={fetchData}
      />

      {/* Drawer detalhe */}
      <ContratoDrawer
        contrato={selectedContrato}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        orgSlug={orgSlug}
        onRefresh={fetchData}
        calendarios={calendarios}
      />
    </div>
    </div>
  )
}
