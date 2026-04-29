import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function RepositoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: repos } = await supabase
    .from('repositories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const installUrl = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL ?? '#'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Repositories</h1>
          <p className="text-slate-400 mt-1">Manage connected repositories</p>
        </div>
        <LinkButton href={installUrl} target="_blank" rel="noreferrer" className="bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium">
          + Install GitHub App
        </LinkButton>
      </div>

      {(repos?.length ?? 0) === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-12 text-center">
          <div className="text-4xl mb-4">📁</div>
          <h2 className="text-white font-semibold text-lg">No repositories connected</h2>
          <p className="text-slate-400 mt-2 mb-6">Install the Sentinel AI GitHub App to start scanning pull requests automatically.</p>
          <LinkButton href={installUrl} target="_blank" rel="noreferrer" className="bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium">
            Install GitHub App
          </LinkButton>
        </Card>
      ) : (
        <div className="space-y-3">
          {repos!.map(repo => (
            <Card key={repo.id} className="bg-slate-900 border-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{repo.full_name}</p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {repo.provider} · Added {new Date(repo.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge className={repo.is_active ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'}>
                {repo.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
