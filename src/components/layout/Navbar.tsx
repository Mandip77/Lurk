'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { UserTier } from '@/types'

const tierColors: Record<UserTier, string> = {
  free: 'bg-slate-700 text-slate-300',
  pro: 'bg-blue-900 text-blue-300',
  agency: 'bg-purple-900 text-purple-300',
}

interface NavbarProps {
  tier?: UserTier | null
  fullName?: string | null
  avatarUrl?: string | null
  email?: string | null
  onMenuToggle?: () => void
}

export function Navbar({ tier, fullName, avatarUrl, email, onMenuToggle }: NavbarProps) {
  return (
    <header className="h-14 border-b border-white/5 bg-[#080f1e] flex items-center justify-between px-4 sm:px-6">
      {/* Hamburger — mobile only */}
      <button
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
      >
        <span className="w-5 h-0.5 bg-current rounded-full" />
        <span className="w-5 h-0.5 bg-current rounded-full" />
        <span className="w-5 h-0.5 bg-current rounded-full" />
      </button>

      <div className="text-xs text-slate-600 hidden sm:block">
        Security scanning for AI-generated code
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <ThemeToggle />
        {tier && (
          <Badge className={`${tierColors[tier]} text-xs font-medium`}>
            {tier.toUpperCase()}
          </Badge>
        )}
        <div className="flex items-center gap-2.5 pl-3 border-l border-white/5">
          <Avatar className="h-7 w-7 ring-1 ring-white/10">
            <AvatarImage src={avatarUrl ?? ''} />
            <AvatarFallback className="bg-[#00FF94]/10 text-[#00FF94] text-xs font-semibold">
              {fullName?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-slate-300 hidden sm:block">{fullName ?? email}</span>
        </div>
      </div>
    </header>
  )
}
