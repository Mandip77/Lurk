import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { getInstallationOctokit, getPRDiff, postPRComment, formatScanComment } from '@/lib/github'
import { scanCodeWithClaude, calculateSeverityScore } from '@/lib/anthropic'
import { sendScanCompleteEmail } from '@/lib/resend'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const scanPullRequest = inngest.createFunction(
  {
    id: 'scan-pull-request',
    retries: 3,
    triggers: [{ event: 'scan/requested' }],
  },
  async ({ event, step }: { event: { data: { scanId: string } }; step: import('inngest').GetStepTools<typeof inngest> }) => {
    const { scanId } = event.data
    const supabase = getSupabase()

    const scan = await step.run('fetch-scan', async () => {
      const { data, error } = await supabase
        .from('scans')
        .select('*, repositories(*, users(*))')
        .eq('id', scanId)
        .single()
      if (error) throw new Error(`Scan not found: ${error.message}`)
      return data
    })

    await step.run('update-status-scanning', async () => {
      await supabase.from('scans').update({ status: 'scanning' }).eq('id', scanId)
    })

    const diff = await step.run('fetch-pr-diff', async () => {
      const repo = scan.repositories
      if (!repo.installation_id) throw new Error('No installation ID')

      const octokit = await getInstallationOctokit(repo.installation_id)
      const [owner, repoName] = repo.full_name.split('/')
      return getPRDiff(octokit, owner, repoName, scan.pr_number)
    })

    const { findings: claudeFindings, tokensUsed } = await step.run('run-ai-analysis', async () => {
      return scanCodeWithClaude(diff)
    })

    const severityScore = calculateSeverityScore(claudeFindings)

    await step.run('persist-findings', async () => {
      if (claudeFindings.length > 0) {
        const findingRows = claudeFindings.map(f => ({
          scan_id: scanId,
          category: f.category,
          severity: f.severity,
          title: f.title,
          description: f.description,
          file_path: f.file_path,
          line_start: f.line_start,
          line_end: f.line_end,
          code_snippet: f.code_snippet,
          fix_suggestion: f.fix_suggestion,
          cve_reference: f.cve_reference,
        }))
        await supabase.from('findings').insert(findingRows)
      }

      await supabase.from('scans').update({
        status: 'complete',
        findings: claudeFindings,
        severity_score: severityScore,
        tokens_used: tokensUsed,
        completed_at: new Date().toISOString(),
      }).eq('id', scanId)

      const thisMonth = new Date()
      thisMonth.setDate(1)
      const monthStr = thisMonth.toISOString().split('T')[0]
      const userId = scan.repositories.user_id

      await supabase.from('scan_usage').upsert(
        { user_id: userId, month: monthStr, scan_count: 1 },
        {
          onConflict: 'user_id,month',
          ignoreDuplicates: false,
        }
      )

      await supabase.rpc('increment_scan_count', { p_user_id: userId, p_month: monthStr })
    })

    await step.run('post-pr-comment', async () => {
      const repo = scan.repositories
      const user = repo.users
      if (!repo.installation_id || !scan.pr_number) return

      const octokit = await getInstallationOctokit(repo.installation_id)
      const [owner, repoName] = repo.full_name.split('/')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sentinelai.dev'

      const comment = formatScanComment(
        severityScore,
        claudeFindings,
        scanId,
        user.tier,
        appUrl
      )

      await postPRComment(octokit, owner, repoName, scan.pr_number, comment)
    })

    await step.run('send-email', async () => {
      const user = scan.repositories.users
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sentinelai.dev'

      await sendScanCompleteEmail({
        to: user.email,
        name: user.full_name,
        repoName: scan.repositories.full_name,
        prTitle: scan.pr_title ?? 'Unknown PR',
        severityScore,
        findingsCount: claudeFindings.length,
        scanUrl: `${appUrl}/scans/${scanId}`,
      })
    })

    return { scanId, severityScore, findingsCount: claudeFindings.length }
  }
)
