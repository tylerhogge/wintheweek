'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Mail, Users, Settings, CheckSquare, ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

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
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  // Close profile menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
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

          {/* Collapse toggle — sits on right edge of sidebar */}
          <button
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-bg border border-white/[0.12] flex items-center justify-center text-[#71717a] hover:text-white hover:border-white/25 transition-colors z-10 shadow-sm"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
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

        {/* Profile footer */}
        {profile && (
          <div className="p-2 border-t border-white/[0.07] shrink-0 relative" ref={profileRef}>

            {/* Profile popover menu */}
            {profileOpen && (
              <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#1c1c1f] border border-white/[0.1] rounded-xl shadow-xl overflow-hidden z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-white/[0.07]">
                  <p className="text-[13px] font-semibold text-white truncate">{profile.name ?? profile.email.split('@')[0]}</p>
                  <p className="text-[11px] text-[#71717a] truncate">{profile.email}</p>
                </div>
                {/* Actions */}
                <div className="p-1">
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[#a1a1aa] hover:text-white hover:bg-white/[0.06] transition-colors w-full"
                  >
                    <User className="w-3.5 h-3.5 shrink-0" />
                    Account settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/[0.08] transition-colors w-full"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {/* Trigger */}
            <button
              onClick={() => setProfileOpen((p) => !p)}
              className={cn(
                'flex items-center rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer py-2 w-full',
                collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
                profileOpen && 'bg-white/[0.06]'
              )}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                {getInitials(profile.name ?? profile.email)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-medium text-white truncate">
                    {profile.name ?? profile.email.split('@')[0]}
                  </p>
                  <p className="text-[11px] text-[#52525b] truncate">{profile.email}</p>
                </div>
              )}
            </button>
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
