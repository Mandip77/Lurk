import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstallationOctokit } from '@/lib/github'
import { inngest } from '@/inngest/client'

function hmacMatches(body: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  const event = req.headers.get('x-github-event') ?? ''

  if (event !== 'pull_request') {
    return NextResponse.json({ ok: true })
  }

  // Fast pre-filter: validate against global webhook secret before touching the DB.
  // This prevents unauthenticated requests from probing whether a repo is registered.
  const globalSecret = process.env.GITHUB_WEBHOOK_SECRET
  if (globalSecret && !hmacMatches(body, signature, globalSecret)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = payload.action as string
  if (!['opened', 'synchronize', 'reopened'].includes(action)) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()
  const repoFullName = (payload.repository as { full_name: string }).full_name
  const pr = payload.pull_request as {
    number: number
    title: string
    user: { login: string }
    html_url: string
  }

  const { data: repo } = await supabase
    .from('repositories')
    .select('*, users(*)')
    .eq('full_name', repoFullName)
    .eq('is_active', true)
    .single()

  if (!repo) return NextResponse.json({ ok: true })

  // Verify per-repo HMAC (each repo can have its own webhook secret)
  if (!hmacMatches(body, signature, repo.webhook_secret)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const user = repo.users
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lurk.dev'

  // Idempotency: skip if a scan for this PR was created in the last 30 seconds
  const { data: recentScan } = await supabase
    .from('scans')
    .select('id, created_at')
    .eq('repository_id', repo.id)
    .eq('pr_number', pr.number)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentScan) {
    const age = Date.now() - new Date(recentScan.created_at).getTime()
    if (age < 30_000) {
      return NextResponse.json({ ok: true, scanId: recentScan.id, reason: 'duplicate' })
    }
  }

  // Quota check — uses get_monthly_limit() to respect referral bonus scans
  if (user.tier === 'free') {
    const thisMonth = new Date()
    thisMonth.setDate(1)
    const monthStr = thisMonth.toISOString().split('T')[0]

    const { data: monthlyLimit } = await supabase.rpc('get_monthly_limit', { p_user_id: user.id })
    const { data: quotaResult } = await supabase.rpc('check_quota', {
      p_user_id: user.id,
      p_month: monthStr,
      p_limit: monthlyLimit ?? 3,
    })

    if (!quotaResult) {
      try {
        const octokit = await getInstallationOctokit(repo.installation_id)
        const [owner, repoName] = repoFullName.split('/')
        await octokit.rest.issues.createComment({
          owner,
          repo: repoName,
          issue_number: pr.number,
          body: `## 👁️ Lurk\n\nYou've used all ${monthlyLimit ?? 3} free scans this month.\n\n[Upgrade to Pro →](${appUrl}/pricing) for unlimited scanning.`,
        })
      } catch {
        // Non-fatal
      }
      return NextResponse.json({ ok: true, reason: 'quota_exceeded' })
    }
  }

  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .insert({
      repository_id: repo.id,
      user_id: user.id,
      pr_number: pr.number,
      pr_title: pr.title,
      pr_author: pr.user.login,
      pr_url: pr.html_url,
      status: 'queued',
    })
    .select()
    .single()

  if (scanError || !scan) {
    return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 })
  }

  // Post "scanning" comment immediately
  try {
    const octokit = await getInstallationOctokit(repo.installation_id)
    const [owner, repoName] = repoFullName.split('/')
    await octokit.rest.issues.createComment({
      owner,
      repo: repoName,
      issue_number: pr.number,
      body: `## 🛡️ Lurk\n\n🔍 Scanning this PR for AI-generated code vulnerabilities...`,
    })
  } catch {
    // Non-fatal — continue even if comment fails
  }

  await inngest.send({ name: 'scan/requested', data: { scanId: scan.id } })

  return NextResponse.json({ ok: true, scanId: scan.id })
}
