import { Env, TheRequest } from '..'

const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  return [...new Uint8Array(hashBuffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const checkCache = async (
  request: TheRequest,
  _e: Env
): Promise<Response | void> => {
  const hash = await sha256(
    JSON.stringify({
      source: request.incoming.source,
      target: request.incoming.target,
      text: request.incoming.text
    })
  )

  const cacheUrl = new URL(request.url)
  cacheUrl.pathname = '/cache/translate/' + hash

  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' })

  const cache = caches.default
  const cacheHit = await cache.match(cacheKey)

  if (cacheHit) {
    request.log({ message: { tooot_translate_provider: 'cache' } })

    const cacheHitHeaders = new Headers(cacheHit.headers)
    cacheHitHeaders.set('tooot-Cache', 'HIT')
    return new Response(cacheHit.body, {
      headers: cacheHitHeaders
    })
  } else {
    console.log('cache not hit')
    request.cacheKey = cacheKey
  }
}

export default checkCache
