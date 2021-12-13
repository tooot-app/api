const parsePath = (
  url: string
): { device: string; instanceUrl: string; accountId: string } => {
  const path = new URL(url).pathname.slice(1).split('/')

  if (!path[2] || !path[3] || !path[4]) {
    throw new Error('Missing data from path')
  }

  return { device: path[2], instanceUrl: path[3], accountId: path[4] }
}

export default parsePath
