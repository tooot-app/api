import { Env } from '..'

const register2 = async ({ request, env }: { request: Request; env: Env }) => {
  const body = await request.json<{
    expoToken: string
    instanceUrl: string
    accountId: string
    serverKey: string
    removeKeys: boolean
  }>()
  if (
    !body.expoToken ||
    !body.instanceUrl ||
    !body.accountId ||
    !body.serverKey ||
    typeof body.removeKeys !== 'boolean'
  ) {
    return new Response('[register2] Data error', { status: 400 })
  }

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_DEVICE
      : env.TOOOT_PUSH_DEVICE_DEV

  const id = durableObject.idFromName(body.expoToken)
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

export default register2
