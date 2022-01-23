import { DurableObjectDevice } from '..'

const universal = async (
  request: Request & DurableObjectDevice
): Promise<Response> => {
  return await request.durableObject.fetch(request.clone())
}

export default universal
