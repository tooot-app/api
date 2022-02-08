import { Router } from 'itty-router'
import cacheAndReturn from './middlewares/cacheAndReturn'
import checkBody from './middlewares/checkBody'
import checkCache from './middlewares/checkCache'
import sanitizeBody from './middlewares/sanitizeBody'
import useDeepL from './middlewares/useDeepL'
import useIBM from './middlewares/useIBM'
import handleErrors from './utils/handleErrors'

// POST /
export type BodyRequest = {
  source?: string
  target: string
  text: string[]
}
export type BodyResponse = {
  provider: string
  sourceLanguage: string
  text: string[]
}

export type NewRequest = Request & {
  bodyJson: BodyRequest
  cacheKey: string
  translation: BodyResponse
}

export type Env = {
  ENVIRONMENT: 'development' | 'candidate' | 'release'
  IBM_KEY: string
  DEEPL_KEY: string
  SENTRY_DSN: string
  // KV
  LANGUAGES: KVNamespace
}

const router = Router({ base: '/translate' })

router.post(
  '/',
  checkBody,
  checkCache,
  sanitizeBody,
  useIBM,
  // useDeepL,
  cacheAndReturn
)
router.all('*', () => new Response(null, { status: 404 }))

export default {
  fetch: (request: NewRequest, env: Env, context: ExecutionContext) =>
    router
      .handle(request, env, context)
      .catch((err: unknown) =>
        handleErrors('workers - fetch', err, { request, env, context })
      )
}
