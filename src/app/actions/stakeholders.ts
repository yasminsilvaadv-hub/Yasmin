'use server'

import { createServiceClient as createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getOrgId(slug: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', slug)
    .single()
  if (error || !data) return null
  return data.id
}

export interface PessoaPayload {
  nome_completo: string
  cpf_cnpj?: string | null
  tipo: 'pessoa_fisica' | 'pessoa_juridica'
  estado_civil?: string | null
  profissao?: string | null
  data_nascimento?: string | null
  nacionalidade?: string | null
  email_principal?: string | null
  telefone_principal?: string | null
  anotacoes?: string | null
}

export async function criarPessoa(
  orgSlug: string,
  dados: PessoaPayload
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId(orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase.from('pessoas').insert({
    organizacao_id:    orgId,
    nome_completo:     dados.nome_completo,
    cpf_cnpj:          dados.cpf_cnpj ?? null,
    tipo:              dados.tipo,
    estado_civil:      dados.estado_civil ?? null,
    profissao:         dados.profissao ?? null,
    data_nascimento:   dados.data_nascimento ?? null,
    nacionalidade:     dados.nacionalidade ?? null,
    email_principal:   dados.email_principal ?? null,
    telefone_principal: dados.telefone_principal ?? null,
    anotacoes:         dados.anotacoes ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/stakeholders`)
  return { ok: true }
}

export async function atualizarPessoa(
  pessoaId: string,
  orgSlug: string,
  dados: Partial<PessoaPayload>
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId(orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const update: Record<string, unknown> = {}
  if (dados.nome_completo     !== undefined) update.nome_completo     = dados.nome_completo
  if (dados.cpf_cnpj          !== undefined) update.cpf_cnpj          = dados.cpf_cnpj ?? null
  if (dados.tipo              !== undefined) update.tipo              = dados.tipo
  if (dados.estado_civil      !== undefined) update.estado_civil      = dados.estado_civil ?? null
  if (dados.profissao         !== undefined) update.profissao         = dados.profissao ?? null
  if (dados.data_nascimento   !== undefined) update.data_nascimento   = dados.data_nascimento ?? null
  if (dados.nacionalidade     !== undefined) update.nacionalidade     = dados.nacionalidade ?? null
  if (dados.email_principal   !== undefined) update.email_principal   = dados.email_principal ?? null
  if (dados.telefone_principal !== undefined) update.telefone_principal = dados.telefone_principal ?? null
  if (dados.anotacoes         !== undefined) update.anotacoes         = dados.anotacoes ?? null

  const { error } = await supabase
    .from('pessoas')
    .update(update)
    .eq('id', pessoaId)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/stakeholders`)
  return { ok: true }
}

export async function excluirPessoa(
  pessoaId: string,
  orgSlug: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient()
  const orgId = await getOrgId(orgSlug)
  if (!orgId) return { error: 'Organização não encontrada' }

  const { error } = await supabase
    .from('pessoas')
    .delete()
    .eq('id', pessoaId)
    .eq('organizacao_id', orgId)

  if (error) return { error: error.message }
  revalidatePath(`/${orgSlug}/stakeholders`)
  return { ok: true }
}

// ─── Import via planilha ──────────────────────────────────────────────────────

export interface PessoaImportRow {
  nome_completo: string
  cpf_cnpj?: string
  tipo?: string
  email_principal?: string
  telefone_principal?: string
  nacionalidade?: string
  profissao?: string
}

export async function importarPessoas(
  orgSlug: string,
  rows: PessoaImportRow[]
): Promise<{ importados: number; erros: string[] }> {
  const supabase = await createClient()
  const orgId = await getOrgId(orgSlug)
  if (!orgId) return { importados: 0, erros: ['Organização não encontrada'] }

  const erros: string[] = []
  let importados = 0

  for (const row of rows) {
    if (!row.nome_completo?.trim()) { erros.push(`Linha sem nome ignorada`); continue }

    const tipo = row.tipo?.toLowerCase().includes('juridica') || row.tipo?.toLowerCase().includes('jurídica')
      ? 'pessoa_juridica' : 'pessoa_fisica'

    const { error } = await supabase.from('pessoas').insert({
      organizacao_id:    orgId,
      nome_completo:     row.nome_completo.trim(),
      cpf_cnpj:          row.cpf_cnpj?.trim() || null,
      tipo,
      email_principal:   row.email_principal?.trim() || null,
      telefone_principal: row.telefone_principal?.trim() || null,
      nacionalidade:     row.nacionalidade?.trim() || null,
      profissao:         row.profissao?.trim() || null,
    })

    if (error) { erros.push(`${row.nome_completo}: ${error.message}`) }
    else { importados++ }
  }

  revalidatePath(`/${orgSlug}/stakeholders`)
  return { importados, erros }
}
