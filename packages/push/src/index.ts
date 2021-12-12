import connect from './routes/connect'
import migration from './routes/migration'
import register1 from './routes/register1'
import register2 from './routes/register2'
import send from './routes/send'
import universal from './routes/universal'
import updateDecode from './routes/updateDecode'
import handleErrors from './utils/handleErrors'

//// CLIENT REQUEST

// -> GET /connect/:expoToken/:instanceUrl/:accountId
// <- cached
// 200

// -> POST /subscribe/:expoToken/:instanceUrl/:accountId
// {
//   accountFull: string
//   serverKey: string
//   auth: string | null
// }
// <-
// 200

// -> DELETE /unsubscribe/:expoToken/:instanceUrl/:accountId
// <-
// 200

// -> PUT /update-decode/:expoToken/:instanceUrl/:accountId
// {
//   auth: string | null
// }
// <-
// 200

// -> POST /send/:expoToken/:instanceUrl/:accountId
// headers {
//   crypto-key: string
//   encryption: string
// }
// <- cached
// 200

export { Endpoint } from './durableObjects/endpoint'

export type Env =
  | {
      ENVIRONMENT: 'production'
      EXPO_ACCESS_TOKEN_PUSH: string
      KEY_PRIVATE: string
      KEY_PUBLIC: string
      MIGRATION_KEY: string
      // Durable Objects
      TOOOT_PUSH_ENDPOINT: DurableObjectNamespace
      // KV
      TOOOT_PUSH_LEGACY: KVNamespace
    }
  | {
      ENVIRONMENT: 'development'
      EXPO_ACCESS_TOKEN_PUSH: string
      KEY_PRIVATE: string
      KEY_PUBLIC: string
      MIGRATION_KEY: string
      // Durable Objects
      TOOOT_PUSH_ENDPOINT_DEV: DurableObjectNamespace
      // KV
      TOOOT_PUSH_LEGACY_DEV: KVNamespace
    }

export default {
  async fetch(request: Request, env: Env, context: any) {
    const path = new URL(request.url).pathname.slice(1).split('/')

    switch (path[1]) {
      case 'connect':
        if (request.method !== 'GET') {
          return new Response(null, { status: 405 })
        }
        return await handleErrors(async () => {
          return await connect({ request, env, context })
        })
      case 'subscribe':
        if (request.method !== 'POST') {
          return new Response(null, { status: 405 })
        }
        return await handleErrors(async () => {
          return await universal({ request, env })
        })
      case 'unsubscribe':
        if (request.method !== 'DELETE') {
          return new Response(null, { status: 405 })
        }
        return await handleErrors(async () => {
          return await universal({ request, env })
        })
      case 'update-decode':
        if (request.method !== 'PUT' && request.method !== 'POST') {
          return new Response(null, { status: 405 })
        }
        return await handleErrors(async () => {
          return await updateDecode({ request, env })
        })
      case 'send':
        if (request.method !== 'POST') {
          return new Response(null, { status: 405 })
        }
        return await handleErrors(async () => {
          return await send({ request, env, context })
        })
      // Migration
      case 'migration':
        if (request.method !== 'GET') {
          return new Response(null, { status: 405 })
        }
        if (path[2] !== env.MIGRATION_KEY) {
          return new Response(null, { status: 403 })
        }
        return await handleErrors(async () => {
          return await migration({ request, env })
        })
      // Legacy
      case 'register1':
        return await handleErrors(async () => {
          return await register1({ request, env })
        })
        break
      case 'register2':
        return await handleErrors(async () => {
          return await register2({ request, env })
        })
        break
      default:
        return new Response(null, { status: 404 })
    }
  }
}
