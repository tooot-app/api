export default {
  async fetch(
    request: Request,
    { ENVIRONMENT }: { ENVIRONMENT: 'development' | 'candidate' | 'release' }
  ) {
    const DOMAIN =
      ENVIRONMENT === 'development'
        ? 'tooot-connect-development.xmflsct.workers.dev'
        : ENVIRONMENT === 'candidate'
        ? 'connect-candidate.tooot.app'
        : 'connect.tooot.app'

    if (request.url.endsWith('/verify')) {
      return new Response()
    }

    const headers = Object.fromEntries(request.headers)

    return fetch(request.url.replace(DOMAIN, headers['x-tooot-domain']), {
      method: request.method,
      headers,
      body: request.body
    })
  }
}
