import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAppOctokit } from '@/lib/github'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const appOctokit = getAppOctokit()

    // List all installations for this app
    const { data: installationsData } = await appOctokit.apps.listInstallations({ per_page: 100 })
    const installations = installationsData ?? []

    if (installations.length === 0) {
      return NextResponse.json({ count: 0, message: 'No installations found. Install the GitHub App first.' })
    }

    const service = createServiceClient()
    let totalSynced = 0

    for (const installation of installations) {
      // Get an octokit for this specific installation
      const { createAppAuth } = await import('@octokit/auth-app')
      const { Octokit } = await import('@octokit/rest')

      const auth = createAppAuth({
        appId: process.env.GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      })
      const { token } = await auth({ type: 'installation', installationId: installation.id })
      const octokit = new Octokit({ auth: token })

      const { data: repoData } = await octokit.apps.listReposAccessibleToInstallation({ per_page: 100 })
      const repos = repoData?.repositories ?? []

      if (repos.length > 0) {
        const rows = repos.map((r: { id: number; full_name: string }) => ({
          user_id: user.id,
          installation_id: String(installation.id),
          provider_repo_id: String(r.id),
          full_name: r.full_name,
          provider: 'github',
          is_active: true,
          webhook_secret: crypto.randomUUID(),
        }))

        const { error } = await service
          .from('repositories')
          .upsert(rows, { onConflict: 'user_id,provider,provider_repo_id' })

        if (!error) totalSynced += rows.length
      }
    }

    return NextResponse.json({ count: totalSynced })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed. Make sure the GitHub App is installed on your repositories.' }, { status: 500 })
  }
}
