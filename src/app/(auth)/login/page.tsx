'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleReset() {
    if (!email) { setError('Digite seu e-mail antes de redefinir a senha.'); return }
    setResetLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    })
    setResetLoading(false)
    if (error) { setError('Não foi possível enviar o e-mail. Tente novamente.') }
    else { setResetSent(true) }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    const { data: membro } = await supabase
      .from('membros')
      .select('papel, organizacoes(slug)')
      .limit(1)
      .single()

    const slug = (membro?.organizacoes as { slug?: string } | null)?.slug
    if (!slug) { window.location.href = '/nova-organizacao'; return }
    const destino = membro?.papel === 'participante_sop' ? `/${slug}/portal` : `/${slug}/dashboard`
    window.location.href = destino
  }

  return (
    <div className="min-h-screen flex">

      {/* Painel esquerdo — identidade */}
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

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">

        {/* Logo mobile */}
        <div className="absolute top-6 left-6 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-altoqi.svg" alt="AltoQI" className="h-7" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Acesse sua conta
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              E-mail corporativo
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@altoqi.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {resetSent && (
              <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2">
                <p className="text-sm text-green-700">E-mail de redefinição enviado! Verifique sua caixa de entrada.</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#111827] hover:bg-[#1f2937] text-white"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleReset}
                disabled={resetLoading}
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-50"
              >
                {resetLoading ? 'Enviando…' : 'Esqueceu a senha?'}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  )
}
