import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: 'bg-slate-800 text-slate-400',
    scanning: 'bg-blue-900 text-blue-300',
    complete: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
  }
  return <Badge className={styles[status] ?? styles.queued}>{status}</Badge>
}

function ScoreChip({ score }: { score: number }) {
  const color = score >= 75 ? 'text-red-400' : score >= 50 ? 'text-orange-400' : score >= 25 ? 'text-yellow-400' : 'text-green-400'
  return <span className={`font-mono font-bold ${color}`}>{score}/100</span>
}

export default async function ScansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const repoIds = (await supabase.from('repositories').select('id').eq('user_id', user.id)).data?.map(r => r.id) ?? []

  const { data: scans } = await supabase
    .from('scans')
    .select('*, repositories(full_name)')
    .in('repository_id', repoIds)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Scans</h1>
        <p className="text-slate-400 mt-1">All pull request security scans</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        {(scans?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No scans yet. Connect a repository and open a pull request to trigger your first scan.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="p-4 text-slate-400 text-sm font-medium">PR / Repository</th>
                <th className="p-4 text-slate-400 text-sm font-medium">Score</th>
                <th className="p-4 text-slate-400 text-sm font-medium">Status</th>
                <th className="p-4 text-slate-400 text-sm font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {scans!.map(scan => (
                <tr key={scan.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4">
                    <Link href={`/scans/${scan.id}`} className="hover:text-[#00FF94] transition-colors">
                      <p className="text-white font-medium">{scan.pr_title ?? `PR #${scan.pr_number}`}</p>
                      <p className="text-slate-400 text-sm">{(scan.repositories as { full_name: string } | null)?.full_name}</p>
                    </Link>
                  </td>
                  <td className="p-4"><ScoreChip score={scan.severity_score} /></td>
                  <td className="p-4"><StatusBadge status={scan.status} /></td>
                  <td className="p-4 text-slate-400 text-sm">{new Date(scan.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
