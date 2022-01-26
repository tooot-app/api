import { Env } from '..'
import sentryCapture from './sentryCapture'

const handleErrors = (
  type: string,
  err: unknown,
  {
    request,
    env,
    context
  }: {
    request: Request
    env: Env
    context: Pick<ExecutionContext, 'waitUntil'>
  }
): Response => {
  const sentry = sentryCapture(type, { request, env, context })

  const message = err instanceof Error ? err.message : 'Unknown error'
  console.warn(message)

  if (message.includes('Decryption failed')) {
    sentry.setTag('status', 400)
    if (Math.random() < 0.1) {
      context.waitUntil(
        (async () => {
          console.log('Logging to sentry...')
          sentry.captureException(err)
        })()
      )
    }
    return new Response(message, { status: 400 })
  } else {
    sentry.setTag('status', 500)
    context.waitUntil(
      (async () => {
        console.log('Logging to sentry...')
        sentry.captureException(err)
      })()
    )
    return new Response(message, { status: 500 })
  }
}

export default handleErrors
