import { IRequest } from 'itty-router'
import { Env } from '..'

const checkBody = async (request: IRequest, _e: Env) => {
  request.incoming = await request.json()

  if (
    !request.incoming.target ||
    !Array.isArray(request.incoming.text) ||
    !request.incoming.text.filter((t: any) => t.length > 0)
  ) {
    throw new Error('Request body error')
  }
}

export default checkBody
