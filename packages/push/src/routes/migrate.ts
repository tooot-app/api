import { IRequest } from 'itty-router'
import { Env } from '..'

const migrate = async (request: IRequest, env: Env) => {
  const token = request.params.expoToken.replace('%5B', '[').replace('%5D', ']')
  if (!token || !token.startsWith('ExponentPushToken')) {
    throw new Error('Migration format not correct')
  }

  const durableObject =
    env.ENVIRONMENT === 'release' ? env.TOOOT_PUSH_DEVICE : env.TOOOT_PUSH_DEVICE_DEV

  const oldObj = durableObject.get(durableObject.idFromName(token))
  const oldData = await oldObj.fetch(request.url, { method: 'GET' })

  const newToken = token.replace('ExponentPushToken[', '').replace(']', '')
  const newObj = durableObject.get(durableObject.idFromName(newToken))
  await newObj.fetch(request.url, {
    method: 'POST',
    body: oldData.body
  })

  await oldObj.fetch(request.url, { method: 'DELETE' })

  return new Response()
}

export default migrate
