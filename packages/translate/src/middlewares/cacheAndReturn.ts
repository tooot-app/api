import { Env, NewRequest } from '..'

const cacheAndReturn = (
  request: NewRequest,
  _: Env,
  context: ExecutionContext
): Response => {
  if (!request.cacheKey) {
    throw new Error('Missing cache handler')
  }
  if (!request.translation) {
    throw new Error('Missing translation')
  }

  const response = new Response(JSON.stringify(request.translation), {
    headers: {
      'content-type': 'application/json;charset=UTF-8'
    }
  })
  context.waitUntil(caches.default.put(request.cacheKey, response.clone()))
  response.headers.set('tooot-Cache', 'MISS')
  return response
}

export default cacheAndReturn
