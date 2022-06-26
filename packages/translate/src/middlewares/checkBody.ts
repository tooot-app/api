import { Env, TheRequest } from '..'

const checkBody = async (request: TheRequest, _e: Env) => {
  request.incoming = await request.json()

  if (
    !request.incoming.target ||
    !Array.isArray(request.incoming.text) ||
    !request.incoming.text.filter(t => t.length > 0)
  ) {
    throw new Error('Request body error')
  }
}

export default checkBody
