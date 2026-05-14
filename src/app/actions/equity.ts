'use server'

import { createServiceClient as createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getOrgId(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', slug)
    .single()
  if (error || !data) return null
  return data.id
}

// ─── Planos de Equity ────────────────────────────────────────────────────────

export interface CriarPlanoPayload {
  orgSlug: string
  nome: string
  tipo: string
  ativo_id: string
  pool_total: number
  data_inicio: string
  data_fim: string | null
}

export async function criarPlano(payload: CriarPlanoPayload) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase.from('planos_equity').insert({
    organizacao_id: orgId,
    nome: payload.nome,
    tipo: payload.tipo,
    ativo_id: payload.ativo_id,
    pool_total: payload.pool_total,
    data_inicio: payload.data_inicio,
    data_fim: payload.data_fim ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/equity/planos`)
  return { ok: true }
}

export interface EditarPlanoPayload extends CriarPlanoPayload {
  id: string
}

export async function editarPlano(payload: EditarPlanoPayload) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('planos_equity')
    .update({
      nome: payload.nome,
      tipo: payload.tipo,
      ativo_id: payload.ativo_id,
      pool_total: payload.pool_total,
      data_inicio: payload.data_inicio,
      data_fim: payload.data_fim ?? null,
    })
    .eq('id', payload.id)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/equity/planos`)
  return { ok: true }
}

export async function excluirPlano(orgSlug: string, id: string) {
  const supabase = await createClient()
  const orgId = await getOrgId(orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('planos_equity')
    .delete()
    .eq('id', id)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/equity/planos`)
  return { ok: true }
}

// ─── Programas de Equity ─────────────────────────────────────────────────────

export interface CriarProgramaPayload {
  orgSlug: string
  plano_id: string
  nome: string
  pool: number
}

export async function criarPrograma(payload: CriarProgramaPayload) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase.from('programas_equity').insert({
    organizacao_id: orgId,
    plano_id: payload.plano_id,
    nome: payload.nome,
    pool: payload.pool,
  })

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/equity/planos`)
  return { ok: true }
}

export interface EditarProgramaPayload {
  orgSlug: string
  id: string
  nome: string
  pool: number
}

export async function editarPrograma(payload: EditarProgramaPayload) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('programas_equity')
    .update({ nome: payload.nome, pool: payload.pool })
    .eq('id', payload.id)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/equity/planos`)
  return { ok: true }
}

// ─── Proventos ────────────────────────────────────────────────────────────────

export interface CriarProventoPayload {
  orgSlug: string
  plano_id: string
  programa_id: string | null
  data_referencia: string
  qtd_proventos_por_acao: number
  tipo: string
}

export async function criarProvento(payload: CriarProventoPayload) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase.from('proventos_equity').insert({
    organizacao_id: orgId,
    plano_id: payload.plano_id,
    programa_id: payload.programa_id ?? null,
    data_referencia: payload.data_referencia,
    qtd_proventos_por_acao: payload.qtd_proventos_por_acao,
    tipo: payload.tipo,
  })

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/equity/planos`)
  return { ok: true }
}

// ─── Calendários de Vesting ──────────────────────────────────────────────────

export interface ParcelaVestingInput {
  ordem: number
  cliff: boolean
  duracao: number
  unidade: 'anos' | 'meses'
  prazo_exercicio: number
  percentual: number
}

export interface CriarCalendarioPayload {
  orgSlug: string
  nome: string
  parcelas: ParcelaVestingInput[]
}

export async function criarCalendario(payload: CriarCalendarioPayload) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { data: cal, error: calErr } = await supabase
    .from('calendarios_vesting')
    .insert({ organizacao_id: orgId, nome: payload.nome })
    .select('id')
    .single()

  if (calErr || !cal) return { error: calErr?.message ?? 'Erro ao criar calendário' }

  const parcelas = payload.parcelas.map((p) => ({
    calendario_id: cal.id,
    numero_parcela: p.ordem,
    eh_cliff: p.cliff,
    duracao: p.duracao,
    unidade: p.unidade,
    prazo_exercicio: p.prazo_exercicio,
    // cliff usa 0.0001 para satisfazer o CHECK (percentual > 0) sem impactar cálculos
    percentual: p.cliff ? 0.0001 : p.percentual,
  }))

  const { error: parcErr } = await supabase.from('parcelas_vesting').insert(parcelas)
  if (parcErr) return { error: parcErr.message }

  revalidatePath(`/${payload.orgSlug}/equity/calendarios`)
  return { ok: true, id: cal.id }
}

export interface EditarCalendarioPayload {
  orgSlug: string
  id: string
  nome: string
  parcelas: ParcelaVestingInput[]
}

