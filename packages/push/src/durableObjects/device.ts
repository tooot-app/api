import { Router } from 'itty-router'
import {
  BodyUpdateDecode,
  Env,
  ParamsSend,
  ParamsSubscribe,
  ParamsUpdateDecode
} from '..'
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

export class Device {
  state: DurableObjectState
  env: Env
  accounts: Accounts
  account?: string
  errors?: number

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.accounts = {}
    this.account = undefined
    this.errors = undefined
  }

  fetch = async (request: Request) => {
    const router = Router({ base: '/push' })
    const pathGlobal = '/:expoToken/:instanceUrl/:accountId'

    // Matching original request
    router.get('/connect/:expoToken', async (): Promise<Response> => {
      this.accounts = (await this.state.storage.get('accounts')) || {}
      if (Object.keys(this.accounts).length === 0) {
        return new Response('Your device has zero account registered', {
          status: 404
        })
      }
      await this.state.storage.put('connectedTimestamp', new Date().getTime())
      return new Response()
    })
    router.post(
      `/subscribe${pathGlobal}`,
      async (request: Request & ParamsSubscribe): Promise<Response> => {
        this.account = `${request.params.instanceUrl}/${request.params.accountId}`
        this.accounts = (await this.state.storage.get('accounts')) || {}
        await this.state.storage.put({
          accounts: {
            ...this.accounts,
            [this.account]: await request.json<Account>()
          },
          connectedTimestamp: new Date().getTime()
        })
        return new Response()
      }
    )
    router.delete(
      `/unsubscribe${pathGlobal}`,
      async (request: Request & ParamsSubscribe): Promise<Response> => {
        this.account = `${request.params.instanceUrl}/${request.params.accountId}`
        this.accounts = (await this.state.storage.get('accounts')) || {}
        delete this.accounts[this.account]
        await this.state.storage.put({
          accounts: this.accounts,
          connectedTimestamp: new Date().getTime()
        })
        return new Response()
      }
    )
    router.put(
      `/update-decode${pathGlobal}`,
      async (request: Request & ParamsUpdateDecode): Promise<Response> => {
        const body = await request.json<BodyUpdateDecode>()
        this.account = `${request.params.instanceUrl}/${request.params.accountId}`
        this.accounts = (await this.state.storage.get('accounts')) || {}
        if (!this.accounts[this.account]) {
          return new Response(
            'Could not find corresponding account to update',
            {
              status: 404
            }
          )
        }
        this.accounts[this.account].auth = body.auth
        if (!body.auth && this.accounts[this.account].legacyKeys) {
          delete this.accounts[this.account].legacyKeys
        }
        await this.state.storage.put('accounts', this.accounts)
        return new Response()
      }
    )
    router.post(
      `/send${pathGlobal}`,
      async (request: Request & ParamsSend): Promise<Response> => {
        this.account = `${request.params.instanceUrl}/${request.params.accountId}`
        const accounts = await this.state.storage.get<Accounts>('accounts', {
          allowConcurrency: true
        })
        if (!accounts || !accounts[this.account]) {
          return new Response(
            'Could not find corresponding account to send to',
            {
              status: 404
            }
          )
        }

        this.errors = await this.state.storage.get<number>('errors', {
          allowConcurrency: true
        })
        if (this.errors && this.errors > 5) {
          await this.state.storage.deleteAll()
          await logToNR(this.env.NEW_RELIC_KEY, {
            tooot_push_log: 'error_limit_reached',
            workers_type: 'durable_object',
            expoToken: request.params.expoToken,
            instanceUrl: request.params.instanceUrl
          })
          return new Response("Device's errors reached limit", {
            status: 404
          })
        }
        return new Response(JSON.stringify(accounts[this.account]))
      }
    )

    // Custom routes for Durable Object
    router.put('/do/count-error', async (): Promise<Response> => {
      this.errors = await this.state.storage.get<number>('errors', {
        allowConcurrency: true
      })
      this.errors = (this.errors || 0) + 1
      this.state.storage.put('errors', this.errors)
      return new Response()
    })

    router.all('*', (): Response => new Response(null, { status: 404 }))

    return router.handle(request).catch((err: unknown) =>
      handleErrors('durable objects - device', err, {
        request,
        env: this.env,
        context: this.state
      })
    )
  }
}
