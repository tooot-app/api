import { Context, Env } from '..'

const checkBody = async (request: Request, _e: Env, context: Context) => {
  context.incoming = await request.json()

  if (
    !context.incoming.target ||
    !Array.isArray(context.incoming.text) ||
    !context.incoming.text.filter(t => t.length > 0)
  ) {
    throw new Error('Request body error')
  }
}

export default checkBody
