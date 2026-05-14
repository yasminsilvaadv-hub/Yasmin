import { createClient } from '@/lib/supabase/server'
import { LivrosTabela } from './livros-tabela'
import type { LivroRow, OrgaoSimples } from './types'
import { PageHeader } from '@/components/shared/page-header'
import { BookOpenIcon } from 'lucide-react'

interface PageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function LivrosPage({ params }: PageProps) {
  const { orgSlug } = await params
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Organização não encontrada.</p>
      </div>
    )
  }

  const [{ data: livrosRaw }, { data: orgaosRaw }] = await Promise.all([
    supabase
      .from('livros_societarios')
      .select(
        'id, natureza, numero_ordem, periodo_inicio, periodo_fim, formato, data_autenticacao, orgao_autenticador, operacao_id, created_at, orgao:orgaos_sociais ( id, nome )'
      )
      .eq('organizacao_id', org.id)
      .order('natureza', { ascending: true })
      .order('numero_ordem', { ascending: true }),
    supabase
      .from('orgaos_sociais')
      .select('id, nome')
      .eq('organizacao_id', org.id)
      .order('nome'),
  ])

  const livros: LivroRow[] = (livrosRaw ?? []).map((l) => {
    const orgao = Array.isArray(l.orgao) ? l.orgao[0] : l.orgao
    return {
      id: l.id,
      natureza: l.natureza,
      numero_ordem: l.numero_ordem,
      periodo_inicio: l.periodo_inicio ?? null,
      periodo_fim: l.periodo_fim ?? null,
      formato: (l.formato ?? 'digital') as 'digital' | 'fisico',
      data_autenticacao: l.data_autenticacao ?? null,
      orgao_autenticador: l.orgao_autenticador ?? null,
      operacao_id: (l as Record<string, unknown>).operacao_id as string | null ?? null,
      created_at: l.created_at,
      orgao: orgao
        ? { id: (orgao as { id: string; nome: string }).id, nome: (orgao as { id: string; nome: string }).nome }
        : null,
    }
  })

  const orgaos: OrgaoSimples[] = (orgaosRaw ?? []).map((o) => ({
    id: o.id,
    nome: o.nome,
  }))

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Livros Societários"
        description="Gerados automaticamente a partir de operações de ativos e eventos"
        icon={BookOpenIcon}
        iconGradient="from-slate-400 to-gray-600"
      />
      <div className="p-6">
        <LivrosTabela livros={livros} orgaos={orgaos} orgSlug={orgSlug} />
      </div>
    </div>
  )
}
