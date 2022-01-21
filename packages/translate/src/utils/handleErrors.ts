import Toucan from 'toucan-js'

const handleErrors = async (
  sentry: Toucan,
  func: Function
): Promise<Response> => {
  let response: Response | void = undefined

  try {
    response = await func()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.warn(message)

    if (message.includes('Decryption failed')) {
      sentry.setTag('status', 400)
      response = new Response(message, { status: 400 })
    } else {
      sentry.setTag('status', 500)
      response = new Response(message, { status: 500 })
    }

    if (Math.random() < 0.01) {
      sentry.captureException(err)
    }
  } finally {
    return response || new Response(null, { status: 200 })
  }
}

export default handleErrors
