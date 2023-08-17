import { IRequest, Route, Router, RouterType } from 'itty-router'
import { BodyUpdateDecode, Env, ParamsSend, ParamsSubscribe, ParamsUpdateDecode } from '..'
import handleErrors from '../utils/handleErrors'
import logToNR from '../utils/logToNR'

export type Account = {
  accountFull: string
  serverKey: string
  auth: string | void
  legacyKeys:
    | {
        public: string
        private: string
        auth: string
      }
    | undefined
}
type Accounts = { [accountIdentifier: string]: Account }

const parseAccount = (
  params: {
    expoToken?: string | undefined
    instanceUrl?: string | undefined
    accountId?: string | undefined
  } & {
    [key: string]: string
  }
) => `${params.instanceUrl}/${params.accountId}`

export class Device {
  state: DurableObjectState
  env: Env
  accounts: Accounts
  errorCounts?: number
  badge: number

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.accounts = {}
    this.errorCounts = undefined
    this.badge = 0
  }

  fetch = async (request: IRequest) => {
    interface CustomRouter extends RouterType {
      get: Route
      post: Route
      delete: Route
      put: Route
      all: Route
    }
    const router = <CustomRouter>Router({ base: '/push' })
    const pathGlobal = '/:expoToken/:instanceUrl/:accountId'

    // Matching original request
    router.get(
      '/connect/:expoToken',
      async (request: ParamsSubscribe & IRequest): Promise<Response> => {
        this.accounts = (await this.state.storage.get('accounts')) || {}
        if (Object.keys(this.accounts).length === 0) {
          logToNR(this.env.NEW_RELIC_KEY, {
            tooot_push_log: 'error_no_device',
            workers_type: 'durable_object',
            expoToken: request.params.expoToken
          })
          return new Response(
            JSON.stringify({ error: 'Your device has zero account registered' }),
            { status: 404 }
          )
        }

        this.errorCounts = await this.state.storage.get<number>('errorCounts')
        if (this.errorCounts && this.errorCounts > 0) {
          this.errorCounts = 0
          this.state.storage.put('errorCounts', this.errorCounts)
        }

        this.badge = 0
        this.state.storage.put('badge', this.badge)

        this.state.storage.put('connectedTimestamp', new Date().getTime())
        return new Response(JSON.stringify({ accounts: Object.keys(this.accounts) }))
      }
    )
    router.post(
      `/subscribe${pathGlobal}`,
      async (request: ParamsSubscribe & IRequest): Promise<Response> => {
        this.accounts = (await this.state.storage.get('accounts')) || {}
        await this.state.storage.put({
          accounts: {
            ...this.accounts,
            [parseAccount(request.params)]: (await request.json()) as Account
          },
          connectedTimestamp: new Date().getTime()
        })
        return new Response()
      }
    )
    router.delete(
      `/unsubscribe${pathGlobal}`,
      async (request: ParamsSubscribe & IRequest): Promise<Response> => {
        this.accounts = (await this.state.storage.get('accounts')) || {}
        delete this.accounts[parseAccount(request.params)]
        await this.state.storage.put({
          accounts: this.accounts,
          connectedTimestamp: new Date().getTime()
        })
        return new Response()
      }
    )
    router.put(
      `/update-decode${pathGlobal}`,
      async (request: ParamsUpdateDecode & IRequest): Promise<Response> => {
        const body: BodyUpdateDecode = await request.json()

        const account = parseAccount(request.params)
        this.accounts = (await this.state.storage.get('accounts')) || {}
        if (!this.accounts[account]) {
          logToNR(this.env.NEW_RELIC_KEY, {
            tooot_push_log: 'error_decode_no_account',
            workers_type: 'durable_object',
            expoToken: request.params.expoToken,
            instanceUrl: request.params.instanceUrl
          })
          return new Response(
            JSON.stringify({ error: 'Could not find corresponding account to update' }),
            { status: 404 }
          )
        }
        this.accounts[account].auth = body.auth
        if (!body.auth && this.accounts[account].legacyKeys) {
          delete this.accounts[account].legacyKeys
        }
        await this.state.storage.put('accounts', this.accounts)
        return new Response()
      }
    )
    router.post(
      `/send${pathGlobal}/:random?`,
      async (request: ParamsSend & IRequest): Promise<Response> => {
        const account = parseAccount(request.params)
        const accounts = await this.state.storage.get<Accounts>('accounts', {
          allowConcurrency: true
        })
        if (!accounts || !accounts[account]) {
          logToNR(this.env.NEW_RELIC_KEY, {
            tooot_push_log: 'error_send_no_account',
            workers_type: 'durable_object',
            expoToken: request.params.expoToken,
            instanceUrl: request.params.instanceUrl
          })
          return new Response(
            JSON.stringify({ error: 'Could not find corresponding account to send to' }),
            { status: 404 }
          )
        }

        this.errorCounts = await this.state.storage.get<number>('errorCounts', {
          allowConcurrency: true
        })
        if (this.errorCounts && this.errorCounts > 5) {
          await this.state.storage.deleteAll()
          await logToNR(this.env.NEW_RELIC_KEY, {
            tooot_push_log: 'error_limit_reached',
            workers_type: 'durable_object',
            expoToken: request.params.expoToken,
            instanceUrl: request.params.instanceUrl
          })
          return new Response(JSON.stringify({ error: "Device's errorCounts reached limit" }), {
            status: 404
          })
        }

        const connectedTimestamp = await this.state.storage.get<number>('connectedTimestamp')
        if (
          connectedTimestamp &&
          new Date().getTime() - connectedTimestamp > 1000 * 60 * 60 * 24 * 30
        ) {
          await this.state.storage.deleteAll()
          await logToNR(this.env.NEW_RELIC_KEY, {
            tooot_push_log: 'error_connected_expired',
            workers_type: 'durable_object',
            expoToken: request.params.expoToken,
            instanceUrl: request.params.instanceUrl,
            connectedTimestamp
          })
          return new Response(JSON.stringify({ error: 'Device is not in use' }), { status: 404 })
        }

        this.badge = ((await this.state.storage.get<number>('badge')) || 0) + 1
        await this.state.storage.put('badge', this.badge)

        return new Response(JSON.stringify({ account: accounts[account], badge: this.badge }))
      }
    )

    // Custom routes for Durable Object
    router.put('/do/count-error', async (): Promise<Response> => {
      this.errorCounts = await this.state.storage.get<number>('errorCounts', {
        allowConcurrency: true
      })
      this.errorCounts = (this.errorCounts || 0) + 1
      this.state.storage.put('errorCounts', this.errorCounts)

      this.badge = (await this.state.storage.get<number>('badge')) || 0
      if (this.badge > 0) {
        this.badge = this.badge - 1
      }
      await this.state.storage.put('badge', this.badge)
      return new Response()
    })

    // Migration
    router.get('/migrate/:expoToken', async (): Promise<Response> => {
      return new Response(JSON.stringify(Object.fromEntries(await this.state.storage.list())), {
        headers: { 'Content-Type': 'application/json' }
      })
    })
    router.post('/migrate/:expoToken', async (request: IRequest): Promise<Response> => {
      const data = await request.json()
      console.log('data', data)
      await this.state.storage.put(data)
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      })
    })
    router.delete('/migrate/:expoToken', async (request: IRequest): Promise<Response> => {
      await this.state.storage.deleteAll()
      return new Response()
    })

    // Admin
    router.get('/admin/expoToken/:expoToken', async (): Promise<Response> => {
      return new Response(JSON.stringify(Object.fromEntries(await this.state.storage.list())), {
        headers: { 'Content-Type': 'application/json' }
      })
    })

    router.all('*', async (): Promise<Response> => {
      logToNR(this.env.NEW_RELIC_KEY, {
        tooot_push_log: 'error_no_route',
        workers_type: 'durable_object'
      })
      return new Response(null, { status: 404 })
    })

    return router.handle(request).catch((err: unknown) =>
      handleErrors('durable objects - device', err, {
        request,
        env: this.env,
        context: this.state
      })
    )
  }
}
