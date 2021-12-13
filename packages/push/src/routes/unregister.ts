import { Env } from '..'

const unregister = async ({ request, env }: { request: Request; env: Env }) => {
  const body = await request.json<{
    expoToken: string
    instanceUrl: string
    accountId: string
  }>()
  if (!body.expoToken || !body.instanceUrl || !body.accountId) {
    return new Response('[unregister] Data error', { status: 400 })
  }

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_DEVICE
      : env.TOOOT_PUSH_DEVICE_DEV

  const id = durableObject.idFromName(body.expoToken)
  const obj = durableObject.get(id)
  await obj.fetch(request.url, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export default unregister
