"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams } from "next/navigation"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { NovoAtivoSheet, TipoAtivo } from "@/components/ativos/novo-ativo-sheet"
import {
  PlusIcon,
  SearchIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  FileTextIcon,
  InfoIcon,
  LandmarkIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/page-header"

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface Ativo {
  id: string
  organizacao_id: string
  tipo: TipoAtivo
  codigo: string
  especie: string | null
  nome_classe: string | null
  votos_por_acao: number | null
  parametros: Record<string, unknown> | null
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function CodigoBadge({ codigo }: { codigo: string }) {
  const upper = codigo.toUpperCase()
  const colorMap: Record<string, string> = {
    ON: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    PN: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    PNA: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
    PNB: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  }
  const colorClass = colorMap[upper] ?? "bg-muted text-muted-foreground"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        colorClass
      )}
    >
      {upper}
    </span>
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

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "—"
  try {
    return new Date(value).toLocaleDateString("pt-BR")
  } catch {
    return String(value)
  }
}

// ────────────────────────────────────────────────────────────
// Row com expansão
// ────────────────────────────────────────────────────────────
function AtivoRow({
  children,
  maisInfoContent,
  onEdit,
  onDelete,
}: {
  children: React.ReactNode
  maisInfoContent: React.ReactNode
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <tr className="border-b transition-colors hover:bg-muted/40">
        {children}
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Expandir detalhes"
            >
              <ChevronDownIcon
                className={cn(
                  "size-4 transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Abrir menu"
                  />
                }
              >
                <MoreHorizontalIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <PencilIcon />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2Icon />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-b bg-muted/20">
          <td colSpan={99} className="px-4 py-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <InfoIcon className="size-3" />
                  Mais informações
                </p>
                {maisInfoContent}
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileTextIcon className="size-3" />
                  Documentos
                </p>
                <p className="text-sm text-muted-foreground">
                  Nenhum documento anexado.
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ────────────────────────────────────────────────────────────
// Tabela genérica wrapper
// ────────────────────────────────────────────────────────────
function TabelaAtivos({
  headers,
  children,
}: {
  headers: string[]
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {h}
              </th>
            ))}
            <th className="w-16 px-3 py-2" />
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Skeleton loader for table
// ────────────────────────────────────────────────────────────
function TableSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {[...Array(cols)].map((_, i) => (
              <th key={i} className="px-3 py-2">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </th>
            ))}
            <th className="w-16 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {[...Array(3)].map((_, i) => (
            <tr key={i} className="border-b">
              {[...Array(cols)].map((_, j) => (
                <td key={j} className="px-3 py-2.5">
                  <div className={`h-3 rounded bg-muted animate-pulse ${j === 0 ? 'w-16' : 'w-24'}`} />
                </td>
              ))}
              <td className="px-3 py-2.5 w-16">
                <div className="h-6 w-6 rounded bg-muted animate-pulse ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────
export default function AtivosPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [orgId, setOrgId] = React.useState<string | null>(null)
  const [ativos, setAtivos] = React.useState<Ativo[]>([])
  const [loading, setLoading] = React.useState(true)

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetTipo, setSheetTipo] = React.useState<TipoAtivo>("acao")

  const [buscaAcao, setBuscaAcao] = React.useState("")
  const [buscaDebenture, setBuscaDebenture] = React.useState("")
  const [buscaConversivel, setBuscaConversivel] = React.useState("")
  const [buscaQuota, setBuscaQuota] = React.useState("")

  // ── load org + ativos ──────────────────────────────────────
  const load = React.useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    const { data: org } = await supabase
      .from("organizacoes")
      .select("id")
      .eq("slug", orgSlug)
      .single()

    if (!org) {
      setLoading(false)
      return
    }

    setOrgId(org.id)

    const { data } = await supabase
      .from("ativos")
      .select("*")
      .eq("organizacao_id", org.id)
      .order("codigo", { ascending: true })

    setAtivos((data as Ativo[]) ?? [])
    setLoading(false)
  }, [orgSlug])

  React.useEffect(() => {
    load()
  }, [load])

  // ── helpers ────────────────────────────────────────────────
  const openSheet = (tipo: TipoAtivo) => {
    setSheetTipo(tipo)
    setSheetOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este ativo?")) return
    const supabase = createClient()
    await supabase.from("ativos").delete().eq("id", id)
    load()
  }

  const ativosPorTipo = (tipo: TipoAtivo, busca: string) =>
    ativos.filter(
      (a) =>
        a.tipo === tipo &&
        (busca === "" ||
          a.codigo.toLowerCase().includes(busca.toLowerCase()) ||
          (a.nome_classe ?? "").toLowerCase().includes(busca.toLowerCase()))
    )

  // ── render helpers ─────────────────────────────────────────
  const renderAcoes = () => {
    const lista = ativosPorTipo("acao", buscaAcao)
    if (!loading && lista.length === 0) {
      return (
        <EmptyState message="Nenhuma ação cadastrada. Clique em 'Nova ação' para começar." />
      )
    }
    return (
      <TabelaAtivos
        headers={["Código", "Espécie", "Nome da classe", "Votos por ação"]}
      >
        {lista.map((a) => (
          <AtivoRow
            key={a.id}
            onEdit={() => openSheet("acao")}
            onDelete={() => handleDelete(a.id)}
            maisInfoContent={
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Espécie</dt>
                <dd className="capitalize">{a.especie ?? "—"}</dd>
                <dt className="text-muted-foreground">Classe</dt>
                <dd>{a.nome_classe ?? "—"}</dd>
                <dt className="text-muted-foreground">Votos</dt>
                <dd>{a.votos_por_acao ?? "—"}</dd>
              </dl>
            }
          >
            <td className="px-3 py-2">
              <CodigoBadge codigo={a.codigo} />
            </td>
            <td className="px-3 py-2 capitalize">
              {a.especie === "ordinaria"
                ? "Ordinária"
                : a.especie === "preferencial"
                ? "Preferencial"
                : a.especie ?? "—"}
            </td>
            <td className="px-3 py-2 text-muted-foreground">
              {a.nome_classe ?? "—"}
            </td>
            <td className="px-3 py-2">{a.votos_por_acao ?? "—"}</td>
          </AtivoRow>
        ))}
      </TabelaAtivos>
    )
  }

  const renderDebentures = () => {
    const lista = ativosPorTipo("debenture", buscaDebenture)
    if (!loading && lista.length === 0) {
      return (
        <EmptyState message="Nenhuma debênture cadastrada. Clique em 'Nova debênture' para começar." />
      )
    }
    return (
      <TabelaAtivos
        headers={["Código", "Série", "Emissão", "Vencimento", "Remuneração", "Conversível?"]}
      >
        {lista.map((a) => {
          const p = (a.parametros ?? {}) as Record<string, unknown>
          return (
            <AtivoRow
              key={a.id}
              onEdit={() => openSheet("debenture")}
              onDelete={() => handleDelete(a.id)}
              maisInfoContent={
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Série</dt>
                  <dd>{(p.serie as string) ?? "—"}</dd>
                  <dt className="text-muted-foreground">Emissão</dt>
                  <dd>{formatDate(p.emissao)}</dd>
                  <dt className="text-muted-foreground">Vencimento</dt>
                  <dd>{formatDate(p.vencimento)}</dd>
                  <dt className="text-muted-foreground">Remuneração</dt>
                  <dd>{(p.remuneracao as string) ?? "—"}</dd>
                  <dt className="text-muted-foreground">Conversível</dt>
                  <dd>{p.conversivel ? "Sim" : "Não"}</dd>
                </dl>
              }
            >
              <td className="px-3 py-2">
                <CodigoBadge codigo={a.codigo} />
              </td>
              <td className="px-3 py-2">{(p.serie as string) ?? "—"}</td>
              <td className="px-3 py-2">{formatDate(p.emissao)}</td>
              <td className="px-3 py-2">{formatDate(p.vencimento)}</td>
              <td className="px-3 py-2">{(p.remuneracao as string) ?? "—"}</td>
              <td className="px-3 py-2">
                {p.conversivel ? (
                  <Badge variant="secondary">Sim</Badge>
                ) : (
                  <span className="text-muted-foreground">Não</span>
                )}
              </td>
            </AtivoRow>
          )
        })}
      </TabelaAtivos>
    )
  }

  const renderConversiveis = () => {
    const lista = ativosPorTipo("conversivel", buscaConversivel)
    if (!loading && lista.length === 0) {
      return (
        <EmptyState message="Nenhum título conversível cadastrado. Clique em 'Novo título conversível' para começar." />
      )
    }
    return (
      <TabelaAtivos
        headers={["Código", "Valuation cap", "Discount rate", "Prazo de conversão"]}
      >
        {lista.map((a) => {
          const p = (a.parametros ?? {}) as Record<string, unknown>
          return (
            <AtivoRow
              key={a.id}
              onEdit={() => openSheet("conversivel")}
              onDelete={() => handleDelete(a.id)}
              maisInfoContent={
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Valuation cap</dt>
                  <dd>{(p.valuation_cap as string) ?? "—"}</dd>
                  <dt className="text-muted-foreground">Discount rate</dt>
                  <dd>{(p.discount_rate as string) ?? "—"}</dd>
                  <dt className="text-muted-foreground">Prazo</dt>
                  <dd>{(p.prazo_conversao as string) ?? "—"}</dd>
                </dl>
              }
            >
              <td className="px-3 py-2">
                <CodigoBadge codigo={a.codigo} />
              </td>
              <td className="px-3 py-2">{(p.valuation_cap as string) ?? "—"}</td>
              <td className="px-3 py-2">{(p.discount_rate as string) ?? "—"}</td>
              <td className="px-3 py-2">{(p.prazo_conversao as string) ?? "—"}</td>
            </AtivoRow>
          )
        })}
      </TabelaAtivos>
    )
  }

  const renderQuotas = () => {
    const lista = ativosPorTipo("quota", buscaQuota)
    if (!loading && lista.length === 0) {
      return (
        <EmptyState message="Nenhuma quota cadastrada. Clique em 'Nova quota' para começar." />
      )
    }
    return (
      <TabelaAtivos
        headers={["Código", "Nome da classe", "Votos por quota"]}
      >
        {lista.map((a) => (
          <AtivoRow
            key={a.id}
            onEdit={() => openSheet("quota")}
            onDelete={() => handleDelete(a.id)}
            maisInfoContent={
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Classe</dt>
                <dd>{a.nome_classe ?? "—"}</dd>
                <dt className="text-muted-foreground">Votos</dt>
                <dd>{a.votos_por_acao ?? "—"}</dd>
              </dl>
            }
          >
            <td className="px-3 py-2">
              <CodigoBadge codigo={a.codigo} />
            </td>
            <td className="px-3 py-2 text-muted-foreground">
              {a.nome_classe ?? "—"}
            </td>
            <td className="px-3 py-2">{a.votos_por_acao ?? "—"}</td>
          </AtivoRow>
        ))}
      </TabelaAtivos>
    )
  }

  // ── render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Ativos"
        description="Ações, debêntures, títulos conversíveis e quotas"
        icon={LandmarkIcon}
        iconGradient="from-amber-400 to-amber-600"
      />

      <div className="p-6">
      <Tabs defaultValue="acoes">
        <TabsList>
          <TabsTrigger value="acoes">Ações</TabsTrigger>
          <TabsTrigger value="debentures">Debêntures</TabsTrigger>
          <TabsTrigger value="conversiveis">Títulos Conversíveis</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
        </TabsList>

        {/* ── Ações ───────────────────────────────────────── */}
        <TabsContent value="acoes" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar ações..."
                value={buscaAcao}
                onChange={(e) => setBuscaAcao(e.target.value)}
              />
            </div>
            <Button onClick={() => openSheet("acao")}>
              <PlusIcon />
              Nova ação
            </Button>
          </div>
          {loading ? <TableSkeleton cols={4} /> : renderAcoes()}
        </TabsContent>

        {/* ── Debêntures ──────────────────────────────────── */}
        <TabsContent value="debentures" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar debêntures..."
                value={buscaDebenture}
                onChange={(e) => setBuscaDebenture(e.target.value)}
              />
            </div>
            <Button onClick={() => openSheet("debenture")}>
              <PlusIcon />
              Nova debênture
            </Button>
          </div>
          {loading ? <TableSkeleton cols={6} /> : renderDebentures()}
        </TabsContent>

        {/* ── Títulos Conversíveis ─────────────────────────── */}
        <TabsContent value="conversiveis" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar títulos conversíveis..."
                value={buscaConversivel}
                onChange={(e) => setBuscaConversivel(e.target.value)}
              />
            </div>
            <Button onClick={() => openSheet("conversivel")}>
              <PlusIcon />
              Novo título conversível
            </Button>
          </div>
          {loading ? <TableSkeleton cols={4} /> : renderConversiveis()}
        </TabsContent>

        {/* ── Quotas ──────────────────────────────────────── */}
        <TabsContent value="quotas" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar quotas..."
                value={buscaQuota}
                onChange={(e) => setBuscaQuota(e.target.value)}
              />
            </div>
            <Button onClick={() => openSheet("quota")}>
              <PlusIcon />
              Nova quota
            </Button>
          </div>
          {loading ? <TableSkeleton cols={3} /> : renderQuotas()}
        </TabsContent>
      </Tabs>

      {/* Sheet de criação */}
      {orgId && (
        <NovoAtivoSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          tipo={sheetTipo}
          organizacaoId={orgId}
          onSuccess={load}
        />
      )}
      </div>
    </div>
  )
}
