import { Env } from '..'
import parsePath from '../utils/parsePath'

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
        instanceUrl: string
        accountId: string
        keys?: { public: string; private: string; auth: string }
      }
    | undefined = undefined
  let uniqueName: string | undefined = undefined
  let type: 'new' | 'legacy' | undefined = undefined
  try {
    const thePath = parsePath(request.url)
    uniqueName = thePath.uniqueName
    type = 'new'
  } catch {}

  if (!uniqueName) {
    try {
      body = await request.json<{
        expoToken: string
        instanceUrl: string
        accountId: string
        keys?: { public: string; private: string; auth: string }
      }>()
      if (!body.expoToken || !body.instanceUrl || !body.accountId) {
        throw new Error('Body data error')
      }
      uniqueName = `${body.expoToken}/${body.instanceUrl}/${body.accountId}`
      type = 'legacy'
    } catch {}
  }

  if (!uniqueName) {
    throw new Error('Data error')
  }

  const cacheKey =
    type === 'new'
      ? request.url
      : `https://api.tooot.app/push/connect/${uniqueName}`
  const cache = caches.default
  const response = await cache.match(cacheKey)

  if (!response) {
    const durableObject =
      env.ENVIRONMENT === 'production'
        ? env.TOOOT_PUSH_ENDPOINT
        : env.TOOOT_PUSH_ENDPOINT_DEV

    const id = durableObject.idFromName(uniqueName)
    const obj = durableObject.get(id)
    await obj.fetch(request.clone())

    const responseToCache = new Response(null, {
      status: 200,
      headers: { 'Cache-Control': `public, max-age=${60 * 60 * 24 * 7}` }
    })

    context.waitUntil(cache.put(cacheKey, responseToCache))
  }
}

export default connect
