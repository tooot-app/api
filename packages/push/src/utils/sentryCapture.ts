import Toucan from 'toucan-js'
import { Env } from '..'

const sentryCapture = (
  type: string,
  {
    request,
    env,
    context
  }: {
    request: Request
    env: Env
    context: Pick<ExecutionContext, 'waitUntil'>
  }
): Toucan => {
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
      root: '/'
    }
  })

  sentry.setTag('type', type)

  const colo = request.cf && request.cf.colo ? request.cf.colo : 'UNKNOWN'
  const ipAddress =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')
  const userAgent = request.headers.get('user-agent') || ''
  sentry.setUser({ ip: ipAddress, userAgent: userAgent, colo: colo })

  return sentry
}

export default sentryCapture
