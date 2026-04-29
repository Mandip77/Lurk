import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'

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
          <p className="text-slate-400 mt-2 mb-6">White-label PDF reports are available on the Agency plan.</p>
          <LinkButton href="/pricing" className="bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium">
            Upgrade to Agency
          </LinkButton>
        </Card>
      </div>
    )
  }

  const { data: reports } = await supabase
    .from('reports')
    .select('*, scans(pr_title, severity_score, repositories(full_name))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">PDF Reports</h1>
        <p className="text-slate-400 mt-1">White-label security reports for your clients</p>
      </div>

      {(reports?.length ?? 0) === 0 ? (
        <Card className="bg-slate-900 border-slate-800 p-8 text-center text-slate-400">
          No reports generated yet. Go to a scan and click &quot;Generate PDF Report&quot;.
        </Card>
      ) : (
        <div className="space-y-3">
          {reports!.map(report => (
            <Card key={report.id} className="bg-slate-900 border-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{report.client_name}</p>
                <p className="text-slate-400 text-sm">
                  {report.agency_name} · {new Date(report.created_at).toLocaleDateString()}
                </p>
              </div>
              {report.pdf_url && (
                <LinkButton href={report.pdf_url} size="sm" className="bg-slate-800 hover:bg-slate-700" target="_blank" rel="noreferrer">
                  Download PDF
                </LinkButton>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
