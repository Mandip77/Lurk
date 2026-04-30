import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScansClient } from '@/components/dashboard/ScansClient'
import type { Scan } from '@/types'

type ScanWithRepo = Scan & { repositories: { full_name: string } | null }

export default async function ScansPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const repoIds =
    (await supabase.from('repositories').select('id').eq('user_id', user.id)).data?.map(
      r => r.id,
    ) ?? []

  const { data: scans } = await supabase
    .from('scans')
    .select('*, repositories(full_name)')
    .in('repository_id', repoIds)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Scans</h1>
        <p className="text-slate-400 mt-1">All pull request security scans</p>
      </div>

      <ScansClient scans={(scans ?? []) as ScanWithRepo[]} />
    </div>
  )
}
