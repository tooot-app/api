import { DurableObjectDevice, Env } from '..'

const connect = async (
  request: Request & DurableObjectDevice,
  _: Env,
  context: ExecutionContext
): Promise<Response> => {
  const cacheKey = request.url
  const cache = caches.default
  const response = await cache.match(cacheKey)

  if (!response) {
    const resDO = await request.durableObject.fetch(request.url)

    if (resDO.status !== 200) {
      return resDO
    }

    const responseToCache = new Response(null, {
      status: 200,
      headers: { 'Cache-Control': `public, max-age=${60 * 60 * 24 * 7}` }
    })

    context.waitUntil(cache.put(cacheKey, responseToCache))

    return responseToCache
  } else {
    return response
  }
}

export default connect
