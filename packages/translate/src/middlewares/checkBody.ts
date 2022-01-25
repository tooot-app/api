import { NewRequest } from '..'

const checkBody = async (request: NewRequest) => {
  request.bodyJson = await request.json()

  if (
    !request.bodyJson.target ||
    !Array.isArray(request.bodyJson.text) ||
    !request.bodyJson.text.filter(t => t.length > 0)
  ) {
    throw new Error('Request body error')
  }
}

export default checkBody
