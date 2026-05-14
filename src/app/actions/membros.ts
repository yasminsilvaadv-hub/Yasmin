'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function listarMembros(
  orgSlug: string
): Promise<{ id: string; user_id: string; papel: string; email: string; confirmed: boolean; created_at: string }[]> {
  const supabase = await createServiceClient()

  const { data: org, error: orgError } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (orgError || !org) return []

  const { data: membros, error: membrosError } = await supabase
    .from('membros')
    .select('*')
    .eq('organizacao_id', org.id)
    .order('created_at')

  if (membrosError || !membros) return []

  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 })

  const userMap = new Map<string, { email: string; email_confirmed_at: string | null }>()
  for (const user of usersData?.users ?? []) {
    userMap.set(user.id, {
      email: user.email ?? '',
      email_confirmed_at: user.email_confirmed_at ?? null,
    })
  }

  return membros.map((m) => {
    const authUser = userMap.get(m.user_id)
    return {
      id: m.id,
      user_id: m.user_id,
      papel: m.papel,
      email: authUser?.email ?? '',
      confirmed: !!authUser?.email_confirmed_at,
      created_at: m.created_at,
    }
  })
}

export async function convidarMembro(
  orgSlug: string,
  email: string,
  papel: 'admin' | 'editor' | 'viewer'
): Promise<{ error?: string }> {
  const supabase = await createServiceClient()
  const anonClient = await createClient()

  const { data: { user: caller }, error: callerError } = await anonClient.auth.getUser()
  if (callerError || !caller) return { error: 'Não autenticado' }

  const { data: org, error: orgError } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (orgError || !org) return { error: 'Organização não encontrada' }

  const { data: membroCaller, error: membroError } = await supabase
    .from('membros')
    .select('papel')
    .eq('organizacao_id', org.id)
    .eq('user_id', caller.id)
    .single()

  if (membroError || !membroCaller || membroCaller.papel !== 'admin') {
    return { error: 'Sem permissão' }
  }

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email,
    { data: { organizacao_id: org.id, papel } }
  )

  if (inviteError || !inviteData?.user) {
    return { error: inviteError?.message ?? 'Erro ao convidar usuário' }
  }

  const { error: upsertError } = await supabase
    .from('membros')
    .upsert(
      { organizacao_id: org.id, user_id: inviteData.user.id, papel },
      { onConflict: 'organizacao_id,user_id' }
    )

  if (upsertError) return { error: upsertError.message }

  return {}
}

export async function atualizarPapel(
  membroId: string,
  papel: 'admin' | 'editor' | 'viewer'
): Promise<{ error?: string }> {
  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('membros')
    .update({ papel })
    .eq('id', membroId)

  if (error) return { error: error.message }

  return {}
}

export async function removerMembro(membroId: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('membros')
    .delete()
    .eq('id', membroId)

  if (error) return { error: error.message }

  return {}
}
