'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrgId(orgSlug: string) {
  const supabase = await createClient()
  const { data: org, error } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', orgSlug)
    .single()
  if (error || !org) return null
  return org.id
}

// ─── Órgãos Sociais ───────────────────────────────────────────────────────────

export async function criarOrgao(payload: {
  orgSlug: string
  nome: string
  tipo: string
}) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase.from('orgaos_sociais').insert({
    organizacao_id: orgId,
    nome: payload.nome,
    tipo: payload.tipo,
  })

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/governanca/orgaos`)
  return { ok: true }
}

export async function editarOrgao(payload: {
  orgSlug: string
  id: string
  nome: string
  tipo: string
}) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('orgaos_sociais')
    .update({ nome: payload.nome, tipo: payload.tipo })
    .eq('id', payload.id)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/governanca/orgaos`)
  return { ok: true }
}

export async function excluirOrgao(orgSlug: string, id: string) {
  const supabase = await createClient()
  const orgId = await getOrgId(orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('orgaos_sociais')
    .delete()
    .eq('id', id)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/governanca/orgaos`)
  return { ok: true }
}

export async function adicionarMembroOrgao(payload: {
  orgSlug: string
  orgao_id: string
  pessoa_id: string
  cargo: string
  data_inicio: string
  duracao_mandato: number | null
  status: 'ativo' | 'inativo'
}) {
  const supabase = await createClient()

  const { error } = await supabase.from('membros_orgao').insert({
    orgao_id: payload.orgao_id,
    pessoa_id: payload.pessoa_id,
    cargo: payload.cargo,
    data_inicio: payload.data_inicio,
    duracao_mandato: payload.duracao_mandato,
    status: payload.status,
  })

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/governanca/orgaos`)
  return { ok: true }
}

export async function editarMembroOrgao(payload: {
  orgSlug: string
  id: string
  cargo: string
  data_inicio: string
  duracao_mandato: number | null
  status: 'ativo' | 'inativo'
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('membros_orgao')
    .update({
      cargo: payload.cargo,
      data_inicio: payload.data_inicio,
      duracao_mandato: payload.duracao_mandato,
      status: payload.status,
    })
    .eq('id', payload.id)

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/governanca/orgaos`)
  return { ok: true }
}

export async function excluirMembroOrgao(orgSlug: string, id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('membros_orgao')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/governanca/orgaos`)
  return { ok: true }
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export async function criarEvento(payload: {
  orgSlug: string
  nome: string
  tipo: 'rca' | 'ago' | 'age' | 'rd'
  orgao_id: string | null
  data_hora: string
  ordem_do_dia: string | null
}) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase.from('eventos').insert({
    organizacao_id: orgId,
    nome: payload.nome,
    tipo: payload.tipo,
    orgao_id: payload.orgao_id || null,
    data_hora: payload.data_hora,
    ordem_do_dia: payload.ordem_do_dia || null,
    status: 'pendente',
  })

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/governanca/eventos`)
  return { ok: true }
}

export async function editarEvento(payload: {
  orgSlug: string
  id: string
  nome: string
  tipo: 'rca' | 'ago' | 'age' | 'rd'
  orgao_id: string | null
  data_hora: string
  ordem_do_dia: string | null
}) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('eventos')
    .update({
      nome: payload.nome,
      tipo: payload.tipo,
      orgao_id: payload.orgao_id || null,
      data_hora: payload.data_hora,
      ordem_do_dia: payload.ordem_do_dia || null,
    })
    .eq('id', payload.id)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/governanca/eventos`)
  return { ok: true }
}

export async function excluirEvento(orgSlug: string, id: string) {
  const supabase = await createClient()
  const orgId = await getOrgId(orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('eventos')
    .delete()
    .eq('id', id)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/governanca/eventos`)
  return { ok: true }
}

export async function excluirRequisito(orgSlug: string, id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('requisitos_evento')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/governanca/eventos`)
  return { ok: true }
}

