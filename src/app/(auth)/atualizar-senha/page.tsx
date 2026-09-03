'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AtualizarSenhaPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Busca o membro para saber para onde redirecionar
    const { data: membro } = await supabase
      .from('membros')
      .select('papel, organizacoes(slug)')
      .limit(1)
      .single()

    const slug = (membro?.organizacoes as { slug?: string } | null)?.slug
    if (!slug) { window.location.href = '/login'; return }

    const destino = membro?.papel === 'participante_sop'
      ? `/${slug}/portal`
      : `/${slug}/dashboard`

    window.location.href = destino
  }

  return (
    <div className="min-h-screen flex">

      {/* Painel esquerdo */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#111827] flex-col items-center justify-center p-12 relative">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-altoqi-white.svg" alt="AltoQI" className="w-56" />
          <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1">
            Gestão Societária
          </p>
        </div>
        <p className="absolute bottom-8 text-white/20 text-xs tracking-wide">
          Plataforma interna &middot; Grupo AltoQI
        </p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="absolute top-6 left-6 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-altoqi.svg" alt="AltoQI" className="h-7" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Crie sua senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina uma senha para acessar o portal AltoQI.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#111827] hover:bg-[#1f2937] text-white"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Entrando…' : 'Criar senha e acessar'}
            </Button>
          </form>
        </div>
      </div>

    </div>
  )
}
