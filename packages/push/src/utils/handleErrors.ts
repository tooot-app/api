import { DurableObjectDevice, Env, ParamsGlobal } from '..'
import logToNR from './logToNR'
import sentryCapture from './sentryCapture'

const handleErrors = (
  type: string,
  err: unknown,
  {
    request,
    env,
    context
  }: {
    request: Request & Partial<DurableObjectDevice> & Partial<ParamsGlobal>
    env: Env
    context: Pick<ExecutionContext, 'waitUntil'>
  }
): Response => {
  const sentry = sentryCapture(type, { request, env, context })

  const message = err instanceof Error ? err.message : 'Unknown error'
  console.warn(message)

  if (message.includes('Decryption failed')) {
    sentry.setTag('status', 400)
    context.waitUntil(
      (async () => {
        console.log('Logging to sentry...')
        sentry.captureException(err)
        await logToNR(env.NEW_RELIC_KEY, {
          tooot_push_log: 'error_decryption_failed',
          workers_type: 'workers',
          expoToken: request.params?.expoToken,
          instanceUrl: request.params?.instanceUrl
        })
        await request.durableObject?.fetch(
          `${new URL(request.url).origin}/push/do/count-error`,
          {
            method: 'PUT'
          }
        )
      })()
    )
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
