import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  const cookieStore = await cookies()

  // Captura os cookies que o Supabase vai querer setar durante a troca
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(toSet) {
          // Captura para aplicar manualmente no response depois
          cookiesToSet.push(...toSet)
        },
      },
    }
  )

  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !sessionData.session) {
    // Troca falhou — redireciona para destino sem sessão (a página mostrará "link expirado")
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Determina para onde redirecionar
  let destino = `${origin}${next}`

  const user = sessionData.user
  if (user && next !== '/atualizar-senha') {
    const organizacao_id = user.user_metadata?.organizacao_id as string | undefined
    const papel = user.user_metadata?.papel as string | undefined

    if (organizacao_id && papel) {
      const service = await createServiceClient()
      await service.from('membros').upsert(
        { organizacao_id, user_id: user.id, papel },
        { onConflict: 'organizacao_id,user_id' }
      )

      const { data: org } = await service
        .from('organizacoes')
        .select('slug')
        .eq('id', organizacao_id)
        .single()

      if (org?.slug) {
        destino = papel === 'participante_sop'
          ? `${origin}/${org.slug}/portal`
          : `${origin}/${org.slug}/dashboard`
      }
    }
  }

  // Cria o redirect e aplica os cookies DE SESSÃO diretamente na resposta
  // (necessário porque no Next.js 14, cookies() + NextResponse.redirect() não propaga os cookies)
  const response = NextResponse.redirect(destino)
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  })

  return response
}
