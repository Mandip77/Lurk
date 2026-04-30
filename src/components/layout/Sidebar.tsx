'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/repositories', label: 'Repositories', icon: '📁' },
  { href: '/scans', label: 'Scans', icon: '🔍' },
  { href: '/reports', label: 'Reports', icon: '📄' },
  { href: '/pricing', label: 'Pricing', icon: '💳' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 bg-[#080f1e] border-r border-white/5 flex flex-col">
      <div className="p-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/30 flex items-center justify-center text-sm transition-all duration-200 group-hover:bg-[#00FF94]/20 group-hover:scale-110">
            👁️
          </div>
          <span className="font-bold text-white text-sm group-hover:text-[#00FF94] transition-colors duration-200">Lurk</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative group',
                active
                  ? 'bg-[#00FF94]/10 text-[#00FF94]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#00FF94] rounded-full" />
              )}
              <span className={cn('transition-transform duration-150', active ? '' : 'group-hover:scale-110')}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-slate-400 transition-colors duration-150">
          ← Back to site
        </Link>
      </div>
    </aside>
  )
}
