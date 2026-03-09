'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Mail, Users, Settings, CheckSquare } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/campaigns',  icon: Mail,             label: 'Campaigns'  },
  { href: '/team',       icon: Users,            label: 'Team'       },
  { href: '/settings',  icon: Settings,         label: 'Settings'   },
]

type Props = {
  profile?: {
    name: string | null
    email: string
    organizations?: { name: string } | null
  } | null
}

export function Sidebar({ profile }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] shrink-0 border-r border-white/[0.07] bg-bg flex flex-col h-screen fixed left-0 top-0 z-40">

      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-white/[0.07]">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
          <span className="w-6 h-6 bg-accent rounded-[5px] flex items-center justify-center shrink-0">
            <CheckSquare className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
          </span>
          Win the Week
        </Link>
      </div>

      {/* Org name */}
      {profile?.organizations?.name && (
        <div className="px-5 py-3 border-b border-white/[0.05]">
          <p className="text-[11px] font-medium text-[#52525b] uppercase tracking-[0.07em] truncate">
            {profile.organizations.name}
          </p>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13.5px] font-medium transition-colors',
                active
                  ? 'bg-white/[0.07] text-white'
                  : 'text-[#71717a] hover:text-white hover:bg-white/[0.04]',
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-[#52525b]')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Profile footer */}
      {profile && (
        <div className="p-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {getInitials(profile.name ?? profile.email)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white truncate">
                {profile.name ?? profile.email.split('@')[0]}
              </p>
              <p className="text-[11px] text-[#52525b] truncate">{profile.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
