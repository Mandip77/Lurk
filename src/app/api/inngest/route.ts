import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { scanPullRequest } from '@/inngest/functions/scan-pull-request'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scanPullRequest],
})
