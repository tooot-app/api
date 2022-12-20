import { IRequest } from 'itty-router'
import { WithDurableObject } from '..'

const universal = async (request: WithDurableObject & IRequest): Promise<Response> => {
  if (!request.durableObject)
    return new Response(JSON.stringify({ error: '[universal] Missing durable object' }), {
      status: 500
    })

  return await request.durableObject.fetch(request.clone())
}

export default universal
