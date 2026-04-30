import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { scanPullRequest } from '@/inngest/functions/scan-pull-request'
import { weeklyDigest } from '@/inngest/functions/weekly-digest'
import { scanRepository } from '@/inngest/functions/scan-repository'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scanPullRequest, weeklyDigest, scanRepository],
})
