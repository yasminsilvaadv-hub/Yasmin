import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type StatusEvento = 'pendente' | 'concluido' | 'cancelado'

interface Evento {
  id: string
  nome: string
  data_hora: string
  status: StatusEvento
  orgaos_sociais: { nome: string } | null
}

const statusConfig: Record<StatusEvento, { icon: React.ComponentType<{ className?: string }>, className: string, label: string }> = {
  concluido: { icon: CheckCircle2, className: 'text-green-500', label: 'Concluído' },
  pendente:  { icon: Clock,        className: 'text-yellow-500', label: 'Pendente' },
  cancelado: { icon: AlertCircle,  className: 'text-red-500',    label: 'Cancelado' },
}

interface Props {
  eventos: Evento[]
  orgSlug: string
}

export function UltimosEventos({ eventos, orgSlug }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Últimos eventos</CardTitle>
        <Link
          href={`/${orgSlug}/governanca/eventos`}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {eventos.map(ev => {
              const cfg = statusConfig[ev.status]
              const Icon = cfg.icon
              return (
                <div key={ev.id} className="flex items-start gap-3">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.className}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.orgaos_sociais?.nome} ·{' '}
                      {format(new Date(ev.data_hora), "dd MMM yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{cfg.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
