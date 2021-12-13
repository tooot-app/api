import { Env } from '..'
import parsePath from '../utils/parsePath'

const updateDecode = async ({
  request,
  env
}: {
  request: Request
  env: Env
}) => {
  let body:
    | {
        expoToken: string
        instanceUrl: string
        accountId: string
        keys?: { public: string; private: string; auth: string }
      }
    | undefined = undefined
  let device: string | undefined = undefined
  let type: 'new' | 'legacy' | undefined = undefined
  try {
    const { device: tempDevice } = parsePath(request.url)
    device = tempDevice
    type = 'new'
  } catch {}

  if (!device) {
    try {
      body = await request.json<{
        expoToken: string
        instanceUrl: string
        accountId: string
        keys?: { public: string; private: string; auth: string }
      }>()
      if (!body.expoToken || !body.instanceUrl || !body.accountId) {
        return new Response('[updateDecode] Data error', { status: 400 })
      }
      device = body.expoToken
      type = 'legacy'
    } catch {}
  }

  if (!device) {
    return new Response('[updateDecode] Data error', { status: 400 })
  }

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_DEVICE
      : env.TOOOT_PUSH_DEVICE_DEV

  const id = durableObject.idFromName(device)
  const obj = durableObject.get(id)
  switch (type) {
    case 'new':
      await obj.fetch(request.clone())
      break
    case 'legacy':
      if (!body) {
        return new Response('[updateDecode] Data error', { status: 400 })
      }
      await obj.fetch(
        `https://example.com/push/update-decode/${body.expoToken}/${body.instanceUrl}/${body.accountId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            auth: body.keys?.auth ? body.keys.auth : null
          })
        }
      )
      break
    default:
      return new Response('[updateDecode] Data error', { status: 400 })
  }
}

export default updateDecode
