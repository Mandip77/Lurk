import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Returns null when Upstash env vars aren't configured (dev / test environments)
function makeRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

const redis = makeRedis()

function makeLimiter(requests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  if (!redis) return null
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window) })
}

// 60 requests/minute per IP - general API endpoints
export const apiLimiter = makeLimiter(60, '1 m')

// 10 requests/minute per IP - scan-triggering endpoints
export const scanLimiter = makeLimiter(10, '1 m')

// 20 requests/minute per IP - webhook endpoints
export const webhookLimiter = makeLimiter(20, '1 m')

// 5 requests/minute per IP - key creation
export const keyCreateLimiter = makeLimiter(5, '1 m')

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ limited: boolean }> {
  if (!limiter) return { limited: false }
  const { success } = await limiter.limit(identifier)
  return { limited: !success }
}

export function getIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}
