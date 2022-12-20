import { IRequest } from 'itty-router'
import { Toucan } from 'toucan-js'
import { Env } from '..'

const sentryCapture = (
  type: string,
  {
    request,
    env,
    context
  }: {
    request: IRequest
    env: Env
    context: Pick<ExecutionContext, 'waitUntil'>
  }
): Toucan => {
  const sentry = new Toucan({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
    debug: env.ENVIRONMENT === 'development',
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

  return sentry
}

export default sentryCapture
