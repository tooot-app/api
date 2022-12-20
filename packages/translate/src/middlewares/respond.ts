import { IRequest } from 'itty-router'
import { Env, WithOutgoing } from '..'

const respond = (request: WithOutgoing & IRequest, _e: Env): Response => {
  if (!request.outgoing) {
    throw new Error('Missing translation')
  }

  const response = new Response(JSON.stringify(request.outgoing), {
    headers: { 'content-type': 'application/json' }
  })
  return response
}

export default respond
