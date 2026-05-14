'use server'

import { createServiceClient as createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type TipoOperacao =
  | 'emissao'
  | 'transferencia'
  | 'cancelamento'
  | 'onus_constituicao'
  | 'onus_extincao'
  | 'bonificacao'
  | 'desdobramento'
  | 'grupamento'

export interface NovaOperacaoData {
  orgSlug: string
  ativo_id: string
  tipo: TipoOperacao
  quantidade: number
  data_operacao: string        // nome real no banco
  origem_id?: string | null    // nome real no banco
  destino_id?: string | null   // nome real no banco
  preco_unitario?: number | null
  motivo?: string | null
  metadata?: Record<string, unknown>
}

export async function criarOperacao(data: NovaOperacaoData) {
  const supabase = await createClient()

  const { data: org, error: orgErr } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', data.orgSlug)
    .single()

  if (orgErr || !org) return { error: 'Organização não encontrada' }

  const { error } = await supabase.from('operacoes_ativos').insert({
    organizacao_id: org.id,
    ativo_id:       data.ativo_id,
    tipo_operacao:  data.tipo,        // nome real no banco
    quantidade:     data.quantidade,
    data_operacao:  data.data_operacao,
    origem_id:      data.origem_id  ?? null,
    destino_id:     data.destino_id ?? null,
    preco_unitario: data.preco_unitario ?? null,
    motivo:         data.motivo ?? null,
    metadata:       data.metadata ?? null,
  })

  if (error) return { error: error.message }

  // Revalida todas as páginas que dependem de operacoes_ativos
  revalidatePath(`/${data.orgSlug}/ativos/operacoes`)
  revalidatePath(`/${data.orgSlug}/cap-table`)
  revalidatePath(`/${data.orgSlug}/dashboard`)
  revalidatePath(`/${data.orgSlug}/governanca/livros`)
  return { success: true }
}
