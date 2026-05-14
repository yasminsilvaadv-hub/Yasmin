'use server'

import { createServiceClient as createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Histórico de preço da ação ────────────────────────────────────────────

export async function inserirHistoricoPreco(payload: {
  orgSlug: string
  ativo_id: string
  preco: number
  data_registro: string
}) {
  const supabase = await createClient()

  const { data: org, error: orgErr } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', payload.orgSlug)
    .single()

  if (orgErr || !org) return { error: 'Organização não encontrada' }

  const { error } = await supabase.from('historico_preco_acao').insert({
    organizacao_id: org.id,
    ativo_id: payload.ativo_id,
    preco: payload.preco,
    data_registro: payload.data_registro,
  })

  if (error) return { error: error.message }

  revalidatePath(`/${payload.orgSlug}/ativos/historico-preco`)
  return { ok: true }
}

// ─── Rodadas de investimento ────────────────────────────────────────────────

export async function inserirRodada(payload: {
  orgSlug: string
  nome: string
  data: string
  valuation_pre: number | null
  valuation_pos: number | null
  valor_captado: number | null
  preco_por_acao: number | null
}) {
  const supabase = await createClient()

  const { data: org, error: orgErr } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', payload.orgSlug)
    .single()

  if (orgErr || !org) return { error: 'Organização não encontrada' }

  const { error } = await supabase.from('rodadas_investimento').insert({
    organizacao_id: org.id,
    nome: payload.nome,
    data: payload.data,
    valuation_pre: payload.valuation_pre,
    valuation_pos: payload.valuation_pos,
    valor_captado: payload.valor_captado,
    preco_por_acao: payload.preco_por_acao,
  })

  if (error) return { error: error.message }

  revalidatePath(`/${payload.orgSlug}/ativos/rodadas`)
  return { ok: true }
}

export async function editarRodada(payload: {
  orgSlug: string
  id: string
  nome: string
  data: string
  valuation_pre: number | null
  valuation_pos: number | null
  valor_captado: number | null
  preco_por_acao: number | null
}) {
  const supabase = await createClient()

  const { data: org, error: orgErr } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', payload.orgSlug)
    .single()

  if (orgErr || !org) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('rodadas_investimento')
    .update({
      nome: payload.nome,
      data: payload.data,
      valuation_pre: payload.valuation_pre,
      valuation_pos: payload.valuation_pos,
      valor_captado: payload.valor_captado,
      preco_por_acao: payload.preco_por_acao,
    })
    .eq('id', payload.id)
    .eq('organizacao_id', org.id)

  if (error) return { error: error.message }

  revalidatePath(`/${payload.orgSlug}/ativos/rodadas`)
  return { ok: true }
}

export async function excluirRodada(orgSlug: string, id: string) {
  const supabase = await createClient()

  const { data: org, error: orgErr } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (orgErr || !org) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('rodadas_investimento')
    .delete()
    .eq('id', id)
    .eq('organizacao_id', org.id)

  if (error) return { error: error.message }

  revalidatePath(`/${orgSlug}/ativos/rodadas`)
  return { ok: true }
}
