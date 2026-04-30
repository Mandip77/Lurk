import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAppOctokit, getInstallationOctokit } from '@/lib/github'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // Discover all installation IDs: from DB + from GitHub App API
  const installationIds = new Set<string>()

  // 1. Any installations already in our DB for this user
  const { data: existingRepos } = await service
    .from('repositories')
    .select('installation_id')
    .eq('user_id', user.id)
    .not('installation_id', 'is', null)
  existingRepos?.forEach(r => r.installation_id && installationIds.add(r.installation_id))

  // 2. Discover via GitHub App API (lists all installations for the app)
  try {
    const appOctokit = getAppOctokit()
    const { data: installations } = await appOctokit.apps.listInstallations({ per_page: 100 })
    installations?.forEach((inst: { id: number }) => installationIds.add(String(inst.id)))
  } catch (err) {
    console.error('Could not list installations from GitHub API:', err)
  }

  // 3. Env var fallback
  if (process.env.GITHUB_INSTALLATION_ID) {
    installationIds.add(process.env.GITHUB_INSTALLATION_ID)
  }

  if (installationIds.size === 0) {
    return NextResponse.json({
      count: 0,
      error: 'No GitHub App installation found. Install the GitHub App on your repositories first.',
    }, { status: 422 })
  }

  let totalSynced = 0

  for (const installationId of installationIds) {
    try {
      const octokit = await getInstallationOctokit(installationId)
      const { data: repoData } = await octokit.apps.listReposAccessibleToInstallation({ per_page: 100 })
      const repos = repoData?.repositories ?? []

      if (repos.length > 0) {
        const rows = repos.map((r: { id: number; full_name: string }) => ({
          user_id: user.id,
          installation_id: installationId,
          provider_repo_id: String(r.id),
          full_name: r.full_name,
          provider: 'github',
          is_active: false,
          webhook_secret: crypto.randomUUID(),
        }))

        const { error } = await service
          .from('repositories')
          .upsert(rows, { onConflict: 'user_id,provider,provider_repo_id', ignoreDuplicates: true })

        if (!error) totalSynced += rows.length
      }
    } catch (err) {
      console.error(`Sync failed for installation ${installationId}:`, err)
    }
  }

  return NextResponse.json({ count: totalSynced })
}
