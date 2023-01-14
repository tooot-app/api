import { IRequest, Route, Router, RouterType } from 'itty-router'
import checkBody from './middlewares/checkBody'
import prepareNR from './middlewares/prepareNR'
import respond from './middlewares/respond'
import sanitizeBody from './middlewares/sanitizeBody'
import useGoogle from './middlewares/useGoogle'
import useIBM from './middlewares/useIBM'
import handleErrors from './utils/handleErrors'

// POST /

export type WithIncoming = {
  incoming?: {
    source?: string
    target: string
    text: string[]
    textLength: number
  }
}
export type WithOutgoing = {
  outgoing?: {
    provider: string
    sourceLanguage?: string
    text: string[]
  }
}
export type WithLog = {
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

interface CustomRouter extends RouterType {
  post: Route
  all: Route
}
const router = <CustomRouter>Router({ base: '/translate' })

router.post('/', checkBody, prepareNR, sanitizeBody, useGoogle, useIBM, respond)
router.all('*', () => new Response(null, { status: 404 }))

export default {
  fetch: (request: IRequest, env: Env, context: ExecutionContext) =>
    router
      .handle(request, env, context)
      .catch((err: unknown) => handleErrors('workers - fetch', err, { request, env, context }))
}
