import Toucan from 'toucan-js'
import connect from './routes/connect'
import register1 from './routes/register1'
import register2 from './routes/register2'
import send from './routes/send'
import subscribe from './routes/subscribe'
import universal from './routes/universal'
import unregister from './routes/unregister'
import updateDecode from './routes/updateDecode'
import handleErrors from './utils/handleErrors'

//// CLIENT REQUEST

// -> GET /connect/:expoToken
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

export default {
  async fetch(request: Request, env: Env, context: any) {
    if (
      !env.SENTRY_DSN ||
      !env.KEY_PUBLIC ||
      !env.KEY_PRIVATE ||
      !env.EXPO_ACCESS_TOKEN_PUSH
    ) {
      return new Response('Missing environment variables', { status: 500 })
    }

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
      },
      // @ts-ignore
      beforeSend: (event: Error) => {
        if (
          event instanceof SyntaxError &&
          event.message.includes('JSON at position')
        ) {
          const random = Math.floor(Math.random() * 100)
          if (random < 10) {
            return event
          } else {
            return null
          }
        } else {
          return event
        }
      }
    })
    const colo = request.cf && request.cf.colo ? request.cf.colo : 'UNKNOWN'
    sentry.setTag('colo', colo)
    const ipAddress =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')
    const userAgent = request.headers.get('user-agent') || ''
    sentry.setUser({ ip: ipAddress, userAgent: userAgent, colo: colo })
    // sentry.setRequestBody(request.clone().json())

    return await handleErrors(sentry, async () => {
      const path = new URL(request.url).pathname.slice(1).split('/')

      switch (path[1]) {
        case 'connect':
          if (request.method !== 'GET' && request.method !== 'POST') {
            return new Response(null, { status: 405 })
          }
          return await connect({ request, env, context })

        case 'subscribe':
          if (request.method !== 'POST') {
            return new Response(null, { status: 405 })
          }
          return await subscribe({ request, env })

        case 'unsubscribe':
          if (request.method !== 'DELETE') {
            return new Response(null, { status: 405 })
          }
          return await universal({ request, env })

        case 'update-decode':
          if (request.method !== 'PUT' && request.method !== 'POST') {
            return new Response(null, { status: 405 })
          }
          return await updateDecode({ request, env })

        case 'send':
          if (request.method !== 'POST') {
            return new Response(null, { status: 405 })
          }
          return await send({ request, env, context })

        // Legacy
        case 'register1':
          return await register1({ request, env })

        case 'register2':
          return await register2({ request, env })

        case 'unregister':
          return await unregister({ request, env })

        default:
          return new Response(null, { status: 404 })
      }
    })
  }
}
