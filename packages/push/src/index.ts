import { Router } from 'itty-router'
import getDurableObject from './middlewares/getDurableObject'
import connect from './routes/connect'
import send from './routes/send'
import subscribe from './routes/subscribe'
import universal from './routes/universal'
import handleErrors from './utils/handleErrors'

export type ParamsGlobal = {
  params: { expoToken: string; instanceUrl: string; accountId: string }
}

// GET /connect/:expoToken
export type ParamsConnect = { expoToken: string }

// POST /subscribe/${pathGlobal}
export type ParamsSubscribe = ParamsGlobal
export type BodySubscribe = {
  accountFull: string
  serverKey: string
  auth?: string
}

// DELETE /unsubscribe/${pathGlobal}
export type ParamsUnsubscribe = ParamsGlobal

// PUT /update-decode/${pathGlobal}
export type ParamsUpdateDecode = ParamsGlobal
export type BodyUpdateDecode = { auth?: string }

// POST /send/${pathGlobal}
export type ParamsSend = ParamsGlobal
export type HeadersSend = { 'crypto-key': string; encryption: string }

export type DurableObjectDevice = { durableObject: DurableObjectStub }

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

const router = Router({ base: '/push' })
const pathGlobal = '/:expoToken/:instanceUrl/:accountId'

router.get('/connect/:expoToken', getDurableObject, connect)
router.post(`/subscribe${pathGlobal}`, getDurableObject, subscribe)
router.delete(`/unsubscribe${pathGlobal}`, getDurableObject, universal)
router.put(`/update-decode${pathGlobal}`, getDurableObject, universal)
router.post(`/send${pathGlobal}`, getDurableObject, send)

router.get('/admin/expoToken/:expoToken', getDurableObject, universal)

router.all('*', (): Response => new Response(null, { status: 404 }))

export default {
  fetch: (request: Request, env: Env, context: ExecutionContext) =>
    router
      .handle(request, env, context)
      .catch((err: unknown) =>
        handleErrors('workers - fetch', err, { request, env, context })
      )
}
