import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'sentinel-ai',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
