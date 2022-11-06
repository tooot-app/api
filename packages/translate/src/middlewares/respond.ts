import { Env, TheRequest } from '..'

const respond = (request: TheRequest, _e: Env): Response => {
  if (!request.outgoing) {
    throw new Error('Missing translation')
  }

  const response = new Response(JSON.stringify(request.outgoing), {
    headers: { 'content-type': 'application/json' }
  })
  return response
}

export default respond
