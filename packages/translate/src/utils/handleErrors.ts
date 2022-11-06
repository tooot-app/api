import Toucan from 'toucan-js'
import { Env, TheRequest } from '..'

const handleErrors = (
  type: string,
  err: unknown,
  {
    request,
    env,
    context
  }: {
    request: TheRequest
    env: Env
    context: ExecutionContext
  }
): Response => {
  if (env.ENVIRONMENT === 'development') {
    console.error(err)
    return new Response(null, { status: 500 })
  }

  const sentry = new Toucan({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
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
      iteratee: frame => ({ ...frame, filename: frame.filename?.substring(1) })
    }
  })

  sentry.setTag('type', type)

  const colo = request.cf && request.cf.colo ? request.cf.colo : 'UNKNOWN'
  const ipAddress =
    request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')
  const userAgent = request.headers.get('user-agent') || ''
  sentry.setUser({ ip: ipAddress, userAgent: userAgent, colo: colo })
  sentry.setExtras({ body: request.incoming })

  const message =
    err instanceof Error ? { error: err.message.toString() } : { error: 'Unknown error' }
  console.warn(message)

  sentry.setTag('status', 500)
  context.waitUntil(
    (async () => {
      console.log('Logging to sentry...')
      sentry.captureException(err)
    })()
  )
  return new Response(JSON.stringify(message), {
    status: 500,
    headers: { 'content-type': 'application/json' }
  })
}

export default handleErrors
