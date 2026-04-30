'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { UserTier } from '@/types'

const tierColors: Record<UserTier, string> = {
  free: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  pro: 'bg-blue-900/50 text-blue-300 border-blue-800',
  agency: 'bg-purple-900/50 text-purple-300 border-purple-800',
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
    <header className="h-14 border-b border-[#27272a] bg-[#09090b] flex items-center justify-between px-4 sm:px-6">
      {/* Hamburger - mobile only */}
      <button
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
      >
        <span className="w-5 h-0.5 bg-current rounded-full" />
        <span className="w-5 h-0.5 bg-current rounded-full" />
        <span className="w-5 h-0.5 bg-current rounded-full" />
      </button>

      <div className="text-xs text-zinc-400 hidden sm:block">
        Security scanning for AI-generated code
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <ThemeToggle />
        {tier && (
          <Badge className={`${tierColors[tier]} text-xs font-medium border`}>
            {tier.toUpperCase()}
          </Badge>
        )}
        <Link href="/profile" className="flex items-center gap-2.5 pl-3 border-l border-[#27272a] group">
          <Avatar className="h-7 w-7 ring-1 ring-zinc-700 group-hover:ring-[#00FF94]/50 transition-all">
            <AvatarImage src={avatarUrl ?? ''} />
            <AvatarFallback className="bg-[#00FF94]/10 text-[#00FF94] text-xs font-semibold">
              {fullName?.[0]?.toUpperCase() ?? email?.[0]?.toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-zinc-400 hidden sm:block group-hover:text-white transition-colors">{fullName ?? email}</span>
        </Link>
      </div>
    </header>
  )
}
