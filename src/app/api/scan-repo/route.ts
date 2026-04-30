import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { inngest } from '@/inngest/client'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { repositoryId } = await req.json()
  if (!repositoryId) return NextResponse.json({ error: 'repositoryId required' }, { status: 400 })

  const service = createServiceClient()

  // Verify repo belongs to user and is active
  const { data: repo } = await service
    .from('repositories')
    .select('*')
    .eq('id', repositoryId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!repo) return NextResponse.json({ error: 'Repository not found or not active' }, { status: 404 })

  // Create a scan record (type: repo_scan, no PR number)
  const { data: scan, error } = await service
    .from('scans')
    .insert({
      repository_id: repo.id,
      user_id: user.id,
      pr_number: null,
      pr_title: `Full codebase scan - ${repo.full_name}`,
      pr_author: user.email ?? 'manual',
      pr_url: `https://github.com/${repo.full_name}`,
      status: 'queued',
    })
    .select()
    .single()

  if (error || !scan) return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 })

  await inngest.send({ name: 'scan/repo-requested', data: { scanId: scan.id, repoFullName: repo.full_name, installationId: repo.installation_id } })

  return NextResponse.json({ scanId: scan.id })
}
