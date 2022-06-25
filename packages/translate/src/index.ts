import { Router } from 'itty-router'
import cacheAndReturn from './middlewares/cacheAndReturn'
import checkBody from './middlewares/checkBody'
import checkCache from './middlewares/checkCache'
import prepareNR from './middlewares/prepareNR'
import sanitizeBody from './middlewares/sanitizeBody'
import useDeepL from './middlewares/useDeepL'
import useGoogle from './middlewares/useGoogle'
import useIBM from './middlewares/useIBM'
import handleErrors from './utils/handleErrors'

// POST /

export type Env = {
  ENVIRONMENT: 'development' | 'candidate' | 'release'
  IBM_KEY: string
  DEEPL_KEY: string
  SENTRY_DSN: string
  NEW_RELIC_KEY: string
  // KV
  LANGUAGES: KVNamespace
}

export type Context = ExecutionContext & {
  incoming: {
    source?: string
    target: string
    textRaw: string[]
    text: string[]
    textLength: number
  }
  cacheKey: string
  outgoing: {
    provider: string
    sourceLanguage?: string
    text: string[]
  }
  log: ({ message, succeed }: { message: Object; succeed?: boolean }) => void
}

const router = Router({ base: '/translate' })

router.post(
  '/',
  checkBody,
  checkCache,
  sanitizeBody,
  prepareNR,
  useGoogle,
  useIBM,
  // useDeepL,
  cacheAndReturn
)
router.all('*', () => new Response(null, { status: 404 }))

export default {
  fetch: (request: Request, env: Env, context: Context) =>
    router
      .handle(request, env, context)
      .catch((err: unknown) =>
        handleErrors('workers - fetch', err, { request, env, context })
      )
}
