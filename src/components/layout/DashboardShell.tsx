'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import type { UserTier } from '@/types'

interface DashboardShellProps {
  children: React.ReactNode
  tier?: UserTier | null
  fullName?: string | null
  avatarUrl?: string | null
  email?: string | null
}

export function DashboardShell({ children, tier, fullName, avatarUrl, email }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#09090b] text-white overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar
          tier={tier}
          fullName={fullName}
          avatarUrl={avatarUrl}
          email={email}
          onMenuToggle={() => setMobileOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
