import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { getInstallationOctokit } from '@/lib/github'
import { inngest } from '@/inngest/client'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  const event = req.headers.get('x-github-event') ?? ''

  if (event !== 'pull_request') {
    return NextResponse.json({ ok: true })
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

  // Verify HMAC using this repo's per-webhook secret
  const expected = 'sha256=' + createHmac('sha256', repo.webhook_secret).update(body).digest('hex')
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  } catch {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const user = repo.users
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sentinelai.dev'

  // Check free tier quota
  if (user.tier === 'free') {
    const thisMonth = new Date()
    thisMonth.setDate(1)
    const monthStr = thisMonth.toISOString().split('T')[0]

    const { data: usage } = await supabase
      .from('scan_usage')
      .select('scan_count')
      .eq('user_id', user.id)
      .eq('month', monthStr)
      .single()

    if ((usage?.scan_count ?? 0) >= 3) {
      const octokit = await getInstallationOctokit(repo.installation_id)
      const [owner, repoName] = repoFullName.split('/')
      await octokit.rest.issues.createComment({
        owner,
        repo: repoName,
        issue_number: pr.number,
        body: `## 🛡️ Sentinel AI\n\nYou've used all 3 free scans this month.\n\n[Upgrade to Pro →](${appUrl}/pricing) for unlimited scanning.`,
      })
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
      body: `## 🛡️ Sentinel AI\n\n🔍 Scanning this PR for AI-generated code vulnerabilities...`,
    })
  } catch {
    // Non-fatal — continue even if comment fails
  }

  await inngest.send({ name: 'scan/requested', data: { scanId: scan.id } })

  return NextResponse.json({ ok: true, scanId: scan.id })
}
