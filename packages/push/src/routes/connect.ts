import { IRequest } from 'itty-router'
import { ParamsConnect, WithDurableObject } from '..'

const connect = async (
  request: ParamsConnect & WithDurableObject & IRequest
): Promise<Response> => {
  if (!request.durableObject)
    return new Response(JSON.stringify({ error: '[connect] Missing durable object' }), {
      status: 500
    })

  const resDO = await request.durableObject.fetch(request.url)

  if (resDO.status !== 200) {
    return resDO
  }

  return new Response()
}

export default connect
