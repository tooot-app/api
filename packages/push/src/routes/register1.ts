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
    throw new Error('Body data error')
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
      ? env.TOOOT_PUSH_ENDPOINT
      : env.TOOOT_PUSH_ENDPOINT_DEV

  const uniqueName = `${body.expoToken}/${body.instanceUrl}/${body.accountId}`
  const id = durableObject.idFromName(uniqueName)
  const obj = durableObject.get(id)
  await obj.fetch(request.url, {
    method: 'POST',
    body: JSON.stringify({ accountFull: body.accountFull, auth })
  })
  console.log('responding')
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
