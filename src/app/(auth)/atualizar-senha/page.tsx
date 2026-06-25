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
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message) }
    else { setDone(true) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Nova senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Digite sua nova senha abaixo.</p>
        </div>

        {done ? (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3">
            <p className="text-sm text-green-700 font-medium">Senha atualizada com sucesso!</p>
            <a href="/login" className="mt-2 block text-sm text-green-700 underline">Voltar para o login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input id="confirm" type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full bg-[#111827] hover:bg-[#1f2937] text-white" size="lg" disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
