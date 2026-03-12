'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Mail, Users, Settings, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/campaigns', icon: Mail,            label: 'Campaigns' },
  { href: '/team',      icon: Users,           label: 'Team'      },
  { href: '/settings',  icon: Settings,        label: 'Settings'  },
]

type Profile = {
  name: string | null
  email: string
  organizations?: { name: string } | null
} | null

interface Props {
  profile: Profile
  children: React.ReactNode
}

export function AppShell({ profile, children }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  const sidebarW = collapsed ? 64 : 220

  return (
    <div className="flex min-h-screen bg-bg">
      {/* ── Sidebar ── */}
      <aside
        style={{ width: sidebarW }}
        className="shrink-0 border-r border-white/[0.07] bg-bg flex flex-col h-screen fixed left-0 top-0 z-40 transition-[width] duration-200 overflow-hidden"
      >
        {/* Logo */}
        <div className="h-14 flex items-center border-b border-white/[0.07] px-4 relative shrink-0">
          <Link
            href="/dashboard"
            className={cn('flex items-center gap-2 font-semibold text-[15px] tracking-tight', collapsed && 'justify-center w-full')}
          >
            <span className="w-6 h-6 bg-accent rounded-[5px] flex items-center justify-center shrink-0">
              <CheckSquare className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
            </span>
            {!collapsed && <span className="whitespace-nowrap">Win the Week</span>}
          </Link>
        </div>

        {/* Org name */}
        {!collapsed && profile?.organizations?.name && (
          <div className="px-5 py-3 border-b border-white/[0.05] shrink-0">
            <p className="text-[11px] font-medium text-[#52525b] uppercase tracking-[0.07em] truncate">
              {profile.organizations.name}
            </p>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center rounded-md text-[13.5px] font-medium transition-colors',
                  collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2',
                  active
                    ? 'bg-white/[0.07] text-white'
                    : 'text-[#71717a] hover:text-white hover:bg-white/[0.04]',
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-[#52525b]')} />
                {!collapsed && label}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div className={cn('px-2 pb-2 shrink-0', collapsed && 'flex justify-center')}>
          <button
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex items-center justify-center rounded-md p-2 text-[#52525b] hover:text-white hover:bg-white/[0.04] transition-colors',
              !collapsed && 'w-full gap-2 text-[13px] font-medium px-3'
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Profile footer */}
        {profile && (
          <div className="p-2 border-t border-white/[0.07] shrink-0">
            <div className={cn(
              'flex items-center rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer py-2',
              collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
            )}>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                {getInitials(profile.name ?? profile.email)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">
                    {profile.name ?? profile.email.split('@')[0]}
                  </p>
                  <p className="text-[11px] text-[#52525b] truncate">{profile.email}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <main
        style={{ marginLeft: sidebarW }}
        className="flex-1 min-h-screen transition-[margin-left] duration-200"
      >
        <div className="max-w-[1040px] mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
