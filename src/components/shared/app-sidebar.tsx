'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  PieChart,
  Landmark,
  Scale,
  TrendingUp,
  Users,
  ChevronDown,
  LogOut,
  BarChart3,
  Settings2,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  children?: { label: string; href: string }[]
}

// ─── Nav definition ───────────────────────────────────────────────────────────

function buildNav(orgSlug: string): NavItem[] {
  const b = `/${orgSlug}`
  return [
    { label: 'Dashboard',    href: `${b}/dashboard`,    icon: LayoutDashboard },
    { label: 'Cap Table',    href: `${b}/cap-table`,     icon: PieChart },
    {
      label: 'Ativos', icon: Landmark,
      children: [
        { label: 'Todos os ativos',    href: `${b}/ativos` },
        { label: 'Operações',          href: `${b}/ativos/operacoes` },
        { label: 'Histórico de preço', href: `${b}/ativos/historico-preco` },
        { label: 'Rodadas',            href: `${b}/ativos/rodadas` },
      ],
    },
    {
      label: 'Governança', icon: Scale,
      children: [
        { label: 'Órgãos sociais',     href: `${b}/governanca/orgaos` },
        { label: 'Eventos',            href: `${b}/governanca/eventos` },
        { label: 'Livros societários', href: `${b}/governanca/livros` },
        { label: 'Organograma',        href: `${b}/governanca/organograma` },
      ],
    },
    {
      label: 'Equity Plans', icon: TrendingUp,
      children: [
        { label: 'Planos',             href: `${b}/equity/planos` },
        { label: 'Calendários',        href: `${b}/equity/calendarios` },
        { label: 'Contratos',          href: `${b}/equity/contratos` },
        { label: 'Posições',           href: `${b}/equity/posicoes` },
      ],
    },
    { label: 'Stakeholders', href: `${b}/stakeholders`, icon: Users },
    { label: 'Relatórios',   href: `${b}/relatorios`,   icon: BarChart3 },
    {
      label: 'Configurações', icon: Settings2,
      children: [
        { label: 'Membros',   href: `${b}/configuracoes/membros` },
      ],
    },
  ]
}

// ─── Logo mark AltoQI ─────────────────────────────────────────────────────────

function AltoQILogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Triângulo/A estilizado — inspirado no logo AltoQI */}
      <path d="M16 4L28 26H4L16 4Z" fill="currentColor" className="text-primary" />
      <path d="M16 4L28 26H4L16 4Z" fill="url(#altoqi-grad)" />
      <path d="M10.5 22h11L16 12l-5.5 10Z" fill="white" fillOpacity="0.25" />
      <defs>
        <linearGradient id="altoqi-grad" x1="4" y1="26" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1aab68" />
          <stop offset="100%" stopColor="#25CE7B" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar({
  orgSlug,
  orgNome,
  userEmail,
}: {
  orgSlug: string
  orgNome: string
  userEmail?: string
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const nav      = buildNav(orgSlug)

  const initial = userEmail ? userEmail[0].toUpperCase() : '?'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      {/* ── Cabeçalho / Marca ───────────────── */}
      <SidebarHeader className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center">
            <AltoQILogo className="size-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-bold text-sidebar-foreground leading-tight tracking-tight" title={orgNome}>
              {orgNome}
            </p>
            <p className="text-[10px] text-muted-foreground/60 tracking-widest uppercase mt-0.5 dark:text-sidebar-foreground/35">
              Gestão Societária
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Navegação ───────────────────────── */}
      <SidebarContent className="py-3 px-3 gap-0 overflow-x-hidden">

        {/* Principal */}
        <SidebarMenu className="gap-0.5 mb-4">
          {nav.slice(0, 2).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href! + '/')
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  render={<Link href={item.href!} />}
                  isActive={active}
                  className={cn(
                    'rounded-lg h-9 text-[13.5px] gap-3 font-medium transition-all',
                    active
                      ? 'bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:text-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground dark:text-sidebar-foreground/55 dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground'
                  )}
                >
                  {item.icon && (
                    <item.icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-sidebar-foreground/50')} />
                  )}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        {/* Label: Módulos */}
        <div className="px-2 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none dark:text-sidebar-foreground/30">
            Módulos
          </p>
        </div>

        {/* Módulos com submenus */}
        <SidebarMenu className="gap-0.5 mb-4">
          {nav.slice(2, -3).map((item) => {
            if (!item.children) return null
            const isGroupActive = item.children.some((c) => pathname.startsWith(c.href))
            return (
              <Collapsible
                key={item.label}
                defaultOpen={isGroupActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger render={<div className="w-full" />}>
                    <SidebarMenuButton
                      isActive={isGroupActive}
                      className={cn(
                        'rounded-lg h-9 text-[13.5px] gap-3 font-medium transition-all',
                        isGroupActive
                          ? 'text-primary bg-primary/8 dark:bg-primary/12 dark:text-primary'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground dark:text-sidebar-foreground/55 dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground'
                      )}
                    >
                      {item.icon && (
                        <item.icon className={cn('size-4 shrink-0', isGroupActive ? 'text-primary' : 'text-sidebar-foreground/50')} />
                      )}
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn(
                        'size-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180',
                        isGroupActive ? 'text-primary/60' : 'text-sidebar-foreground/30'
                      )} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-6 border-l-2 border-sidebar-border pl-3 mt-0.5 mb-1 gap-0">
                      {item.children.map((child) => {
                        const active = pathname === child.href || pathname.startsWith(child.href + '/')
                        return (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton
                              render={<Link href={child.href} />}
                              isActive={active}
                              className={cn(
                                'text-[12.5px] py-1.5 rounded-md font-medium transition-all',
                                active
                                  ? 'text-primary bg-primary/8 dark:bg-primary/12'
                                  : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 dark:text-sidebar-foreground/45 dark:hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent/50'
                              )}
                            >
                              {active && (
                                <span className="mr-1 inline-block size-1.5 rounded-full bg-primary shrink-0" />
                              )}
                              {child.label}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>

        {/* Label: Mais */}
        <div className="px-2 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none dark:text-sidebar-foreground/30">
            Mais
          </p>
        </div>

        {/* Stakeholders + Relatórios */}
        <SidebarMenu className="gap-0.5 mb-4">
          {nav.slice(-3, -1).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href! + '/')
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  render={<Link href={item.href!} />}
                  isActive={active}
                  className={cn(
                    'rounded-lg h-9 text-[13.5px] gap-3 font-medium transition-all',
                    active
                      ? 'bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:text-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground dark:text-sidebar-foreground/55 dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground'
                  )}
                >
                  {item.icon && (
                    <item.icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-sidebar-foreground/50')} />
                  )}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        {/* Label: Configurações */}
        <div className="px-2 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none dark:text-sidebar-foreground/30">
            Configurações
          </p>
        </div>

        {/* Configurações com submenus */}
        <SidebarMenu className="gap-0.5">
          {nav.slice(-1).map((item) => {
            if (!item.children) return null
            const isGroupActive = item.children.some((c) => pathname.startsWith(c.href))
            return (
              <Collapsible
                key={item.label}
                defaultOpen={isGroupActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger render={<div className="w-full" />}>
                    <SidebarMenuButton
                      isActive={isGroupActive}
                      className={cn(
                        'rounded-lg h-9 text-[13.5px] gap-3 font-medium transition-all',
                        isGroupActive
                          ? 'text-primary bg-primary/8 dark:bg-primary/12 dark:text-primary'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground dark:text-sidebar-foreground/55 dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground'
                      )}
                    >
                      {item.icon && (
                        <item.icon className={cn('size-4 shrink-0', isGroupActive ? 'text-primary' : 'text-sidebar-foreground/50')} />
                      )}
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn(
                        'size-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180',
                        isGroupActive ? 'text-primary/60' : 'text-sidebar-foreground/30'
                      )} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-6 border-l-2 border-sidebar-border pl-3 mt-0.5 mb-1 gap-0">
                      {item.children.map((child) => {
                        const active = pathname === child.href || pathname.startsWith(child.href + '/')
                        return (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton
                              render={<Link href={child.href} />}
                              isActive={active}
                              className={cn(
                                'text-[12.5px] py-1.5 rounded-md font-medium transition-all',
                                active
                                  ? 'text-primary bg-primary/8 dark:bg-primary/12'
                                  : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 dark:text-sidebar-foreground/45 dark:hover:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent/50'
                              )}
                            >
                              {active && (
                                <span className="mr-1 inline-block size-1.5 rounded-full bg-primary shrink-0" />
                              )}
                              {child.label}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* ── Footer: usuário ──────────────────── */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors cursor-default group dark:hover:bg-sidebar-accent/40">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold select-none">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-sidebar-foreground/60 truncate">{userEmail ?? 'Usuário'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-sidebar-foreground/40 hover:text-red-500 p-0.5 rounded"
            title="Sair"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
