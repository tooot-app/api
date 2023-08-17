import { BodySubscribe, Env, ParamsSubscribe, RequestWithDO } from '..'
import logToNR from '../utils/logToNR'

const subscribe = async (
  request: ParamsSubscribe & RequestWithDO,
  env: Env,
  context: ExecutionContext
): Promise<Response> => {
  if (!request.durableObject)
    return new Response(JSON.stringify({ error: '[subscribe] Missing durable object' }), {
      status: 500
    })

  const body: BodySubscribe = await request.json()

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
    return new Response(JSON.stringify({ error: '[subscribe] Data error' }), { status: 400 })
  }

  return await request.durableObject.fetch(request.url, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export default subscribe
