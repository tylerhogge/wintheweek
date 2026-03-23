'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Mail, Users, Settings, CheckSquare, ChevronLeft, ChevronRight, LogOut, User, BarChart3 } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', anim: 'group-hover:animate-icon-bounce'  },
  { href: '/team',      icon: Users,           label: 'Team',      anim: 'group-hover:animate-icon-wiggle'  },
  { href: '/campaigns', icon: Mail,            label: 'Emails',    anim: 'group-hover:animate-icon-tilt'    },
  { href: '/trends',    icon: BarChart3,       label: 'Trends',    anim: 'group-hover:animate-icon-bounce'  },
  { href: '/settings',  icon: Settings,        label: 'Settings',  anim: 'group-hover:animate-icon-spin'    },
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
  const mobileProfileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const clickedInDesktop = profileRef.current?.contains(e.target as Node)
      const clickedInMobile = mobileProfileRef.current?.contains(e.target as Node)
      if (!clickedInDesktop && !clickedInMobile) setProfileOpen(false)
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

      {/* ── Sidebar (desktop only) ── */}
      <aside
        style={{ width: sidebarW }}
        className="hidden md:flex shrink-0 border-r border-white/[0.07] bg-bg flex-col h-screen fixed left-0 top-0 z-40 transition-[width] duration-200 overflow-hidden"
      >
        {/* Logo */}
        <div className="h-14 flex items-center border-b border-white/[0.07] px-4 shrink-0 gap-2">
          <Link
            href="/dashboard"
            className={cn('flex items-center gap-2 font-semibold text-[15px] tracking-tight flex-1 min-w-0', collapsed && 'justify-center')}
          >
            <span className="w-6 h-6 bg-accent rounded-[5px] flex items-center justify-center shrink-0">
              <CheckSquare className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
            </span>
            {!collapsed && <span className="whitespace-nowrap">Win the Week</span>}
          </Link>
          <button
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[#52525b] hover:text-white hover:bg-white/[0.07] transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!collapsed && profile?.organizations?.name && (
          <div className="px-5 py-3 border-b border-white/[0.05] shrink-0">
            <p className="text-[11px] font-medium text-[#52525b] uppercase tracking-[0.07em] truncate">
              {profile.organizations.name}
            </p>
          </div>
        )}

        <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label, anim }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                title={collapsed ? label : undefined}
                className={cn(
                  'group flex items-center rounded-md text-[13.5px] font-medium transition-colors',
                  collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2',
                  active ? 'bg-white/[0.07] text-white' : 'text-[#71717a] hover:text-white hover:bg-white/[0.04]',
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', anim, active ? 'text-white' : 'text-[#52525b] group-hover:text-white')} />
                {!collapsed && label}
              </Link>
            )
          })}
        </nav>

        {profile && (
          <div className="p-2 border-t border-white/[0.07] shrink-0 relative" ref={profileRef}>
            {profileOpen && (
              <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#1c1c1f] border border-white/[0.1] rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/[0.07]">
                  <p className="text-[13px] font-semibold text-white truncate">{profile.name ?? profile.email.split('@')[0]}</p>
                  <p className="text-[11px] text-[#71717a] truncate">{profile.email}</p>
                </div>
                <div className="p-1">
                  <Link href="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[#a1a1aa] hover:text-white hover:bg-white/[0.06] transition-colors w-full">
                    <User className="w-3.5 h-3.5 shrink-0" />Account settings
                  </Link>
                  <button onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/[0.08] transition-colors w-full">
                    <LogOut className="w-3.5 h-3.5 shrink-0" />Sign out
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setProfileOpen((p) => !p)}
              className={cn('flex items-center rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer py-2 w-full', collapsed ? 'justify-center px-2' : 'gap-2.5 px-3', profileOpen && 'bg-white/[0.06]')}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                {getInitials(profile.name ?? profile.email)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-medium text-white truncate">{profile.name ?? profile.email.split('@')[0]}</p>
                  <p className="text-[11px] text-[#52525b] truncate">{profile.email}</p>
                </div>
              )}
            </button>
          </div>
        )}
      </aside>

      {/* ── Content wrapper — margin on desktop, full-width on mobile ── */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-[margin-left] duration-200',
          collapsed ? 'md:ml-[64px]' : 'md:ml-[220px]'
        )}
      >
        {/* Mobile top bar */}
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-white/[0.07] bg-bg sticky top-0 z-30">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
            <span className="w-6 h-6 bg-accent rounded-[5px] flex items-center justify-center shrink-0">
              <CheckSquare className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
            </span>
            Win the Week
          </Link>
          {profile && (
            <div className="relative" ref={mobileProfileRef}>
              <button
                onClick={() => setProfileOpen((p) => !p)}
                className={cn('w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-[11px] font-bold text-white', profileOpen && 'ring-2 ring-violet-400')}
              >
                {getInitials(profile.name ?? profile.email)}
              </button>
              {profileOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#1c1c1f] border border-white/[0.1] rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/[0.07]">
                    <p className="text-[13px] font-semibold text-white truncate">{profile.name ?? profile.email.split('@')[0]}</p>
                    <p className="text-[11px] text-[#71717a] truncate">{profile.email}</p>
                  </div>
                  <div className="p-1">
                    <button onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/[0.08] transition-colors w-full">
                      <LogOut className="w-3.5 h-3.5 shrink-0" />Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Page content — responsive padding, bottom padding on mobile for nav bar */}
        <main className="flex-1 max-w-[1040px] w-full mx-auto px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg border-t border-white/[0.07] z-30 flex items-center justify-around h-16">
          {NAV.map(({ href, icon: Icon, label, anim }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                className={cn(
                  'group flex flex-col items-center gap-1 px-5 py-2 rounded-lg transition-colors',
                  active ? 'text-white' : 'text-[#52525b]'
                )}
              >
                <Icon className={cn('w-5 h-5', anim)} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

    </div>
  )
}
