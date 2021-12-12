import { Env } from '..'
import json from '../../scripts/output.json'

const migration = async ({ request, env }: { request: Request; env: Env }) => {
  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_ENDPOINT
      : env.TOOOT_PUSH_ENDPOINT_DEV

  for (const entity of json) {
    const id = durableObject.idFromName(entity.uniqueName)
    const obj = durableObject.get(id)
    await obj.fetch(request.url, {
      method: 'POST',
      body: JSON.stringify(entity.data)
    })
  }
}

export default migration
