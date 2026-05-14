import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, UserIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MembroOrgao {
  id: string
  nome: string
  cpf_cnpj: string | null
  cargo: string
  data_inicio: string | null
}

export interface OrgaoComMembros {
  id: string
  nome: string
  tipo: string
  membros: MembroOrgao[]
}

interface Props {
  orgaos: OrgaoComMembros[]
  orgSlug: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCpfCnpj(v: string | null): string {
  if (!v) return '—'
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return v
}

function cargoBadgeClass(cargo: string): string {
  const c = cargo.toLowerCase()
  if (c.includes('presidente') || c.includes('ceo')) return 'bg-purple-100 text-purple-800 border-purple-200'
  if (c.includes('diretor') || c.includes('direção')) return 'bg-blue-100 text-blue-800 border-blue-200'
  if (c.includes('conselheiro') || c.includes('membro')) return 'bg-gray-100 text-gray-700 border-gray-200'
  if (c.includes('secretário') || c.includes('secretaria')) return 'bg-green-100 text-green-800 border-green-200'
  if (c.includes('fiscal')) return 'bg-orange-100 text-orange-800 border-orange-200'
  return 'bg-muted text-muted-foreground border-border'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function QuadroOrgaos({ orgaos, orgSlug }: Props) {
  if (orgaos.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Órgãos Sociais</CardTitle>
          <Link
            href={`/${orgSlug}/governanca/orgaos`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Configurar <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum órgão social cadastrado.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {orgaos.map((orgao) => (
        <Card key={orgao.id} className="flex flex-col">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">{orgao.nome}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {orgao.tipo?.replace(/_/g, ' ')} ·{' '}
                <span className="font-medium">{orgao.membros.length} membro{orgao.membros.length !== 1 ? 's' : ''}</span>
              </p>
            </div>
            <Link
              href={`/${orgSlug}/governanca/orgaos`}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Ver detalhes"
            >
              <ArrowRight className="size-3.5 mt-0.5" />
            </Link>
          </CardHeader>

          <CardContent className="pt-0 flex-1">
            {orgao.membros.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sem membros ativos.</p>
            ) : (
              <div className="space-y-2.5">
                {orgao.membros.map((m) => (
                  <div key={m.id} className="flex items-start gap-2.5">
                    <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium leading-tight">{m.nome}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs h-4 px-1.5 shrink-0 ${cargoBadgeClass(m.cargo)}`}
                        >
                          {m.cargo}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {fmtCpfCnpj(m.cpf_cnpj)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
