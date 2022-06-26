import { Env, TheRequest } from '..'

const cacheAndReturn = (
  request: TheRequest,
  _e: Env,
  context: ExecutionContext
): Response => {
  if (!request.cacheKey) {
    throw new Error('Missing cache handler')
  }
  if (!request.outgoing) {
    throw new Error('Missing translation')
  }

  const response = new Response(JSON.stringify(request.outgoing), {
    headers: {
      'content-type': 'application/json;charset=UTF-8'
    }
  })
  context.waitUntil(caches.default.put(request.cacheKey, response.clone()))
  response.headers.set('tooot-Cache', 'MISS')
  return response
}

export default cacheAndReturn
