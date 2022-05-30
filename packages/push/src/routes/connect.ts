import { DurableObjectDevice, Env } from '..'

const connect = async (
  request: Request & DurableObjectDevice,
  _: Env,
  context: ExecutionContext
): Promise<Response> => {
  const resDO = await request.durableObject.fetch(request.url)

  if (resDO.status !== 200) {
    return resDO
  }

  return new Response()
}

export default connect
