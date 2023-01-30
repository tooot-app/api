export default {
  async fetch(request: Request) {
    const url = new URL(request.url)

    if (url.pathname === '/verify') {
      return new Response()
    }

    const headers = Object.fromEntries(request.headers)
    url.host = headers['x-tooot-domain']
    return fetch(new Request(url, request))
  }
}
