import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code)

    // ── Invite flow: if the user was invited with org metadata, ensure they're in membros ──
    const user = sessionData?.user
    if (user) {
      const organizacao_id = user.user_metadata?.organizacao_id as string | undefined
      const papel         = user.user_metadata?.papel         as string | undefined

      if (organizacao_id && papel) {
        // Upsert into membros (safe even if already inserted at invite time)
        const service = await createServiceClient()
        await service
          .from('membros')
          .upsert(
            { organizacao_id, user_id: user.id, papel },
            { onConflict: 'organizacao_id,user_id' }
          )

        // Redirect straight to the org's dashboard
        const { data: org } = await service
          .from('organizacoes')
          .select('slug')
          .eq('id', organizacao_id)
          .single()

        if (org?.slug) {
          return NextResponse.redirect(`${origin}/${org.slug}/dashboard`)
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
