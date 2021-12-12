export type EndpointData = {
  accountFull: string
  serverKey: string
  auth: string | null
  errorCounts: number
  connectedTimestamp: number
}

export class Endpoint {
  state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  fetch = async (request: Request) => {
    const path = new URL(request.url).pathname.slice(1).split('/')
    console.log('Reading durable object', path[1])
    switch (path[1]) {
      case 'connect':
        await this.state.storage.put('connectedTimestamp', new Date().getTime())
        break
      case 'subscribe':
        const dataSubscribe: EndpointData = await request.json()

        if (!dataSubscribe.accountFull || !dataSubscribe.serverKey) {
          throw new Error('[Expo] Request missing data.')
        }

        await this.state.storage.put({
          ...dataSubscribe,
          errorCounts: 0,
          connectedTimestamp: new Date().getTime()
        })
        break
      case 'unsubscribe':
        await this.state.storage.deleteAll()
        break
      case 'update-decode':
        const dataUpdateDecode: Pick<EndpointData, 'auth'> =
          await request.json()
        await this.state.storage.put('auth', dataUpdateDecode?.auth)
        break
      case 'send':
        const dataSend = Object.fromEntries(
          await this.state.storage.get(['accountFull', 'serverKey', 'auth'])
        )
        return new Response(JSON.stringify(dataSend))
        break
      // Migration
      case 'migration':
        const dataMigration: EndpointData = await request.json()

        if (!dataMigration.accountFull || !dataMigration.serverKey) {
          throw new Error('[Expo] Request missing data.')
        }

        await this.state.storage.put({
          ...dataMigration,
          errorCounts: 0,
          connectedTimestamp: new Date().getTime()
        })
        break
      // Legacy
      case 'register1':
        const dataRegister1: Pick<EndpointData, 'accountFull' | 'auth'> =
          await request.json()

        await this.state.storage.put(dataRegister1)
        break
      case 'register2':
        const dataRegister2: Pick<EndpointData, 'serverKey'> & {
          removeKeys: boolean
        } = await request.json()

        await this.state.storage.put({
          serverKey: dataRegister2.serverKey,
          ...(dataRegister2.removeKeys ? { auth: null } : null),
          errorCounts: 0,
          connectedTimestamp: new Date().getTime()
        })
        break
      case 'unregister':
        await this.state.storage.deleteAll()
        break
    }

    return new Response()
  }
}
