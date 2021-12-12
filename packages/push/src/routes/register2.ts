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
    throw new Error('Body data error')
  }

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_ENDPOINT
      : env.TOOOT_PUSH_ENDPOINT_DEV

  const uniqueName = `${body.expoToken}/${body.instanceUrl}/${body.accountId}`
  const id = durableObject.idFromName(uniqueName)
  const obj = durableObject.get(id)
  await obj.fetch(request.url, {
    method: 'POST',
    body: JSON.stringify({
      serverKey: body.serverKey,
      removeKeys: body.removeKeys
    })
  })
}

export default register2
