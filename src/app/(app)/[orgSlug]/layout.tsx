import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { TopBar } from '@/components/shared/top-bar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

interface Props {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function OrgLayout({ children, params }: Props) {
  const { orgSlug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organizacoes')
    .select('id, nome, slug')
    .eq('slug', orgSlug)
    .single()

  if (!org) redirect('/login')

  const { data: membro } = await supabase
    .from('membros')
    .select('papel')
    .eq('organizacao_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (!membro) redirect('/login')

  // Busca todas as organizações que o usuário é membro
  const { data: membrosOrgs } = await supabase
    .from('membros')
    .select('organizacoes(id, nome, slug)')
    .eq('user_id', user.id)

  const todasOrgs = (membrosOrgs ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map(m => m.organizacoes as any as { id: string; nome: string; slug: string } | null)
    .filter(Boolean) as { id: string; nome: string; slug: string }[]

  return (
    <SidebarProvider>
      <AppSidebar
        orgSlug={orgSlug}
        orgNome={org.nome}
        userEmail={user.email}
        todasOrgs={todasOrgs}
      />
      <SidebarInset>
        <TopBar userEmail={user.email} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
