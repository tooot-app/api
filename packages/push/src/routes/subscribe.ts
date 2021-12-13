import { Env } from '..'
import parsePath from '../utils/parsePath'

const subscribe = async ({ request, env }: { request: Request; env: Env }) => {
  const body = await request.json<{
    accountFull: string
    serverKey: string
    auth: string | void
  }>()

  if (!body.accountFull || !body.serverKey) {
    return new Response('[subscribe] Data error', { status: 400 })
  }

  const { device } = parsePath(request.url)

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_DEVICE
      : env.TOOOT_PUSH_DEVICE_DEV

  const id = durableObject.idFromName(device)
  const obj = durableObject.get(id)
  const resDO = await obj.fetch(request.url, {
    method: 'POST',
    body: JSON.stringify(body)
  })
  if (resDO.status !== 200) {
    return new Response('Connect signal failed', {
      status: resDO.status
    })
  }
}

export default subscribe
