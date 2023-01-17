import { IRequest } from 'itty-router'
import { Toucan } from 'toucan-js'
import { Env } from '..'

const handleErrors = (
  type: string,
  err: unknown,
  {
    request,
    env,
    context
  }: {
    request: IRequest
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
    context,
    // @ts-ignore
    request
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
