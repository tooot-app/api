import { IRequest, Route, Router, RouterType } from 'itty-router'
import getDurableObject from './middlewares/getDurableObject'
import send from './routes/send'
import subscribe from './routes/subscribe'
import universal from './routes/universal'
import handleErrors from './utils/handleErrors'

export type ParamsGlobal = {
  params: { expoToken?: string; instanceUrl?: string; accountId?: string }
}

// GET /connect/:expoToken
export type ParamsConnect = { expoToken?: string }

// POST /subscribe/${pathGlobal}
export type ParamsSubscribe = ParamsGlobal
export type BodySubscribe = { accountFull?: string; serverKey?: string }

// DELETE /unsubscribe/${pathGlobal}
export type ParamsUnsubscribe = ParamsGlobal

// PUT /update-decode/${pathGlobal}
export type ParamsUpdateDecode = ParamsGlobal
export type BodyUpdateDecode = { auth?: string }

// POST /send/${pathGlobal}
// https://github.com/mastodon/mastodon/blob/main/spec/workers/web/push_notification_worker_spec.rb
export type ParamsSend = ParamsGlobal
export type HeadersSend = {
  'content-encoding': string
  'content-type': string
  'crypto-key': string
  encryption: string
  ttl: string
  urgency: string
  authorization: string
}

export { Device } from './durableObjects/device'

export type Env =
  | {
      ENVIRONMENT: 'release'
      SENTRY_DSN: string
      NEW_RELIC_KEY: string
      EXPO_ACCESS_TOKEN_PUSH: string
      KEY_PRIVATE: string
      KEY_PUBLIC: string
      // Durable Objects
      TOOOT_PUSH_DEVICE: DurableObjectNamespace
    }
  | {
      ENVIRONMENT: 'development' | 'candidate'
      SENTRY_DSN: string
      NEW_RELIC_KEY: string
      EXPO_ACCESS_TOKEN_PUSH: string
      KEY_PRIVATE: string
      KEY_PUBLIC: string
      // Durable Objects
      TOOOT_PUSH_DEVICE_DEV: DurableObjectNamespace
    }

interface CustomRouter extends RouterType {
  get: Route
  post: Route
  delete: Route
  put: Route
  all: Route
}
const router = <CustomRouter>Router({ base: '/push' })
const pathGlobal = '/:expoToken/:instanceUrl/:accountId'

export type WithDurableObject = { durableObject?: DurableObjectStub }

router.get('/connect/:expoToken', getDurableObject, universal)
router.post(`/subscribe${pathGlobal}`, getDurableObject, subscribe)
router.delete(`/unsubscribe${pathGlobal}`, getDurableObject, universal)
router.put(`/update-decode${pathGlobal}`, getDurableObject, universal)
router.post(`/send${pathGlobal}/:random?`, getDurableObject, send)

router.get('/admin/expoToken/:expoToken', getDurableObject, universal)

router.all('*', (): Response => new Response(null, { status: 404 }))

export default {
  fetch: (request: IRequest, env: Env, context: ExecutionContext) =>
    router
      .handle(request, env, context)
      .catch((err: unknown) => handleErrors('workers - fetch', err, { request, env, context }))
}
