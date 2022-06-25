import { Context, Env } from '..'

const cacheAndReturn = (_r: Request, _e: Env, context: Context): Response => {
  if (!context.cacheKey) {
    throw new Error('Missing cache handler')
  }
  if (!context.outgoing) {
    throw new Error('Missing translation')
  }

  const response = new Response(JSON.stringify(context.outgoing), {
    headers: {
      'content-type': 'application/json;charset=UTF-8'
    }
  })
  context.waitUntil(caches.default.put(context.cacheKey, response.clone()))
  response.headers.set('tooot-Cache', 'MISS')
  return response
}

export default cacheAndReturn