export async function atualizarStatusEvento(payload: {
  orgSlug: string
  evento_id: string
  status: 'pendente' | 'concluido' | 'cancelado'
}) {
  const supabase = await createClient()

  // Busca o evento antes de atualizar para comparar o status atual
  const { data: eventoAtual } = await supabase
    .from('eventos')
    .select('id, nome, tipo, data_hora, status, organizacao_id, ordem_do_dia')
    .eq('id', payload.evento_id)
    .single()

  const { error } = await supabase
    .from('eventos')
    .update({ status: payload.status })
    .eq('id', payload.evento_id)

  if (error) return { error: error.message }

  revalidatePath(`/${payload.orgSlug}/governanca/livros`)
  revalidatePath(`/${payload.orgSlug}/governanca/eventos`)
  return { ok: true }
}

export async function criarRequisito(payload: {
  orgSlug: string
  evento_id: string
  descricao: string
  tipo: string
  prazo: string | null
}) {
  const supabase = await createClient()

  const { error } = await supabase.from('requisitos_evento').insert({
    evento_id: payload.evento_id,
    descricao: payload.descricao,
    tipo: payload.tipo,
    prazo: payload.prazo || null,
    status: 'pendente',
  })

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/governanca/eventos`)
  return { ok: true }
}

export async function atualizarStatusRequisito(payload: {
  orgSlug: string
  requisito_id: string
  status: 'cumprido' | 'pendente' | 'atrasado'
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('requisitos_evento')
    .update({ status: payload.status })
    .eq('id', payload.requisito_id)

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/governanca/eventos`)
  return { ok: true }
}

// ─── Livros Societários ───────────────────────────────────────────────────────

export async function atualizarLivro(payload: {
  orgSlug: string
  livro_id: string
  periodo_inicio?: string | null
  periodo_fim?: string | null
  formato?: 'digital' | 'fisico'
  data_autenticacao?: string | null
  orgao_autenticador?: string | null
  forma_autenticacao?: string | null
  local_autenticacao?: string | null
  anotacoes?: string | null
}) {
  const supabase = await createClient()

  // Build only the fields that were passed
  const update: Record<string, unknown> = {}
  if ('periodo_inicio' in payload) update.periodo_inicio = payload.periodo_inicio ?? null
  if ('periodo_fim' in payload) update.periodo_fim = payload.periodo_fim ?? null
  if ('formato' in payload) update.formato = payload.formato
  if ('data_autenticacao' in payload) update.data_autenticacao = payload.data_autenticacao ?? null
  if ('orgao_autenticador' in payload) update.orgao_autenticador = payload.orgao_autenticador ?? null
  if ('forma_autenticacao' in payload) update.forma_autenticacao = payload.forma_autenticacao ?? null
  if ('local_autenticacao' in payload) update.local_autenticacao = payload.local_autenticacao ?? null
  if ('anotacoes' in payload) update.anotacoes = payload.anotacoes ?? null

  const { error } = await supabase
    .from('livros_societarios')
    .update(update)
    .eq('id', payload.livro_id)

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/governanca/livros`)
  return { ok: true }
}

export async function criarLivro(payload: {
  orgSlug: string
  natureza: string
  orgao_id: string | null
  periodo_inicio: string | null
  periodo_fim: string | null
  formato: 'digital' | 'fisico'
  data_autenticacao: string | null
  orgao_autenticador: string | null
  forma_autenticacao?: string | null
  local_autenticacao?: string | null
  anotacoes?: string | null
}) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  // Calcular próximo número de ordem para esta natureza específica
  const { data: ultimoLivro } = await supabase
    .from('livros_societarios')
    .select('numero_ordem')
    .eq('organizacao_id', orgId)
    .eq('natureza', payload.natureza)
    .order('numero_ordem', { ascending: false })
    .limit(1)
    .single()

  const { error } = await supabase.from('livros_societarios').insert({
    organizacao_id: orgId,
    natureza: payload.natureza,
    orgao_id: payload.orgao_id || null,
    numero_ordem: (ultimoLivro?.numero_ordem ?? 0) + 1,
    periodo_inicio: payload.periodo_inicio || null,
    periodo_fim: payload.periodo_fim || null,
    formato: payload.formato,
    data_autenticacao: payload.data_autenticacao || null,
    orgao_autenticador: payload.orgao_autenticador || null,
    forma_autenticacao: payload.forma_autenticacao ?? null,
    local_autenticacao: payload.local_autenticacao ?? null,
    anotacoes: payload.anotacoes ?? null,
    operacao_id: null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/governanca/livros`)
  return { ok: true }
}
