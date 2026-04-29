import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('tier').eq('id', user.id).single()

  if (profile?.tier !== 'agency') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <Card className="bg-slate-900 border-slate-800 p-12 text-center">
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-white font-semibold text-lg">Agency tier required</h2>
          <p className="text-slate-400 mt-2 mb-2">
            White-label shareable reports are available on the Agency plan.
          </p>
          <p className="text-slate-500 text-sm mb-6">
            Reports are web pages — shareable, printable, and save to PDF via the browser.
          </p>
          <LinkButton href="/pricing" className="bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium">
            Upgrade to Agency
          </LinkButton>
        </Card>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data: reports } = await supabase
    .from('reports')
    .select('*, scans(pr_title, severity_score, repositories(full_name))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400 mt-1">Shareable white-label security reports</p>
        </div>
        <LinkButton href="/scans" className="bg-slate-800 hover:bg-slate-700 text-white">
          Generate from a Scan
        </LinkButton>
      </div>

      {(reports?.length ?? 0) === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-8 text-center text-slate-400">
          No reports yet. Go to a scan detail page and click &quot;Generate Report&quot;.
        </Card>
      ) : (
        <div className="space-y-3">
          {reports!.map(report => {
            const scan = report.scans as { pr_title: string; severity_score: number; repositories: { full_name: string } } | null
            const reportUrl = `${appUrl}/reports/${report.slug}`
            return (
              <Card key={report.id} className="bg-slate-900 border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{report.client_name ?? 'Report'}</p>
                  <p className="text-slate-400 text-sm">
                    {report.agency_name} · {scan?.repositories?.full_name} · {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={report.is_public ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'}>
                    {report.is_public ? 'Public' : 'Private'}
                  </Badge>
                  <LinkButton href={reportUrl} target="_blank" rel="noreferrer" size="sm" className="bg-slate-800 hover:bg-slate-700">
                    View Report
                  </LinkButton>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
