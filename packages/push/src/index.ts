import { Router } from 'itty-router'
import getDurableObject from './middlewares/getDurableObject'
import connect from './routes/connect'
import send from './routes/send'
import subscribe from './routes/subscribe'
import universal from './routes/universal'
import handleErrors from './utils/handleErrors'

const pathGlobal = '/:expoToken/:instanceUrl/:accountId'
export type ParamsGlobal = {
  params: { expoToken: string; instanceUrl: string; accountId: string }
}

// GET
export const pathConnect = '/connect/:expoToken'
export type ParamsConnect = { expoToken: string }

// POST
export const pathSubscribe = `/subscribe${pathGlobal}`
export type ParamsSubscribe = ParamsGlobal
export type BodySubscribe = {
  accountFull: string
  serverKey: string
  auth?: string
}

// DELETE
export const pathUnsubscribe = `/unsubscribe${pathGlobal}`
export type ParamsUnsubscribe = ParamsGlobal

// PUT
export const pathUpdateDecode = `/update-decode${pathGlobal}`
export type ParamsUpdateDecode = ParamsGlobal
export type BodyUpdateDecode = { auth?: string }

// POST
export const pathSend = `/send${pathGlobal}`
export type ParamsSend = ParamsGlobal
export type HeadersSend = { 'crypto-key': string; encryption: string }

export type DurableObjectDevice = { durableObject: DurableObjectStub }

export { Device } from './durableObjects/device'

export type Env =
  | {
      ENVIRONMENT: 'production'
      SENTRY_DSN: string
      EXPO_ACCESS_TOKEN_PUSH: string
      KEY_PRIVATE: string
      KEY_PUBLIC: string
      MIGRATION_KEY: string
      // Durable Objects
      TOOOT_PUSH_DEVICE: DurableObjectNamespace
    }
  | {
      ENVIRONMENT: 'development'
      SENTRY_DSN: string
      EXPO_ACCESS_TOKEN_PUSH: string
      KEY_PRIVATE: string
      KEY_PUBLIC: string
      MIGRATION_KEY: string
      // Durable Objects
      TOOOT_PUSH_DEVICE_DEV: DurableObjectNamespace
    }

const router = Router({ base: '/push' })

router.get(pathConnect, getDurableObject, connect)
router.post(pathSubscribe, getDurableObject, subscribe)
router.delete(pathUnsubscribe, getDurableObject, universal)
router.put(pathUpdateDecode, getDurableObject, universal)
router.post(pathSend, getDurableObject, send)
router.all('*', () => new Response(null, { status: 404 }))

export default {
  fetch: (request: Request, env: Env, context: ExecutionContext) =>
    router
      .handle(request, env, context)
      .catch((err: unknown) =>
        handleErrors('workers - fetch', err, { request, env, context })
      )
}
