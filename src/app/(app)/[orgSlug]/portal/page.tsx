import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props { params: Promise<{ orgSlug: string }> }

export default async function PortalPage({ params }: Props) {
  const { orgSlug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase.from('organizacoes').select('id, nome').eq('slug', orgSlug).single()
  if (!org) redirect('/login')

  const { data: membro } = await supabase
    .from('membros')
    .select('papel, pessoa_id')
    .eq('organizacao_id', org.id)
    .eq('user_id', user.id)
    .single()

  if (!membro || membro.papel !== 'participante_sop') redirect(`/${orgSlug}/dashboard`)

  // Busca pessoa vinculada
  const { data: pessoa } = membro.pessoa_id
    ? await supabase.from('pessoas').select('nome_completo').eq('id', membro.pessoa_id).single()
    : { data: null }

  // Busca contratos do participante
  const { data: contratos } = membro.pessoa_id
    ? await supabase
        .from('contratos_equity')
        .select(`
          id, tipo, status, quantidade_outorgada, preco_exercicio_strike,
          data_aprovacao, data_assinatura,
          planos_equity(nome, ativo_id, ativos(codigo, especie)),
          calendarios_vesting(nome)
        `)
        .eq('organizacao_id', org.id)
        .eq('beneficiario_id', membro.pessoa_id)
        .order('data_aprovacao', { ascending: false })
    : { data: [] }

  // Busca último preço da ação (para calcular upside)
  const { data: ultimoPreco } = await supabase
    .from('historico_preco_acao')
    .select('preco')
    .eq('organizacao_id', org.id)
    .order('data_registro', { ascending: false })
    .limit(1)
    .single()

  const precoAtual = ultimoPreco?.preco ?? null

  const STATUS_LABEL: Record<string, string> = {
    rascunho: 'Rascunho',
    em_assinatura: 'Em assinatura',
    ativo: 'Ativo',
    cancelado: 'Cancelado',
  }
  const STATUS_COLOR: Record<string, string> = {
    rascunho: 'bg-gray-100 text-gray-600',
    em_assinatura: 'bg-yellow-50 text-yellow-700',
    ativo: 'bg-green-50 text-green-700',
    cancelado: 'bg-red-50 text-red-600',
  }

  const nome = pessoa?.nome_completo ?? user.email ?? 'Participante'
  const primeiroNome = nome.split(' ')[0]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {primeiroNome}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bem-vindo ao seu portal de participação em {org.nome}.
        </p>
      </div>

      {/* Cards de resumo */}
      {precoAtual && (contratos ?? []).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Contratos ativos</p>
            <p className="text-3xl font-bold mt-1">
              {(contratos ?? []).filter(c => c.status === 'ativo').length}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de opções</p>
            <p className="text-3xl font-bold mt-1">
              {(contratos ?? []).filter(c => c.status === 'ativo')
                .reduce((s, c) => s + (c.quantidade_outorgada ?? 0), 0).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Preço atual da ação</p>
            <p className="text-3xl font-bold mt-1">
              {precoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      )}

      {/* Lista de contratos */}
      <div>
        <h2 className="text-base font-semibold mb-3">Meus contratos</h2>

        {(contratos ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
            Nenhum contrato encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {(contratos ?? []).map((c) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const plano = c.planos_equity as any
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const calendario = c.calendarios_vesting as any
              const strike = c.preco_exercicio_strike ?? 0
              const qtd = c.quantidade_outorgada ?? 0
              const upside = precoAtual && strike ? (precoAtual - strike) * qtd : null

              return (
                <div key={c.id} className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{plano?.nome ?? 'Plano'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.tipo?.toUpperCase()} · {calendario?.nome ?? 'Calendário de vesting'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Qtd outorgada</p>
                      <p className="text-sm font-semibold mt-0.5">{qtd.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Strike (preço de exercício)</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {strike.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    {upside !== null && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Upside estimado</p>
                        <p className={`text-sm font-semibold mt-0.5 ${upside >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {upside.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    )}
                    {c.data_aprovacao && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Data de aprovação</p>
                        <p className="text-sm font-semibold mt-0.5">
                          {format(new Date(c.data_aprovacao), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
