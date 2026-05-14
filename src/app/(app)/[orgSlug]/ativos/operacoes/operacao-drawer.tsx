'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MoreHorizontalIcon } from 'lucide-react'
import type { OperacaoRow } from './types'
import { tipoLabel } from './utils'

interface Props {
  operacao: OperacaoRow | null
  open: boolean
  onClose: () => void
}

function Campo({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export function OperacaoDrawer({ operacao, open, onClose }: Props) {
  if (!operacao) return null

  const dataFormatada = format(
    new Date(operacao.data_operacao),
    "dd/MM/yyyy 'às' HH:mm",
    { locale: ptBR }
  )

  const tipo = tipoLabel(operacao.tipo_operacao)
  const codigo = operacao.ativo?.codigo ?? '—'
  const especie = operacao.ativo?.especie ?? ''
  const nomeClasse = operacao.ativo?.nome_classe ?? '—'
  const tipoAtivo = operacao.ativo?.tipo ?? '—'

  const origem = operacao.pessoa_origem
  const destino = operacao.pessoa_destino

  const meta = (operacao.metadata ?? {}) as Record<string, string>

  const drawerTitle = `${tipo} | ${codigo}${especie ? ` (${especie})` : ''}`

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3 pr-8">
            <SheetTitle className="text-base leading-snug">{drawerTitle}</SheetTitle>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline">Editar</Button>
              <Button size="icon-sm" variant="ghost">
                <MoreHorizontalIcon />
                <span className="sr-only">Mais opções</span>
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="operacao" className="flex flex-col h-full">
            <TabsList className="px-5 border-b border-border rounded-none w-full h-auto pb-0 justify-start gap-0">
              {['operacao', 'documentos', 'historico', 'proprietario', 'contraparte', 'ativo'].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="rounded-none border-b-2 border-transparent data-active:border-foreground pb-2 px-3 text-xs capitalize"
                >
                  {tab === 'operacao' ? 'Operação' :
                   tab === 'documentos' ? 'Documentos' :
                   tab === 'historico' ? 'Histórico' :
                   tab === 'proprietario' ? 'Proprietário(a)' :
                   tab === 'contraparte' ? 'Contraparte' :
                   'Ativo'}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Aba 1 — Operação */}
            <TabsContent value="operacao" className="px-5 py-4">
              <div className="divide-y divide-border/50">
                <Campo label="Data e hora" value={dataFormatada} />
                <Campo label="Ativo" value={`${codigo}${especie ? ` — ${especie}` : ''}`} />
                {meta.tipo_onus && <Campo label="Tipo de ônus" value={meta.tipo_onus} />}
                {origem && (
                  <Campo
                    label="Proprietário(a)"
                    value={`${origem.nome}${origem.cpf_cnpj ? ` — ${origem.cpf_cnpj}` : ''}`}
                  />
                )}
                <Campo label="Quantidade" value={Number(operacao.quantidade).toLocaleString('pt-BR')} />
                {destino && (
                  <Campo
                    label="Contraparte"
                    value={`${destino.nome}${destino.cpf_cnpj ? ` — ${destino.cpf_cnpj}` : ''}`}
                  />
                )}
                {operacao.preco_unitario != null && (
                  <Campo
                    label="Preço unitário"
                    value={Number(operacao.preco_unitario).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  />
                )}
                {operacao.motivo && <Campo label="Motivo" value={operacao.motivo} />}
                {meta.descricao && <Campo label="Mais informações" value={meta.descricao} />}
              </div>
            </TabsContent>

            {/* Aba 2 — Documentos */}
            <TabsContent value="documentos" className="px-5 py-10 text-center text-muted-foreground text-sm">
              Nenhum documento anexado
            </TabsContent>

            {/* Aba 3 — Histórico */}
            <TabsContent value="historico" className="px-5 py-10 text-center text-muted-foreground text-sm">
              Nenhuma alteração registrada
            </TabsContent>

            {/* Aba 4 — Proprietário(a) */}
            <TabsContent value="proprietario" className="px-5 py-4">
              {origem ? (
                <div className="divide-y divide-border/50">
                  <Campo label="Nome" value={origem.nome} />
                  <Campo label="CPF/CNPJ" value={origem.cpf_cnpj ?? '—'} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">Sem proprietário(a) registrado</p>
              )}
            </TabsContent>

            {/* Aba 5 — Contraparte */}
            <TabsContent value="contraparte" className="px-5 py-4">
              {destino ? (
                <div className="divide-y divide-border/50">
                  <Campo label="Nome" value={destino.nome} />
                  <Campo label="CPF/CNPJ" value={destino.cpf_cnpj ?? '—'} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">Sem contraparte registrada</p>
              )}
            </TabsContent>

            {/* Aba 6 — Ativo */}
            <TabsContent value="ativo" className="px-5 py-4">
              <div className="divide-y divide-border/50">
                <Campo label="Código" value={codigo} />
                <Campo label="Espécie" value={especie || '—'} />
                <Campo label="Classe" value={nomeClasse} />
                <Campo label="Tipo" value={tipoAtivo} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
