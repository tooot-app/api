import Toucan from 'toucan-js'

const handleErrors = async (
  sentry: Toucan,
  func: () => Promise<void | Response>
): Promise<Response> => {
  let response: Response | void = undefined

  try {
    response = await func()
  } catch (err) {
    sentry.captureException(err)

    let message: string

    if (typeof err === 'string') {
      message = err.toUpperCase()
    } else if (err instanceof Error) {
      message = err.toString()
    } else {
      // @ts-ignore
      message = err?.message || 'Unknown error'
    }
    console.warn(message)

    response = new Response(message, { status: 500 })
  } finally {
    if (response) {
      return response
    } else {
      return new Response(null, { status: 200 })
    }
  }
}

export default handleErrors
