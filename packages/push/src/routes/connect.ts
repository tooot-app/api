import { Env } from '..'

const connect = async ({
  request,
  env,
  context
}: {
  request: Request
  env: Env
  context: any
}) => {
  let body:
    | {
        expoToken: string
      }
    | undefined = undefined
  let device: string | undefined = undefined
  let type: 'new' | 'legacy' | undefined = undefined
  try {
    const path = new URL(request.url).pathname.slice(1).split('/')
    device = path[2]
    type = 'new'
  } catch {}

  if (!device) {
    try {
      body = await request.json<{
        expoToken: string
        instanceUrl: string
        accountId: string
        keys?: { public: string; private: string; auth: string }
      }>()
      if (!body.expoToken) {
        return new Response('[connect] Missing Expo token', { status: 403 })
      }
      device = body.expoToken
      type = 'legacy'
    } catch {}
  }

  if (!device) {
    return new Response('[connect] Data error', { status: 400 })
  }

  const cacheKey =
    type === 'new'
      ? request.url
      : `https://api.tooot.app/push/connect/${device}`
  const cache = caches.default
  const response = await cache.match(cacheKey)

  if (!response) {
    const durableObject =
      env.ENVIRONMENT === 'production'
        ? env.TOOOT_PUSH_DEVICE
        : env.TOOOT_PUSH_DEVICE_DEV

    const id = durableObject.idFromName(device)
    const obj = durableObject.get(id)
    const resDO = await obj.fetch(request.url)

    if (resDO.status !== 200) {
      return new Response('Connect signal failed', {
        status: resDO.status
      })
    }

    const responseToCache = new Response(null, {
      status: 200,
      headers: { 'Cache-Control': `public, max-age=${60 * 60 * 24 * 7}` }
    })

    context.waitUntil(cache.put(cacheKey, responseToCache))
  }
}

export default connect
