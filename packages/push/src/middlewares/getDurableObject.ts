import { Env } from '..'

const getDurableObject = (
  request: Request & {
    params: { expoToken: string }
    durableObject: DurableObjectStub
  },
  env: Env
) => {
  if (!request.params.expoToken) {
    throw new Error('Missing expoToken in URL')
  }

  const durableObject =
    env.ENVIRONMENT === 'release'
      ? env.TOOOT_PUSH_DEVICE
      : env.TOOOT_PUSH_DEVICE_DEV

  request.durableObject = durableObject.get(
    durableObject.idFromName(request.params.expoToken)
  )
}

export default getDurableObject
