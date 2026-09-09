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
  const [linkExpired, setLinkExpired] = useState(false)

  // Resend link state
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [resendError, setResendError] = useState<string | null>(null)

  // Form error
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let settled = false

    function markReady() {
      settled = true
      setReady(true)
    }

    function markExpired() {
      if (!settled) {
        settled = true
        setLinkExpired(true)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) markReady()
    })

    // 1. Código PKCE na URL → tenta troca no cliente (funciona para links gerados pelo admin)
    //    Se falhar, tenta via /auth/callback no servidor
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
        if (data.session) {
          window.history.replaceState({}, '', '/atualizar-senha')
          markReady()
        } else {
          window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=/atualizar-senha`)
        }
      })
      return () => subscription.unsubscribe()
    }

    // 2. Sessão já existe (veio pelo /auth/callback)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        markReady()
      } else {
        // Sem código e sem sessão → expira rápido
        setTimeout(markExpired, 3000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    setResendStatus('sending')
    setResendError(null)

    try {
      const res = await fetch('/api/auth/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })
      if (res.ok) {
        setResendStatus('sent')
      } else {
        throw new Error('erro')
      }
    } catch {
      setResendError('Não conseguimos enviar um novo link. Peça ao administrador para reenviar o convite pelo painel.')
      setResendStatus('idle')
    }
  }

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
          {linkExpired ? (
            /* ── Link expirado: formulário de reenvio ── */
            resendStatus === 'sent' ? (
              <div className="text-center space-y-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-green-100 mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">E-mail enviado!</p>
                <p className="text-sm text-muted-foreground">
                  Verifique sua caixa de entrada e clique no novo link de acesso.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold tracking-tight">Link expirado</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Seu link de acesso expirou ou já foi usado. Digite seu e-mail para receber um novo.
                  </p>
                </div>
                <form onSubmit={handleResend} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="resend-email">Seu e-mail</Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="voce@empresa.com"
                      value={resendEmail}
                      onChange={e => setResendEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  {resendError && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                      <p className="text-sm text-destructive">{resendError}</p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-[#111827] hover:bg-[#1f2937] text-white"
                    size="lg"
                    disabled={resendStatus === 'sending'}
                  >
                    {resendStatus === 'sending' ? 'Enviando…' : 'Receber novo link'}
                  </Button>
                </form>
              </>
            )
          ) : !ready ? (
            /* ── Verificando ── */
            <div className="text-center space-y-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted mx-auto">
                <svg className="animate-spin size-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">Verificando seu link de acesso…</p>
            </div>
          ) : (
            /* ── Formulário de senha ── */
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
