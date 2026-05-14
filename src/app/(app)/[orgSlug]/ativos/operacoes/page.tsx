import { createClient } from '@/lib/supabase/server'
import { OperacoesTabela } from './operacoes-tabela'
import type { OperacaoRow, AtivoSimples, PessoaSimples } from './types'
import { PageHeader } from '@/components/shared/page-header'
import { ListIcon } from 'lucide-react'

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function OperacoesPage({ params }: Props) {
  const { orgSlug } = await params
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    return (
      <div className="p-6">
        <p className="text-destructive text-sm">Organização não encontrada.</p>
      </div>
    )
  }

  // Buscar operações — nomes corretos do banco
  const { data: operacoesRaw } = await supabase
    .from('operacoes_ativos')
    .select(`
      id,
      data_operacao,
      tipo_operacao,
      quantidade,
      preco_unitario,
      motivo,
      metadata,
      ativo:ativos ( id, codigo, especie, tipo, nome_classe ),
      pessoa_origem:pessoas!operacoes_ativos_origem_id_fkey ( id, nome_completo, cpf_cnpj ),
      pessoa_destino:pessoas!operacoes_ativos_destino_id_fkey ( id, nome_completo, cpf_cnpj )
    `)
    .eq('organizacao_id', org.id)
    .order('data_operacao', { ascending: false })

  // Buscar ativos
  const { data: ativosRaw } = await supabase
    .from('ativos')
    .select('id, codigo, especie, tipo, nome_classe')
    .eq('organizacao_id', org.id)
    .order('codigo')

  // Buscar pessoas
  const { data: pessoasRaw } = await supabase
    .from('pessoas')
    .select('id, nome_completo, cpf_cnpj')
    .eq('organizacao_id', org.id)
    .order('nome_completo')

  const operacoes: OperacaoRow[] = (operacoesRaw ?? []).map((op) => {
    const ativo    = Array.isArray(op.ativo)           ? op.ativo[0]           : op.ativo
    const origem   = Array.isArray(op.pessoa_origem)   ? op.pessoa_origem[0]   : op.pessoa_origem
    const destino  = Array.isArray(op.pessoa_destino)  ? op.pessoa_destino[0]  : op.pessoa_destino

    return {
      id: op.id,
      data_operacao: op.data_operacao,
      tipo_operacao: op.tipo_operacao as OperacaoRow['tipo_operacao'],
      quantidade: op.quantidade,
      preco_unitario: op.preco_unitario ?? null,
      motivo: op.motivo ?? null,
      metadata: (op.metadata as Record<string, unknown>) ?? null,
      ativo: ativo
        ? { id: ativo.id, codigo: ativo.codigo, especie: ativo.especie ?? null, tipo: ativo.tipo, nome_classe: ativo.nome_classe ?? null }
        : null,
      pessoa_origem: origem
        ? { id: origem.id, nome: origem.nome_completo, cpf_cnpj: origem.cpf_cnpj ?? null }
        : null,
      pessoa_destino: destino
        ? { id: destino.id, nome: destino.nome_completo, cpf_cnpj: destino.cpf_cnpj ?? null }
        : null,
    }
  })

  const ativos: AtivoSimples[] = (ativosRaw ?? []).map((a) => ({
    id: a.id,
    codigo: a.codigo,
    especie: a.especie ?? null,
    tipo: a.tipo,
    nome_classe: a.nome_classe ?? null,
  }))

  const pessoas: PessoaSimples[] = (pessoasRaw ?? []).map((p) => ({
    id: p.id,
    nome: p.nome_completo,
    cpf_cnpj: p.cpf_cnpj ?? null,
  }))

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Operações"
        description="Log imutável de todas as movimentações de ativos"
        icon={ListIcon}
        iconGradient="from-amber-400 to-orange-500"
      />
      <div className="flex flex-col gap-4 p-6">
        <OperacoesTabela
          operacoes={operacoes}
          ativos={ativos}
          pessoas={pessoas}
          orgSlug={orgSlug}
        />
      </div>
    </div>
  )
}
