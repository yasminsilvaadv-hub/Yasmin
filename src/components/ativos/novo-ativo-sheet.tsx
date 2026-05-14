"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type TipoAtivo = "acao" | "debenture" | "conversivel" | "quota"

interface NovoAtivoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: TipoAtivo
  organizacaoId: string
  onSuccess: () => void
}

const tipoLabels: Record<TipoAtivo, string> = {
  acao: "Ação",
  debenture: "Debênture",
  conversivel: "Título Conversível",
  quota: "Quota",
}

export function NovoAtivoSheet({
  open,
  onOpenChange,
  tipo,
  organizacaoId,
  onSuccess,
}: NovoAtivoSheetProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Ação fields
  const [codigo, setCodigo] = React.useState("")
  const [especie, setEspecie] = React.useState("ordinaria")
  const [nomeClasse, setNomeClasse] = React.useState("")
  const [votosPorAcao, setVotosPorAcao] = React.useState("")

  // Debênture fields
  const [serie, setSerie] = React.useState("")
  const [emissao, setEmissao] = React.useState("")
  const [vencimento, setVencimento] = React.useState("")
  const [remuneracao, setRemuneracao] = React.useState("")
  const [conversivel, setConversivel] = React.useState(false)

  // Conversível fields
  const [valuationCap, setValuationCap] = React.useState("")
  const [discountRate, setDiscountRate] = React.useState("")
  const [prazoConversao, setPrazoConversao] = React.useState("")

  const resetForm = () => {
    setCodigo("")
    setEspecie("ordinaria")
    setNomeClasse("")
    setVotosPorAcao("")
    setSerie("")
    setEmissao("")
    setVencimento("")
    setRemuneracao("")
    setConversivel(false)
    setValuationCap("")
    setDiscountRate("")
    setPrazoConversao("")
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    let parametros: Record<string, unknown> = {}

    if (tipo === "debenture") {
      parametros = {
        serie,
        emissao,
        vencimento,
        remuneracao,
        conversivel,
      }
    } else if (tipo === "conversivel") {
      parametros = {
        valuation_cap: valuationCap,
        discount_rate: discountRate,
        prazo_conversao: prazoConversao,
      }
    }

    const payload: Record<string, unknown> = {
      organizacao_id: organizacaoId,
      tipo,
      codigo,
      parametros: Object.keys(parametros).length > 0 ? parametros : null,
    }

    if (tipo === "acao" || tipo === "quota") {
      payload.especie = tipo === "acao" ? especie : null
      payload.nome_classe = nomeClasse
      payload.votos_por_acao = votosPorAcao ? Number(votosPorAcao) : null
    }

    const { error: insertError } = await supabase.from("ativos").insert(payload)

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    resetForm()
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm() }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>Novo(a) {tipoLabels[tipo]}</SheetTitle>
          <SheetDescription>
            Preencha os dados para cadastrar {tipo === "acao" ? "uma nova ação" : tipo === "debenture" ? "uma nova debênture" : tipo === "conversivel" ? "um novo título conversível" : "uma nova quota"}.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
          {/* Campo Código — presente em todos */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder={tipo === "acao" ? "Ex: ON, PN, PNA" : "Ex: DEB-01"}
              required
            />
          </div>

          {/* AÇÃO */}
          {tipo === "acao" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="especie">Espécie</Label>
                <select
                  id="especie"
                  value={especie}
                  onChange={(e) => setEspecie(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="ordinaria">Ordinária</option>
                  <option value="preferencial">Preferencial</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome-classe">Nome da classe</Label>
                <Input
                  id="nome-classe"
                  value={nomeClasse}
                  onChange={(e) => setNomeClasse(e.target.value)}
                  placeholder="Ex: Classe A"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="votos">Votos por ação</Label>
                <Input
                  id="votos"
                  type="number"
                  min="0"
                  value={votosPorAcao}
                  onChange={(e) => setVotosPorAcao(e.target.value)}
                  placeholder="Ex: 1"
                />
              </div>
            </>
          )}

          {/* DEBÊNTURE */}
          {tipo === "debenture" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="serie">Série</Label>
                <Input
                  id="serie"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="Ex: 1ª Série"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emissao">Data de emissão</Label>
                <Input
                  id="emissao"
                  type="date"
                  value={emissao}
                  onChange={(e) => setEmissao(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vencimento">Data de vencimento</Label>
                <Input
                  id="vencimento"
                  type="date"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="remuneracao">Remuneração</Label>
                <Input
                  id="remuneracao"
                  value={remuneracao}
                  onChange={(e) => setRemuneracao(e.target.value)}
                  placeholder="Ex: CDI + 2% a.a."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="conversivel"
                  type="checkbox"
                  checked={conversivel}
                  onChange={(e) => setConversivel(e.target.checked)}
                  className="size-4 rounded border-input accent-primary"
                />
                <Label htmlFor="conversivel">Conversível em ações</Label>
              </div>
            </>
          )}

          {/* TÍTULO CONVERSÍVEL */}
          {tipo === "conversivel" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valuation-cap">Valuation cap</Label>
                <Input
                  id="valuation-cap"
                  value={valuationCap}
                  onChange={(e) => setValuationCap(e.target.value)}
                  placeholder="Ex: R$ 10.000.000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="discount-rate">Discount rate</Label>
                <Input
                  id="discount-rate"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(e.target.value)}
                  placeholder="Ex: 20%"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prazo">Prazo de conversão</Label>
                <Input
                  id="prazo"
                  value={prazoConversao}
                  onChange={(e) => setPrazoConversao(e.target.value)}
                  placeholder="Ex: 24 meses"
                />
              </div>
            </>
          )}

          {/* QUOTA */}
          {tipo === "quota" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome-classe-quota">Nome da classe</Label>
                <Input
                  id="nome-classe-quota"
                  value={nomeClasse}
                  onChange={(e) => setNomeClasse(e.target.value)}
                  placeholder="Ex: Quotas Ordinárias"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="votos-quota">Votos por quota</Label>
                <Input
                  id="votos-quota"
                  type="number"
                  min="0"
                  value={votosPorAcao}
                  onChange={(e) => setVotosPorAcao(e.target.value)}
                  placeholder="Ex: 1"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <SheetFooter className="px-0 pt-2">
            <SheetClose render={<Button variant="outline" type="button" />}>
              Cancelar
            </SheetClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
