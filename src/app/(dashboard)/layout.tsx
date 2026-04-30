import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'
import type { UserTier } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url, tier')
    .eq('id', user.id)
    .single()

  return (
    <DashboardShell
      tier={profile?.tier as UserTier | null}
      fullName={profile?.full_name}
      avatarUrl={profile?.avatar_url}
      email={user.email}
    >
      {children}
    </DashboardShell>
  )
}
