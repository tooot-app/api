import { Router } from 'itty-router'
import checkBody from './middlewares/checkBody'
import prepareNR from './middlewares/prepareNR'
import respond from './middlewares/respond'
import sanitizeBody from './middlewares/sanitizeBody'
import useGoogle from './middlewares/useGoogle'
import useIBM from './middlewares/useIBM'
import handleErrors from './utils/handleErrors'

// POST /

export type TheRequest = Request & {
  incoming: {
    source?: string
    target: string
    textRaw: string[]
    text: string[]
    textLength: number
  }
  outgoing: {
    provider: string
    sourceLanguage?: string
    text: string[]
  }
  log: ({ message, succeed }: { message: Object; succeed?: boolean }) => void
}

export type Env = {
  ENVIRONMENT: 'development' | 'candidate' | 'release'
  IBM_KEY: string
  SENTRY_DSN: string
  NEW_RELIC_KEY: string
  // KV
  LANGUAGES: KVNamespace
}

const router = Router({ base: '/translate' })

router.post(
  '/',
  checkBody,
  prepareNR,
  sanitizeBody,
  useGoogle,
  useIBM,
  respond
)
router.all('*', () => new Response(null, { status: 404 }))

export default {
  fetch: (request: TheRequest, env: Env, context: ExecutionContext) =>
    router
      .handle(request, env, context)
      .catch((err: unknown) =>
        handleErrors('workers - fetch', err, { request, env, context })
      )
}
