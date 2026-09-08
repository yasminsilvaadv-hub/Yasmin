'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AtualizarSenhaPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let settled = false

    function markReady() {
      settled = true
      setReady(true)
    }

    function markError(msg: string) {
      if (!settled) {
        settled = true
        setError(msg)
      }
    }

    // 1. Há um code PKCE na URL (link antigo ou callback falhou) → troca direto no cliente
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchErr }) => {
        if (data.session) {
          window.history.replaceState({}, '', '/atualizar-senha')
          markReady()
        } else {
          markError(exchErr?.message ?? 'Link inválido ou expirado. Solicite um novo convite.')
        }
      })
      return
    }

    // 2. Sessão já existe (veio pelo /auth/callback que trocou o código no servidor)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady()
    })

    // 3. Evento de auth (hash token ou troca em andamento)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        markReady()
      }
    })

    // 4. Timeout — se após 8 s ainda não há sessão, exibe erro
    const timer = setTimeout(() => {
      markError('Link inválido ou expirado. Solicite um novo convite ao administrador.')
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

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

    // Redireciona para o portal correto
    const { data: membro } = await supabase
      .from('membros')
      .select('papel, organizacoes(slug)')
      .limit(1)
      .single()

    const slug = (membro?.organizacoes as { slug?: string } | null)?.slug
    if (!slug) { window.location.href = '/login'; return }

    window.location.href = membro?.papel === 'participante_sop'
      ? `/${slug}/portal`
      : `/${slug}/dashboard`
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
          {!ready ? (
            <div className="text-center space-y-3">
              {error ? (
                <>
                  <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground">Link inválido ou expirado</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/login'} className="mt-2">
                    Ir para o login
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted mx-auto">
                    <svg className="animate-spin size-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Verificando seu link de acesso…</p>
                </>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

    </div>
  )
}
