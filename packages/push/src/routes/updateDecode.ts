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
  let uniqueName: string | undefined = undefined
  let type: 'new' | 'legacy' | undefined = undefined
  try {
    const thePath = parsePath(request.url)
    uniqueName = thePath.uniqueName
    type = 'new'
  } catch {}

  if (!uniqueName) {
    try {
      body = await request.json<{
        expoToken: string
        instanceUrl: string
        accountId: string
        keys?: { public: string; private: string; auth: string }
      }>()
      if (!body.expoToken || !body.instanceUrl || !body.accountId) {
        throw new Error('Body data error')
      }
      uniqueName = `${body.expoToken}/${body.instanceUrl}/${body.accountId}`
      type = 'legacy'
    } catch {}
  }

  if (!uniqueName) {
    throw new Error('Data error')
  }

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_ENDPOINT
      : env.TOOOT_PUSH_ENDPOINT_DEV

  const id = durableObject.idFromName(uniqueName)
  const obj = durableObject.get(id)
  switch (type) {
    case 'new':
      await obj.fetch(request.clone())
      break
    case 'legacy':
      if (!body) {
        throw new Error('Data error')
      }
      await obj.fetch(request.url, {
        method: 'POST',
        body: JSON.stringify({ auth: body.keys?.auth ? body.keys.auth : null })
      })
      break
    default:
      throw new Error('Data error')
  }
}

export default updateDecode
