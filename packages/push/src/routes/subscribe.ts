import { BodySubscribe, DurableObjectDevice, Env, ParamsSubscribe } from '..'
import logToNR from '../utils/logToNR'

const subscribe = async (
  request: Request & DurableObjectDevice & ParamsSubscribe,
  env: Env,
  context: ExecutionContext
): Promise<Response> => {
  const body = await request.json<BodySubscribe>()

  if (!body.accountFull || !body.serverKey) {
    context.waitUntil(
      logToNR(env.NEW_RELIC_KEY, {
        tooot_push_log: 'error_subscribe_body',
        workers_type: 'workers',
        expoToken: request.params?.expoToken,
        instanceUrl: request.params?.instanceUrl,
        body
      })
    )
    return new Response('[subscribe] Data error', { status: 400 })
  }

  return await request.durableObject.fetch(request.url, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export default subscribe
