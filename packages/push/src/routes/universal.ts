import { Env } from '..'
import parsePath from '../utils/parsePath'

const universal = async ({ request, env }: { request: Request; env: Env }) => {
  const { device } = parsePath(request.url)

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_DEVICE
      : env.TOOOT_PUSH_DEVICE_DEV

  const id = durableObject.idFromName(device)
  const obj = durableObject.get(id)
  await obj.fetch(request.clone())
}

export default universal
