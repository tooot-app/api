import { BodySubscribe, DurableObjectDevice, ParamsSubscribe } from '..'

const subscribe = async (
  request: Request & DurableObjectDevice & ParamsSubscribe
): Promise<Response> => {
  const body = await request.json<BodySubscribe>()

  if (!body.accountFull || !body.serverKey) {
    return new Response('[subscribe] Data error', { status: 400 })
  }

  return await request.durableObject.fetch(request.url, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export default subscribe
