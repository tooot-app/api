import Toucan from 'toucan-js'
import checkCache from './checkCache'
import sanitizeBody from './sanitizeBody'
// import useDeepL from './useDeepL'
import useIBM from './useIBM'
import handleErrors from './utils/handleErrors'

// -> POST /
// {
//   source?: string
//   target: string
//   text: string[]
// }
// <- cached
// {
//   provider: string
//   sourceLanguage: string
//   text: string[]
// }

export type Env = {
  ENVIRONMENT: 'production' | 'development'
  IBM_KEY: string
  DEEPL_KEY: string
  SENTRY_DSN: string
}

export type BodyContent = {
  source?: string
  target: string
  text: string[]
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext) {
    const sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      environment: env.ENVIRONMENT,
      debug: env.ENVIRONMENT === 'development',
      context,
      request,
      allowedHeaders: [
        'user-agent',
        'cf-challenge',
        'accept-encoding',
        'accept-language',
        'cf-ray',
        'content-length',
        'content-type',
        'x-real-ip',
        'host'
      ],
      allowedSearchParams: /(.*)/,
      rewriteFrames: {
        root: '/'
      }
    })
    const colo = request.cf && request.cf.colo ? request.cf.colo : 'UNKNOWN'
    sentry.setTag('colo', colo)
    const ipAddress =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')
    const userAgent = request.headers.get('user-agent') || ''
    sentry.setUser({ ip: ipAddress, userAgent: userAgent, colo: colo })
    sentry.setRequestBody(request.clone().json())

    return await handleErrors(sentry, async () => {
      const body: BodyContent = await request.json()

      if (
        !body.target ||
        !Array.isArray(body.text) ||
        !body.text.filter(t => t.length > 0)
      ) {
        throw new Error('Request body error')
      }

      const cache = caches.default
      const hasCached = await checkCache({ cache, request, body })
      if (typeof hasCached !== 'string') {
        return hasCached
      }

      const sanitizedBody = sanitizeBody(body)

      const translation = await useIBM({ env, ...sanitizedBody })
      // if (!translation) {
      //   translation = await useDeepL({ env, ...body})
      // }

      if (!translation) {
        throw new Error('Translation failed')
      } else {
        const response = new Response(JSON.stringify(translation), {
          headers: {
            'content-type': 'application/json;charset=UTF-8',
            'tooot-Cache': 'HIT'
          }
        })
        context.waitUntil(cache.put(hasCached, response.clone()))
        response.headers.set('tooot-Cache', 'MISS')
        return response
      }
    })
  }
}
