const handleErrors = async (
  func: () => Promise<void | Response>
): Promise<Response> => {
  let response: Response | void = undefined

  try {
    response = await func()
    console.log('raw response', response)
  } catch (err) {
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

    return new Response(message, { status: 500 })
  } finally {
    console.log('response', response)
    if (response) {
      return response
    } else {
      return new Response(null, { status: 200 })
    }
  }
}

export default handleErrors
