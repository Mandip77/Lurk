import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { UserTier } from '@/types'

const tierColors: Record<UserTier, string> = {
  free: 'bg-slate-700 text-slate-300',
  pro: 'bg-blue-900 text-blue-300',
  agency: 'bg-purple-900 text-purple-300',
}

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url, tier')
    .eq('id', user?.id ?? '')
    .single()

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-end px-6 gap-4">
      {profile?.tier && (
        <Badge className={tierColors[profile.tier as UserTier]}>
          {profile.tier.toUpperCase()}
        </Badge>
      )}
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url ?? ''} />
          <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
            {profile?.full_name?.[0] ?? user?.email?.[0] ?? 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-slate-300">{profile?.full_name ?? user?.email}</span>
      </div>
    </header>
  )
}
