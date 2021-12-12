import { Env } from '..'
import parsePath from '../utils/parsePath'

const universal = async ({ request, env }: { request: Request; env: Env }) => {
  const { uniqueName } = parsePath(request.url)

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_ENDPOINT
      : env.TOOOT_PUSH_ENDPOINT_DEV

  const id = durableObject.idFromName(uniqueName)
  const obj = durableObject.get(id)
  await obj.fetch(request.clone())
}

export default universal
