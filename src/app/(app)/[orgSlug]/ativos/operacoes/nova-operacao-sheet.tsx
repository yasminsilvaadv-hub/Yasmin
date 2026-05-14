'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { criarOperacao } from '@/app/actions/operacoes'
import type { TipoOperacao, AtivoSimples, PessoaSimples } from './types'
import { TIPOS_OPERACAO } from './utils'

interface Props {
  open: boolean
  onClose: () => void
  tipoInicial?: TipoOperacao
  orgSlug: string
  ativos: AtivoSimples[]
  pessoas: PessoaSimples[]
}

const sel = 'h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50'

export function NovaOperacaoSheet({ open, onClose, tipoInicial = 'emissao', orgSlug, ativos, pessoas }: Props) {
  const [tipo, setTipo] = React.useState<TipoOperacao>(tipoInicial)
  const [loading, setLoading] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)

  React.useEffect(() => { setTipo(tipoInicial) }, [tipoInicial, open])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const get = (k: string) => (fd.get(k) as string) || null

    const ativo_id = get('ativo_id')
    const data_operacao = get('data_operacao')
    const quantidadeStr = get('quantidade')

    if (!ativo_id || !data_operacao || !quantidadeStr) {
      setErro('Preencha todos os campos obrigatórios.')
      setLoading(false)
      return
    }

    const quantidade = parseFloat(quantidadeStr)
    if (isNaN(quantidade) || quantidade <= 0) {
      setErro('Quantidade inválida.')
      setLoading(false)
      return
    }

    const metadata: Record<string, unknown> = {}
    const tipoOnus = get('tipo_onus')
    const descricao = get('descricao')
    const fatorStr = get('fator')
    if (tipoOnus) metadata.tipo_onus = tipoOnus
    if (descricao) metadata.descricao = descricao
    if (fatorStr) metadata.fator = parseFloat(fatorStr)

    const result = await criarOperacao({
      orgSlug,
      ativo_id,
      tipo,
      quantidade,
      data_operacao,
      origem_id: get('origem_id'),
      destino_id: get('destino_id'),
      preco_unitario: get('preco_unitario') ? parseFloat(get('preco_unitario')!) : null,
      motivo: get('motivo'),
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    })

    setLoading(false)
    if (result.error) { setErro(result.error) } else { onClose() }
  }

  const nowStr = format(new Date(), "yyyy-MM-dd'T'HH:mm")

  const SelectPessoa = ({ id, label }: { id: string; label: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name={id} className={sel}>
        <option value="">Selecione…</option>
        {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle>Nova operação</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo de operação</Label>
              <select name="tipo" className={sel} value={tipo} onChange={e => setTipo(e.target.value as TipoOperacao)}>
                {TIPOS_OPERACAO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Ativo */}
            <div className="space-y-1.5">
              <Label htmlFor="ativo_id">Ativo *</Label>
              <select id="ativo_id" name="ativo_id" required className={sel}>
                <option value="">Selecione o ativo…</option>
                {ativos.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.codigo}{a.especie ? ` — ${a.especie}` : ''}{a.nome_classe ? ` (${a.nome_classe})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <Label htmlFor="data_operacao">Data e hora *</Label>
              <Input type="datetime-local" id="data_operacao" name="data_operacao" defaultValue={nowStr} required />
            </div>

            {/* Quantidade */}
            <div className="space-y-1.5">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input type="number" id="quantidade" name="quantidade" min="0" step="any" placeholder="0" required />
            </div>

            {/* Emissão */}
            {tipo === 'emissao' && <>
              <SelectPessoa id="destino_id" label="Destinatário" />
              <div className="space-y-1.5">
                <Label htmlFor="preco_unitario">Preço unitário (R$)</Label>
                <Input type="number" id="preco_unitario" name="preco_unitario" min="0" step="any" placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motivo">Motivo</Label>
                <Input type="text" id="motivo" name="motivo" placeholder="Opcional" />
              </div>
            </>}

            {/* Transferência */}
            {tipo === 'transferencia' && <>
              <SelectPessoa id="origem_id" label="Origem" />
              <SelectPessoa id="destino_id" label="Destino" />
              <div className="space-y-1.5">
                <Label htmlFor="preco_unitario">Preço unitário (R$)</Label>
                <Input type="number" id="preco_unitario" name="preco_unitario" min="0" step="any" placeholder="0,00" />
              </div>
            </>}

            {/* Cancelamento */}
            {tipo === 'cancelamento' && <>
              <SelectPessoa id="origem_id" label="Origem" />
              <div className="space-y-1.5">
                <Label htmlFor="motivo">Motivo</Label>
                <Input type="text" id="motivo" name="motivo" placeholder="Opcional" />
              </div>
            </>}

            {/* Ônus constituição */}
            {tipo === 'onus_constituicao' && <>
              <SelectPessoa id="origem_id" label="Proprietário(a)" />
              <div className="space-y-1.5">
                <Label htmlFor="tipo_onus">Tipo de ônus</Label>
                <Input type="text" id="tipo_onus" name="tipo_onus" placeholder="Ex: penhor, alienação fiduciária…" />
              </div>
              <SelectPessoa id="destino_id" label="Contraparte" />
              <div className="space-y-1.5">
                <Label htmlFor="descricao">Descrição</Label>
                <textarea id="descricao" name="descricao" rows={3} placeholder="Opcional"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 resize-none" />
              </div>
            </>}

            {/* Ônus extinção */}
            {tipo === 'onus_extincao' && <>
              <SelectPessoa id="origem_id" label="Proprietário(a)" />
              <SelectPessoa id="destino_id" label="Contraparte" />
            </>}

            {/* Bonificação / Desdobramento / Grupamento */}
            {(tipo === 'bonificacao' || tipo === 'desdobramento' || tipo === 'grupamento') && <>
              <SelectPessoa id="destino_id" label="Destinatário" />
              <div className="space-y-1.5">
                <Label htmlFor="fator">Fator</Label>
                <Input type="number" id="fator" name="fator" min="0" step="any" placeholder="Ex: 1.1" />
              </div>
            </>}

            {erro && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{erro}</p>
              </div>
            )}
          </div>

          <SheetFooter className="border-t px-5 py-3 flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Salvando…' : 'Salvar operação'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
