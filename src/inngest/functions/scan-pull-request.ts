import { inngest } from '../client'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstallationOctokit } from '@/lib/github'
import { sendScanCompleteEmail } from '@/lib/resend'
import type { ClaudeFinding } from '@/types'

const SEVERITY_POINTS: Record<string, number> = {
  critical: 25, high: 15, medium: 8, low: 3, info: 1,
}

const SEVERITY_ICONS: Record<string, string> = {
  critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: '⚪',
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

const SYSTEM_PROMPT = `You are a specialized security auditor for AI-generated code vulnerabilities.

Analyze the provided git diff for these specific vulnerability classes:

1. OVER-PERMISSIVE DATABASE ACCESS
   - Supabase RLS disabled or using policy "for all using (true)"
   - Firebase rules allowing unauthenticated reads/writes
   - Missing auth.uid() checks in RLS policies
   - SQL with no WHERE clause on user-owned data

2. BROKEN AUTH & SESSION HANDLING
   - JWT/tokens stored in localStorage (use httpOnly cookies instead)
   - Hardcoded secrets, API keys, or passwords in code
   - Missing token expiry or validation
   - Auth checks that can be bypassed with null/undefined

3. SUPPLY CHAIN VULNERABILITIES
   - npm package names that appear hallucinated or don't exist
   - Typosquatting patterns (e.g. "expres" instead of "express")
   - Packages with no version pinning (using "*" or "latest")
   - Known vulnerable package versions

4. PROMPT INJECTION RISKS
   - Raw user input concatenated into LLM prompts
   - Missing sanitization before AI API calls
   - System prompt exposure vectors

Return ONLY a valid JSON array. No markdown, no explanation. Empty array if nothing found.
Schema per finding:
{
  "category": "rls_misconfiguration|broken_auth|supply_chain|prompt_injection|other",
  "severity": "critical|high|medium|low|info",
  "title": "string (max 80 chars)",
  "description": "string (explain the risk clearly)",
  "file_path": "string",
  "line_start": number,
  "line_end": number,
  "code_snippet": "string (the problematic code)",
  "fix_suggestion": "string (concrete fix with code example)",
  "cve_reference": "string|null"
}`

function calcScore(findings: ClaudeFinding[]): number {
  return Math.min(100, findings.reduce((acc, f) => acc + (SEVERITY_POINTS[f.severity] ?? 0), 0))
}

function buildPRComment(
  findings: ClaudeFinding[],
  scanId: string,
  userTier: string,
  appUrl: string
): string {
  const score = calcScore(findings)
  const statusEmoji = score === 0 ? '✅' : score < 25 ? '🟡' : score < 50 ? '🟠' : '🔴'
  const statusText = score === 0 ? 'PASSED' : score < 25 ? 'LOW RISK' : score < 50 ? 'MEDIUM RISK' : score >= 75 ? 'CRITICAL' : 'HIGH RISK'
  const showFixes = userTier !== 'free'

  let comment = `## 🛡️ Lurk Security Scan\n\n`
  comment += `**Status**: ${statusEmoji} ${statusText} &nbsp;&nbsp; **Score**: ${score}/100 &nbsp;&nbsp; **Findings**: ${findings.length}\n\n`
  comment += `---\n\n`

  if (findings.length === 0) {
    comment += `✅ No vulnerabilities detected in this PR.\n\n`
  } else {
    const sorted = [...findings].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    )

    for (const f of sorted) {
      comment += `### ${SEVERITY_ICONS[f.severity] ?? '⚪'} ${f.severity.toUpperCase()} - ${f.title}\n`
      comment += `**File**: \`${f.file_path}\``
      if (f.line_start) comment += ` · Lines ${f.line_start}${f.line_end && f.line_end !== f.line_start ? `-${f.line_end}` : ''}`
      comment += ` | **Category**: ${f.category.replace(/_/g, ' ')}\n\n`
      comment += `${f.description}\n\n`
      if (f.code_snippet) {
        comment += `\`\`\`\n${f.code_snippet}\n\`\`\`\n\n`
      }
      if (showFixes && f.fix_suggestion) {
        comment += `**Fix**: ${f.fix_suggestion}\n\n`
      } else if (!showFixes) {
        comment += `> 🔒 Fix suggestion available on [Pro plan](${appUrl}/pricing)\n\n`
      }
      comment += `---\n\n`
    }
  }

  comment += `[View full report](${appUrl}/scans/${scanId}) · Powered by [Lurk](${appUrl})`
  return comment
}

