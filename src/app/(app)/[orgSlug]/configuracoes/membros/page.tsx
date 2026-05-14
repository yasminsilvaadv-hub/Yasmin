'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { UsersIcon, PlusIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  listarMembros,
  convidarMembro,
  atualizarPapel,
  removerMembro,
} from '@/app/actions/membros'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Membro {
  id: string
  user_id: string
  papel: string
  email: string
  confirmed: boolean
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

const PAPEL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MembrosPage() {
  const params = useParams()
  const orgSlug = params.orgSlug as string

  const [membros, setMembros] = React.useState<Membro[]>([])
  const [loading, setLoading] = React.useState(true)
  const [inviting, setInviting] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [papel, setPapel] = React.useState('viewer')

  async function fetchMembros() {
    setLoading(true)
    const data = await listarMembros(orgSlug)
    setMembros(data ?? [])
    setLoading(false)
  }

  React.useEffect(() => {
    fetchMembros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug])

  async function handleConvidar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInviting(true)
    const result = await convidarMembro(orgSlug, email, papel as 'admin' | 'editor' | 'viewer')
    setInviting(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Convite enviado com sucesso!')
      setDialogOpen(false)
      setEmail('')
      setPapel('viewer')
      fetchMembros()
    }
  }

  async function handleAtualizarPapel(membroId: string, novoPapel: string) {
    const result = await atualizarPapel(membroId, novoPapel as 'admin' | 'editor' | 'viewer')
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Papel atualizado!')
      fetchMembros()
    }
  }

  async function handleRemover(membro: Membro) {
    if (!window.confirm(`Tem certeza que deseja remover o acesso de ${membro.email}?`)) return
    const result = await removerMembro(membro.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Acesso removido.')
      fetchMembros()
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Membros"
        description="Gerencie quem tem acesso a esta organização"
        icon={UsersIcon}
        iconGradient="from-violet-400 to-violet-600"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button>
                  <PlusIcon className="size-4" />
                  Convidar membro
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar novo membro</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleConvidar} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">E-mail</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    placeholder="colaborador@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-papel">Papel</Label>
                  <select
                    id="invite-papel"
                    className={selectClass}
                    value={papel}
                    onChange={(e) => setPapel(e.target.value)}
                  >
                    <option value="admin">Administrador</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={inviting} className="w-full sm:w-auto">
                    {inviting ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin size-4 text-current"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Enviando…
                      </span>
                    ) : (
                      'Enviar convite'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        <div className="border border-border/60 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Membro
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Papel
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full shrink-0" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : membros.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                        <UsersIcon className="size-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Nenhum membro</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Convide colaboradores para ter acesso a esta organização
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                membros.map((membro) => (
                  <tr key={membro.id} className="border-b border-border/40 last:border-0">
                    {/* Member */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-xs font-semibold uppercase select-none">
                          {membro.email.charAt(0)}
                        </div>
                        <span className="text-sm text-foreground">{membro.email}</span>
                      </div>
                    </td>

                    {/* Papel */}
                    <td className="px-4 py-3">
                      {membro.papel === 'admin' ? (
                        <Badge className="bg-amber-100 text-amber-700 border-transparent hover:bg-amber-100">
                          {PAPEL_LABEL[membro.papel] ?? membro.papel}
                        </Badge>
                      ) : membro.papel === 'editor' ? (
                        <Badge className="bg-blue-100 text-blue-700 border-transparent hover:bg-blue-100">
                          {PAPEL_LABEL[membro.papel] ?? membro.papel}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 border-transparent hover:bg-gray-100">
                          {PAPEL_LABEL[membro.papel] ?? membro.papel}
                        </Badge>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {membro.confirmed ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                          <span className="size-2 rounded-full bg-green-500 shrink-0" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <span className="size-2 rounded-full bg-amber-400 shrink-0" />
                          Convite pendente
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon">
                              <MoreHorizontalIcon className="size-4" />
                              <span className="sr-only">Ações</span>
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              Alterar papel
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={() => handleAtualizarPapel(membro.id, 'admin')}
                              >
                                Administrador
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAtualizarPapel(membro.id, 'editor')}
                              >
                                Editor
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAtualizarPapel(membro.id, 'viewer')}
                              >
                                Visualizador
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleRemover(membro)}
                          >
                            <Trash2Icon className="size-4" />
                            Remover acesso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
