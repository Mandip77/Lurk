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
    <header className="h-14 border-b border-white/5 bg-[#080f1e] flex items-center justify-between px-6">
      <div className="text-xs text-slate-600 hidden sm:block">
        Security scanning for AI-generated code
      </div>
      <div className="flex items-center gap-3 ml-auto">
        {profile?.tier && (
          <Badge className={`${tierColors[profile.tier as UserTier]} text-xs font-medium`}>
            {profile.tier.toUpperCase()}
          </Badge>
        )}
        <div className="flex items-center gap-2.5 pl-3 border-l border-white/5">
          <Avatar className="h-7 w-7 ring-1 ring-white/10">
            <AvatarImage src={profile?.avatar_url ?? ''} />
            <AvatarFallback className="bg-[#00FF94]/10 text-[#00FF94] text-xs font-semibold">
              {profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-slate-300 hidden sm:block">{profile?.full_name ?? user?.email}</span>
        </div>
      </div>
    </header>
  )
}
