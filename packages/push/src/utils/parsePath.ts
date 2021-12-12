const parsePath = (
  url: string
): {
  uniqueName: string
  expoToken: string
  instanceUrl: string
  accountId: string
} => {
  const path = new URL(url).pathname.slice(1).split('/')
  let uniqueName: string

  if (!path[2] || !path[3] || !path[4]) {
    throw new Error('[send] Request path error')
  } else {
    uniqueName = `${path[2]}/${path[3]}/${path[4]}`
  }
  return {
    uniqueName,
    expoToken: path[2],
    instanceUrl: path[3],
    accountId: path[4]
  }
}

export default parsePath
