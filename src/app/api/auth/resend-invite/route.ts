import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}))
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })
  }

  const adminClient = await createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://groovy-sundae.vercel.app'
  const redirectTo = `${appUrl}/auth/callback?next=/atualizar-senha`

  // inviteUserByEmail reenvia o convite para usuários não confirmados
  // e envia link de recuperação para usuários já confirmados
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo })

  // Sempre retorna 200 para não revelar se o e-mail existe no sistema
  if (error && error.message !== 'User already registered') {
    console.error('[resend-invite]', error.message)
  }

  return NextResponse.json({ ok: true })
}