export const scanPullRequest = inngest.createFunction(
  {
    id: 'scan-pull-request',
    retries: 2,
    triggers: [{ event: 'scan/requested' }],
  },
  async ({ event, step }: { event: { data: { scanId: string } }; step: import('inngest').GetStepTools<typeof inngest> }) => {
    const { scanId } = event.data
    const supabase = createServiceClient()

    const scan = await step.run('fetch-scan', async () => {
      const { data, error } = await supabase
        .from('scans')
        .select('*, repositories(*), users(*)')
        .eq('id', scanId)
        .single()
      if (error) throw new Error(`Scan not found: ${error.message}`)
      await supabase.from('scans').update({ status: 'scanning' }).eq('id', scanId)
      return data
    })

    const customRules = await step.run('fetch-custom-rules', async () => {
      const { data } = await supabase
        .from('custom_rules')
        .select('name, pattern, severity, description')
        .eq('user_id', scan.user_id)
        .eq('is_active', true)
      return data ?? []
    })

    const diff = await step.run('fetch-diff', async () => {
      const repo = scan.repositories
      if (!repo.installation_id) throw new Error('No installation ID')

      const octokit = await getInstallationOctokit(repo.installation_id)
      const [owner, repoName] = repo.full_name.split('/')
      const { data } = await octokit.rest.pulls.get({
        owner,
        repo: repoName,
        pull_number: scan.pr_number,
        mediaType: { format: 'diff' },
      })
      return String(data).slice(0, 80_000)
    })

    const { findings, tokensUsed } = await step.run('ai-analysis', async (): Promise<{ findings: ClaudeFinding[]; tokensUsed: number }> => {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const anthropic = new Anthropic({ apiKey })

      let systemPrompt = SYSTEM_PROMPT
      if (customRules.length > 0) {
        // Strip newlines and control characters to prevent prompt injection via rule fields
        const sanitize = (s: string) => s.replace(/[\r\n\t]/g, ' ').replace(/[^\x20-\x7E]/g, '').slice(0, 200)
        const rulesSection = customRules
          .map((r: { name: string; pattern: string; severity: string; description: string | null }) =>
            `- ${sanitize(r.name)}: ${sanitize(r.pattern)} → severity: ${r.severity}`
          )
          .join('\n')
        systemPrompt += `\n\nCUSTOM RULES (flag these patterns specifically):\n${rulesSection}`
      }

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Analyze this PR diff:\n\n${diff}` }],
      })

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => 'text' in b ? b.text : '')
        .join('')
      const tokens = response.usage.input_tokens + response.usage.output_tokens

      try {
        const clean = text.replace(/```json|```/g, '').trim()
        const jsonMatch = clean.match(/\[[\s\S]*\]/)
        if (!jsonMatch) return { findings: [], tokensUsed: tokens }
        return { findings: JSON.parse(jsonMatch[0]) as ClaudeFinding[], tokensUsed: tokens }
      } catch {
        return { findings: [], tokensUsed: tokens }
      }
    })

    const score = calcScore(findings)

    await step.run('store-results', async () => {
      await supabase.from('scans').update({
        status: 'complete',
        findings,
        severity_score: score,
        tokens_used: tokensUsed,
        model_used: 'claude-haiku-4-5',
        completed_at: new Date().toISOString(),
      }).eq('id', scanId)

      if (findings.length > 0) {
        await supabase.from('findings').insert(
          findings.map(f => ({ ...f, scan_id: scanId, user_id: scan.user_id }))
        )
      }

      const monthStr = new Date().toISOString().slice(0, 7) + '-01'
      await supabase.rpc('increment_scan_usage', {
        p_user_id: scan.user_id,
        p_month: monthStr,
      })
    })

    await step.run('post-comment', async () => {
      const repo = scan.repositories
      if (!repo.installation_id || !scan.pr_number) return

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lurk.dev'
      const comment = buildPRComment(findings, scanId, scan.users.tier, appUrl)

      const octokit = await getInstallationOctokit(repo.installation_id)
      const [owner, repoName] = repo.full_name.split('/')
      await octokit.rest.issues.createComment({
        owner,
        repo: repoName,
        issue_number: scan.pr_number,
        body: comment,
      })
    })

    await step.run('send-email', async () => {
      const user = scan.users
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lurk.dev'
      await sendScanCompleteEmail({
        to: user.email,
        name: user.full_name,
        repoName: scan.repositories.full_name,
        prTitle: scan.pr_title ?? 'Unknown PR',
        severityScore: score,
        findingsCount: findings.length,
        scanUrl: `${appUrl}/scans/${scanId}`,
      })
    })

    return { scanId, score, findingsCount: findings.length, tokensUsed }
  }
)
