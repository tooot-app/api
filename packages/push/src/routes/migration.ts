import { Env } from '..'
import json from '../../scripts/output.json'

const migration = async ({ request, env }: { request: Request; env: Env }) => {
  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_DEVICE
      : env.TOOOT_PUSH_DEVICE_DEV

  for (const entity of json) {
    const id = durableObject.idFromName(entity.device)
    const obj = durableObject.get(id)
    await obj.fetch(request.url, {
      method: 'POST',
      body: JSON.stringify(entity.accounts)
    })
  }
}

export default migration
