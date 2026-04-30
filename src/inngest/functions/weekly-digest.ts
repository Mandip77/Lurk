import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWeeklyDigestEmail } from '@/lib/resend'

export const weeklyDigest = inngest.createFunction(
  {
    id: 'weekly-digest',
    triggers: [{ cron: '0 9 * * 1' }],
  },
  async ({ step }: { step: import('inngest').GetStepTools<typeof inngest> }) => {
    const supabase = createServiceClient()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString()

    // Get all users who had at least one scan in the last 7 days
    const activeUsers = await step.run('get-active-users', async () => {
      const { data } = await supabase
        .from('scans')
        .select('user_id')
        .gte('created_at', sevenDaysAgoStr)
      if (!data) return []
      const uniqueIds = [...new Set(data.map(s => s.user_id))] as string[]
      return uniqueIds
    })

    if (activeUsers.length === 0) return { sent: 0 }

    // Fetch user profiles
    const users = await step.run('get-user-profiles', async () => {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', activeUsers)
      return data ?? []
    })

    let sent = 0

    for (const user of users) {
      await step.run(`digest-${user.id}`, async () => {
        // Fetch scans and findings for this user in the last 7 days
        const { data: scans } = await supabase
          .from('scans')
          .select('id, severity_score, pr_title, pr_url, created_at, repositories(full_name)')
          .eq('user_id', user.id)
          .eq('status', 'complete')
          .gte('created_at', sevenDaysAgoStr)
          .order('severity_score', { ascending: false })

        if (!scans || scans.length === 0) return

        // Fetch findings for all these scans
        const scanIds = scans.map(s => s.id)
        const { data: findings } = await supabase
          .from('findings')
          .select('severity')
          .in('scan_id', scanIds)
          .eq('user_id', user.id)
          .eq('suppressed', false)

        const findingCounts = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        }

        for (const f of findings ?? []) {
          if (f.severity in findingCounts) {
            findingCounts[f.severity as keyof typeof findingCounts]++
          }
        }

        const topScan = scans[0] // highest severity_score first
        const repos = new Set(
          scans
            .map(s => { const r = s.repositories; return (Array.isArray(r) ? r[0] : r as { full_name: string } | null)?.full_name })
            .filter(Boolean)
        )

        await sendWeeklyDigestEmail({
          to: user.email,
          name: user.full_name,
          totalScans: scans.length,
          reposScanned: repos.size,
          findingCounts,
          topScan: topScan
            ? {
                prTitle: topScan.pr_title ?? `Scan ${topScan.id.slice(0, 8)}`,
                severityScore: topScan.severity_score,
                scanId: topScan.id,
              }
            : null,
        })

        sent++
      })
    }

    return { sent }
  }
)
