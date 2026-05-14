'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  stats: { cumprido: number; pendente: number; atrasado: number }
  orgSlug: string
}

const COLORS = ['#22c55e', '#eab308', '#ef4444']
const LABELS = ['Cumpridos', 'Pendentes', 'Atrasados']

export function RequisitosWidget({ stats, orgSlug }: Props) {
  const data = [
    { name: LABELS[0], value: stats.cumprido },
    { name: LABELS[1], value: stats.pendente },
    { name: LABELS[2], value: stats.atrasado },
  ].filter(d => d.value > 0)

  const total = stats.cumprido + stats.pendente + stats.atrasado

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Requisitos de eventos</CardTitle>
        <Link
          href={`/${orgSlug}/governanca/eventos`}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          Ver detalhes <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum requisito cadastrado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
