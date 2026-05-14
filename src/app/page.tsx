import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membro } = await supabase
    .from('membros')
    .select('organizacoes(slug)')
    .limit(1)
    .single()

  const slug = (membro?.organizacoes as { slug?: string } | null)?.slug
  if (slug) redirect(`/${slug}/dashboard`)

  redirect('/nova-organizacao')
}
