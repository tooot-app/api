import Buffer from 'buffer/'
import { Env } from '..'

const register1 = async ({ request, env }: { request: Request; env: Env }) => {
  const body = await request.json<{
    expoToken: string
    instanceUrl: string
    accountId: string
    accountFull: string
  }>()
  if (
    !body.expoToken ||
    !body.instanceUrl ||
    !body.accountId ||
    !body.accountFull
  ) {
    return new Response('[register1] Data error', { status: 400 })
  }

  const endpoint = new URL(
    `send/${body.expoToken}/${body.instanceUrl}/${body.accountId}`,
    env.ENVIRONMENT === 'production'
      ? 'https://api.tooot.app/push/'
      : 'https://testapi.tooot.app/push/'
  )
  const auth = Buffer.Buffer.from(
    crypto.getRandomValues(new Uint8Array(16))
  ).toString('base64')

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_DEVICE
      : env.TOOOT_PUSH_DEVICE_DEV

  const id = durableObject.idFromName(body.expoToken)
  const obj = durableObject.get(id)
  const resDO = await obj.fetch(request.url, {
    method: 'POST',
    body: JSON.stringify({ ...body, auth })
  })
  if (resDO.status !== 200) {
    return new Response('Connect signal failed', {
      status: resDO.status
    })
  }

  return new Response(
    JSON.stringify({
      endpoint,
      keys: {
        public: env.KEY_PUBLIC,
        private: 'legacy_not_used',
        auth
      }
    }),
    { status: 200 }
  )
}

export default register1
