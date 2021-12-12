const handleErrors = async (func: Function) => {
  let response: Response
  try {
    response = await func()
  } catch (err) {
    let message: string
    if (typeof err === 'string') {
      message = err.toUpperCase()
    } else if (err instanceof Error) {
      message = err.toString()
    } else {
      message = 'Unknown error'
    }
    console.warn(message)

    return new Response(message, { status: 500 })
  } finally {
    return response
  }
}

export default handleErrors
