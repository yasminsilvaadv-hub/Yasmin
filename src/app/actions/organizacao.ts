'use server'

import { createServerClient } from '@supabase/ssr'

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Usa service role para contornar RLS na criação da primeira organização
function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function criarOrganizacao(formData: {
  nome: string
  cnpj: string
  tipoSocietario: string
  userId: string
}) {
  const admin = createServiceClient()
  const { nome, cnpj, tipoSocietario, userId } = formData

  // Gera slug único
  let slug = slugify(nome)
  const { data: existing } = await admin
    .from('organizacoes')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) slug = `${slug}-${Date.now()}`

  const { data: org, error: orgErr } = await admin
    .from('organizacoes')
    .insert({ nome, cnpj: cnpj || null, tipo_societario: tipoSocietario || null, slug })
    .select()
    .single()

  if (orgErr) return { error: orgErr.message }

  const { error: memErr } = await admin
    .from('membros')
    .insert({ organizacao_id: org.id, user_id: userId, papel: 'admin' })

  if (memErr) return { error: memErr.message }

  return { slug: org.slug }
}
