import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardCards } from '@/components/shared/dashboard-cards'
import { UltimosEventos } from '@/components/shared/ultimos-eventos'
import { RequisitosWidget } from '@/components/shared/requisitos-widget'
import { QuadroAcionistas, type AcionistaRow } from '@/components/shared/quadro-acionistas'
import { QuadroOrgaos, type OrgaoComMembros } from '@/components/shared/quadro-orgaos'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 select-none whitespace-nowrap">
        {children}
      </p>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  )
}

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { orgSlug } = await params
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizacoes')
    .select('id, nome')
    .eq('slug', orgSlug)
    .single()

  if (!org) redirect('/login')

  const orgId: string = org.id

  // ── Parallel fetches ───────────────────────────────────────────────────────
  const [
    capTableResult,
    pessoasResult,
    equityResult,
    eventosResult,
    eventosIdsResult,
    orgaosResult,
  ] = await Promise.all([
    // Cap table via RPC
    supabase.rpc('calcular_cap_table', {
      p_org_id: orgId,
      p_data_ref: new Date().toISOString().slice(0, 10),
      p_incluir_tesouraria: false,
      p_incluir_usufruto: false,
    }),

    // Pessoas (para CPF/CNPJ dos acionistas)
    supabase
      .from('pessoas')
      .select('id, nome_completo, cpf_cnpj')
      .eq('organizacao_id', orgId),

    // Contratos de equity ativos — contar beneficiários únicos
    supabase
      .from('contratos_equity')
      .select('beneficiario_id')
      .eq('organizacao_id', orgId)
      .eq('status', 'ativo'),

    // Últimos eventos
    supabase
      .from('eventos')
      .select('id, nome, data_hora, status, orgaos_sociais(nome)')
      .eq('organizacao_id', orgId)
      .order('data_hora', { ascending: false })
      .limit(5),

    // Eventos IDs para requisitos
    supabase
      .from('eventos')
      .select('id')
      .eq('organizacao_id', orgId),

    // Órgãos sociais com membros ativos
    supabase
      .from('orgaos_sociais')
      .select(`
        id, nome, tipo,
        membros_orgao (
          id, cargo, status, data_inicio,
          pessoas ( id, nome_completo, cpf_cnpj )
        )
      `)
      .eq('organizacao_id', orgId)
      .order('nome'),
  ])

  // ── Cap table ──────────────────────────────────────────────────────────────
  type CapRow = {
    ativo_id: string
    codigo: string
    especie: string | null
    titular_id: string | null
    nome_titular: string | null
    quantidade: number
    capital_social: number
  }
  const capRows = (capTableResult.data ?? []) as CapRow[]
  const totalAcoes = capRows.reduce((s, r) => s + Number(r.quantidade), 0)
  const capitalSocial = capRows.length > 0 ? Number(capRows[0].capital_social) : 0

  // ── Quadro de acionistas ───────────────────────────────────────────────────
  const pessoaMap = new Map(
    (pessoasResult.data ?? []).map((p) => [p.id, p])
  )

  // Group by titular_id → aggregate per-codigo quantities
  const titularMap = new Map<
    string,
    { titular_id: string | null; nome: string; cpf_cnpj: string | null; codigos: Map<string, number> }
  >()

  for (const row of capRows) {
    if (!row.titular_id) continue // skip tesouraria
    const key = row.titular_id
    if (!titularMap.has(key)) {
      const pessoa = pessoaMap.get(row.titular_id)
      titularMap.set(key, {
        titular_id: row.titular_id,
        nome: row.nome_titular ?? pessoa?.nome_completo ?? 'Desconhecido',
        cpf_cnpj: pessoa?.cpf_cnpj ?? null,
        codigos: new Map(),
      })
    }
    const entry = titularMap.get(key)!
    entry.codigos.set(row.codigo, (entry.codigos.get(row.codigo) ?? 0) + Number(row.quantidade))
  }

  const acionistas: AcionistaRow[] = Array.from(titularMap.values())
    .map((t) => {
      const participacoes = Array.from(t.codigos.entries()).map(([codigo, quantidade]) => ({
        codigo,
        especie: null,
        quantidade,
      }))
      const total = participacoes.reduce((s, p) => s + p.quantidade, 0)
      return {
        titular_id: t.titular_id,
        nome: t.nome,
        cpf_cnpj: t.cpf_cnpj,
        participacoes,
        total,
        percentual: totalAcoes > 0 ? (total / totalAcoes) * 100 : 0,
      }
    })
    .sort((a, b) => b.total - a.total)

  // ── Equity Plans — beneficiários únicos com contrato ativo ───────────────
  const beneficiariosUnicos = new Set(
    (equityResult.data ?? []).map((c: { beneficiario_id: string }) => c.beneficiario_id)
  ).size

  // ── Eventos ────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventos = (eventosResult.data ?? []) as any[]

  // ── Requisitos stats ───────────────────────────────────────────────────────
  const ids = (eventosIdsResult.data ?? []).map((e: { id: string }) => e.id)
  let reqStats = { cumprido: 0, pendente: 0, atrasado: 0 }

  if (ids.length > 0) {
    const { data: reqRaw } = await supabase
      .from('requisitos_evento')
      .select('status')
      .in('evento_id', ids)
    const reqs = (reqRaw ?? []) as Array<{ status: string }>
    reqStats = {
      cumprido: reqs.filter((r) => r.status === 'cumprido').length,
      pendente: reqs.filter((r) => r.status === 'pendente').length,
      atrasado: reqs.filter((r) => r.status === 'atrasado').length,
    }
  }

  // ── Órgãos com membros ─────────────────────────────────────────────────────
  const orgaos: OrgaoComMembros[] = (orgaosResult.data ?? []).map((o) => {
    const membrosRaw = Array.isArray(o.membros_orgao) ? o.membros_orgao : []
    const membros = membrosRaw
      .filter((m: { status: string }) => m.status === 'ativo')
      .map((m: {
        id: string
        cargo: string
        data_inicio: string | null
        pessoas: { id: string; nome_completo: string; cpf_cnpj: string | null } | { id: string; nome_completo: string; cpf_cnpj: string | null }[] | null
      }) => {
        const pessoa = Array.isArray(m.pessoas) ? m.pessoas[0] : m.pessoas
        return {
          id: m.id,
          nome: pessoa?.nome_completo ?? '—',
          cpf_cnpj: pessoa?.cpf_cnpj ?? null,
          cargo: m.cargo,
          data_inicio: m.data_inicio ?? null,
        }
      })

    return {
      id: o.id,
      nome: o.nome,
      tipo: o.tipo ?? '',
      membros,
    }
  }).filter((o) => o.membros.length > 0) // only show orgaos with active members

  return (
    <div className="flex flex-col">
      {/* ── Hero header ───────────────────────────────────────── */}
      <div className="border-b border-border/60 bg-card px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20">
            <span className="text-base font-bold text-white select-none">
              {org.nome[0]}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{org.nome}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visão geral · posição de hoje
            </p>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="p-6 space-y-6">

        {/* KPI cards */}
        <DashboardCards
          capitalSocial={capitalSocial}
          totalAcoes={totalAcoes}
          beneficiariosEquity={beneficiariosUnicos}
        />

        {/* Quadro de acionistas */}
        {acionistas.length > 0 && (
          <section className="space-y-3">
            <SectionLabel>Quadro de Acionistas</SectionLabel>
            <QuadroAcionistas
              acionistas={acionistas}
              totalAcoes={totalAcoes}
              orgSlug={orgSlug}
            />
          </section>
        )}

        {/* Órgãos sociais */}
        {orgaos.length > 0 && (
          <section className="space-y-3">
            <SectionLabel>Órgãos Sociais — membros ativos</SectionLabel>
            <QuadroOrgaos orgaos={orgaos} orgSlug={orgSlug} />
          </section>
        )}

        {/* Eventos + Requisitos */}
        <section className="space-y-3">
          <SectionLabel>Atividade recente</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <UltimosEventos eventos={eventos} orgSlug={orgSlug} />
            <RequisitosWidget stats={reqStats} orgSlug={orgSlug} />
          </div>
        </section>

      </div>
    </div>
  )
}
