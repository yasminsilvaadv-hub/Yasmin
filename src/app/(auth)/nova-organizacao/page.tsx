'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { criarOrganizacao } from '@/app/actions/organizacao'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2 } from 'lucide-react'

export default function NovaOrganizacaoPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [tipoSocietario, setTipoSocietario] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const result = await criarOrganizacao({ nome, cnpj, tipoSocietario, userId: user.id })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(`/${result.slug}/dashboard`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg">Societário</span>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold">Configurar organização</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Insira os dados da sua empresa para começar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">
                Nome da empresa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex.: Acme Participações S.A."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={cnpj}
                onChange={e => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo societário</Label>
              <select
                id="tipo"
                value={tipoSocietario}
                onChange={e => setTipoSocietario(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 text-foreground"
              >
                <option value="">Selecione o tipo</option>
                <option value="SA">S.A. — Sociedade Anônima</option>
                <option value="LTDA">Ltda. — Sociedade Limitada</option>
                <option value="SCP">S.C.P. — Sociedade em Conta de Participação</option>
                <option value="EIRELI">EIRELI</option>
                <option value="SS">S.S. — Sociedade Simples</option>
              </select>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading || !nome}>
              {loading ? 'Criando…' : 'Criar organização'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
