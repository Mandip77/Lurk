import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyGitHubSignature, getInstallationOctokit, postPRComment } from '@/lib/github'
import { inngest } from '@/inngest/client'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const payload = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''
  const event = req.headers.get('x-github-event') ?? ''

  if (event !== 'pull_request') {
    return NextResponse.json({ ok: true })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action as string
  if (!['opened', 'synchronize', 'reopened'].includes(action)) {
    return NextResponse.json({ ok: true })
  }

  const repoFullName = (body.repository as { full_name: string }).full_name
  const pr = body.pull_request as {
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

  if (!repo) {
    return NextResponse.json({ error: 'Repo not found' }, { status: 404 })
  }

  if (!verifyGitHubSignature(payload, signature, repo.webhook_secret ?? '')) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const user = repo.users
  const thisMonth = new Date()
  thisMonth.setDate(1)
  const monthStr = thisMonth.toISOString().split('T')[0]

  const { data: usage } = await supabase
    .from('scan_usage')
    .select('scan_count')
    .eq('user_id', user.id)
    .eq('month', monthStr)
    .single()

  if (user.tier === 'free' && (usage?.scan_count ?? 0) >= 3) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sentinelai.dev'
    const octokit = await getInstallationOctokit(repo.installation_id)
    const [owner, repoName] = repoFullName.split('/')
    await postPRComment(
      octokit,
      owner,
      repoName,
      pr.number,
      `## 🛡️ Sentinel AI\n\nYou've reached your free tier limit of **3 scans per month**.\n\n[Upgrade to Pro](${appUrl}/pricing) to get unlimited scans, fix suggestions, and more.`
    )
    return NextResponse.json({ ok: true, reason: 'quota_exceeded' })
  }

  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .insert({
      repository_id: repo.id,
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

  await inngest.send({
    name: 'scan/requested',
    data: { scanId: scan.id },
  })

  const octokit = await getInstallationOctokit(repo.installation_id)
  const [owner, repoName] = repoFullName.split('/')
  await postPRComment(
    octokit,
    owner,
    repoName,
    pr.number,
    `## 🔍 Sentinel AI\n\nScanning this PR for security vulnerabilities... Results will appear here shortly.`
  )

  return NextResponse.json({ ok: true, scanId: scan.id })
}
