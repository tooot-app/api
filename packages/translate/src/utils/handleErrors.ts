import Toucan from 'toucan-js'
import { Env, NewRequest } from '..'

const handleErrors = (
  type: string,
  err: unknown,
  {
    request,
    env,
    context
  }: {
    request: NewRequest
    env: Env
    context: Pick<ExecutionContext, 'waitUntil'>
  }
): Response => {
  const sentry = new Toucan({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
    debug: env.ENVIRONMENT === 'development',
    // @ts-ignore
    release: process.env.RELEASE,
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
      root: '/dist/'
    }
  })

  sentry.setTag('type', type)

  const colo = request.cf && request.cf.colo ? request.cf.colo : 'UNKNOWN'
  const ipAddress =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')
  const userAgent = request.headers.get('user-agent') || ''
  sentry.setUser({ ip: ipAddress, userAgent: userAgent, colo: colo })
  sentry.setExtras({ body: request.bodyJson })

  const message = err instanceof Error ? err.message : 'Unknown error'
  console.warn(message)

  sentry.setTag('status', 500)
  context.waitUntil(
    (async () => {
      console.log('Logging to sentry...')
      sentry.captureException(err)
    })()
  )
  return new Response(message, { status: 500 })
}

export default handleErrors
