import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'lurk',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
