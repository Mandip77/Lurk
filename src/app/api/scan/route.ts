import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { inngest } from '@/inngest/client'

const ScanRequestSchema = z.object({
  repository_full_name: z.string().min(1).max(200),
  pr_number: z.number().int().positive().max(999999),
  diff: z.string().max(500_000).optional(),
})

async function getApiKeyUser(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  if (!token || token.length < 10) return null
  const keyHash = createHash('sha256').update(token).digest('hex')

  const service = createServiceClient()
  const { data: apiKey } = await service
    .from('api_keys')
    .select('id, user_id, expires_at, users(tier, id, email)')
    .eq('key_hash', keyHash)
    .single()

  if (!apiKey) return null

  // Reject expired keys
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) return null

  // Update last_used_at (fire-and-forget — don't block on it)
  service.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id)

  return apiKey
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const apiKey = await getApiKeyUser(authHeader)

  if (!apiKey) {
    return NextResponse.json({ error: 'Unauthorized — provide a valid Bearer API key' }, { status: 401 })
  }

  const user = (Array.isArray(apiKey.users) ? apiKey.users[0] : apiKey.users) as { id: string; tier: string; email: string }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ScanRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 422 })
  }

  const { repository_full_name, pr_number, diff: providedDiff } = parsed.data
  const service = createServiceClient()

  // Quota check — respects bonus scans from referrals via get_monthly_limit()
  const thisMonth = new Date()
  thisMonth.setDate(1)
  const monthStr = thisMonth.toISOString().split('T')[0]

  const { data: monthlyLimit } = await service.rpc('get_monthly_limit', { p_user_id: user.id })
  const effectiveLimit = (monthlyLimit as number | null) ?? (user.tier === 'free' ? 3 : 999999)

  if (user.tier === 'free') {
    const { data: quotaOk } = await service.rpc('check_quota', {
      p_user_id: user.id,
      p_month: monthStr,
      p_limit: effectiveLimit,
    })
    if (!quotaOk) {
      return NextResponse.json({ error: 'Monthly scan quota exceeded' }, { status: 429 })
    }
  }

  // Find repository — scoped to this user
  const { data: repo } = await service
    .from('repositories')
    .select('*')
    .eq('full_name', repository_full_name)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!repo) {
    return NextResponse.json({ error: 'Repository not found or not active' }, { status: 404 })
  }

  // Idempotency: skip if a scan for this PR was created in the last 30 seconds
  const { data: recentScan } = await service
    .from('scans')
    .select('id, created_at')
    .eq('repository_id', repo.id)
    .eq('pr_number', pr_number)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentScan && Date.now() - new Date(recentScan.created_at).getTime() < 30_000) {
    return NextResponse.json({ scan_id: recentScan.id, status: 'queued', deduplicated: true })
  }

  // Create scan record
  const { data: scan, error: scanError } = await service
    .from('scans')
    .insert({
      repository_id: repo.id,
      user_id: user.id,
      pr_number,
      pr_title: `PR #${pr_number}`,
      pr_author: 'api',
      status: 'queued',
    })
    .select()
    .single()

  if (scanError || !scan) {
    return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 })
  }

  await inngest.send({
    name: 'scan/requested',
    data: {
      scanId: scan.id,
      ...(providedDiff ? { diff: providedDiff } : {}),
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lurk.dev'

  return NextResponse.json({
    scan_id: scan.id,
    status: 'queued',
    report_url: `${appUrl}/scans/${scan.id}`,
  }, { status: 202 })
}