export async function editarCalendario(payload: EditarCalendarioPayload) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  // 1. Atualizar nome
  const { error: updateErr } = await supabase
    .from('calendarios_vesting')
    .update({ nome: payload.nome })
    .eq('id', payload.id)
    .eq('organizacao_id', orgId)

  if (updateErr) return { error: updateErr.message }

  // 2. Deletar parcelas antigas
  const { error: deleteErr } = await supabase
    .from('parcelas_vesting')
    .delete()
    .eq('calendario_id', payload.id)

  if (deleteErr) return { error: deleteErr.message }

  // 3. Inserir novas parcelas
  const parcelas = payload.parcelas.map((p) => ({
    calendario_id: payload.id,
    numero_parcela: p.ordem,
    eh_cliff: p.cliff,
    duracao: p.duracao,
    unidade: p.unidade,
    prazo_exercicio: p.prazo_exercicio,
    // cliff usa 0.0001 para satisfazer o CHECK (percentual > 0) sem impactar cálculos
    percentual: p.cliff ? 0.0001 : p.percentual,
  }))

  const { error: parcErr } = await supabase.from('parcelas_vesting').insert(parcelas)
  if (parcErr) return { error: parcErr.message }

  revalidatePath(`/${payload.orgSlug}/equity/calendarios`)
  return { ok: true }
}

export async function excluirCalendario(orgSlug: string, id: string) {
  const supabase = await createClient()
  const orgId = await getOrgId(orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  // Delete parcelas first (FK constraint: parcelas_vesting.calendario_id → calendarios_vesting.id)
  await supabase.from('parcelas_vesting').delete().eq('calendario_id', id)

  const { error } = await supabase
    .from('calendarios_vesting')
    .delete()
    .eq('id', id)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/equity/calendarios`)
  return { ok: true }
}

// ─── Contratos de Equity ──────────────────────────────────────────────────────

export interface CriarContratoPayload {
  orgSlug: string
  beneficiario_id: string
  tipo: string
  plano_id: string
  programa_id: string | null
  calendario_id: string | null
  quantidade_outorgada: number
  natureza: string
  data_aprovacao: string
  data_assinatura: string | null
  data_validade: string | null
}

export async function criarContrato(payload: CriarContratoPayload) {
  const supabase = await createClient()
  const orgId = await getOrgId(payload.orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  // Buscar o ativo_id do plano
  const { data: plano } = await supabase
    .from('planos_equity')
    .select('ativo_id')
    .eq('id', payload.plano_id)
    .single()

  let strike: number | null = null

  if (plano?.ativo_id) {
    // REGRA CRÍTICA: buscar último preço <= data_aprovacao e gravar — NUNCA atualizar depois
    const { data: preco } = await supabase
      .from('historico_preco_acao')
      .select('preco')
      .eq('ativo_id', plano.ativo_id)
      .lte('data_registro', payload.data_aprovacao)
      .order('data_registro', { ascending: false })
      .limit(1)
      .single()

    strike = preco?.preco ?? null
  }

  // Determinar sequencial para ID formatado
  const { count } = await supabase
    .from('contratos_equity')
    .select('id', { count: 'exact', head: true })
    .eq('organizacao_id', orgId)

  const sequencial = (count ?? 0) + 1

  const { error } = await supabase.from('contratos_equity').insert({
    organizacao_id: orgId,
    sequencial,
    beneficiario_id: payload.beneficiario_id,
    tipo: payload.tipo,
    plano_id: payload.plano_id,
    programa_id: payload.programa_id ?? null,
    calendario_id: payload.calendario_id ?? null,
    quantidade_outorgada: payload.quantidade_outorgada,
    natureza: payload.natureza,
    data_aprovacao: payload.data_aprovacao,
    data_assinatura: payload.data_assinatura ?? null,
    data_validade: payload.data_validade ?? null,
    preco_exercicio_strike: strike,
    status: 'rascunho',
  })

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/equity/contratos`)
  return { ok: true }
}

export async function atualizarStatusContrato(
  orgSlug: string,
  id: string,
  status: string
) {
  const supabase = await createClient()
  const orgId = await getOrgId(orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('contratos_equity')
    .update({ status })
    .eq('id', id)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/equity/contratos`)
  return { ok: true }
}

export async function vincularCalendario(
  orgSlug: string,
  contratoId: string,
  calendarioId: string | null
) {
  const supabase = await createClient()
  const orgId = await getOrgId(orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('contratos_equity')
    .update({ calendario_id: calendarioId })
    .eq('id', contratoId)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/equity/contratos`)
  return { ok: true }
}

export interface AdicionarHistoricoContratoPayload {
  orgSlug: string
  contrato_id: string
  descricao: string
  qtd_acoes: number | null
  valor: number | null
}

export async function adicionarHistoricoContrato(payload: AdicionarHistoricoContratoPayload) {
  const supabase = await createClient()

  const { error } = await supabase.from('historico_contratos_equity').insert({
    contrato_id: payload.contrato_id,
    descricao: payload.descricao,
    qtd_acoes: payload.qtd_acoes ?? null,
    valor: payload.valor ?? null,
    data: new Date().toISOString(),
  })

  if (error) return { error: error.message }
  revalidatePath(`/${payload.orgSlug}/equity/contratos`)
  return { ok: true }
}
