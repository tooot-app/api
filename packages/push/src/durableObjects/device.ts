import { Router } from 'itty-router'
import {
  BodyUpdateDecode,
  Env,
  ParamsSend,
  ParamsSubscribe,
  ParamsUpdateDecode
} from '..'
import handleErrors from '../utils/handleErrors'

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

export type DeviceState = {
  accounts: Accounts
  errorCounts: number
  connectedTimestamp: number
}

export class Device {
  state: DurableObjectState
  env: Env
  accounts: Accounts
  account?: string

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.accounts = {}
    this.account = undefined
  }

  fetch = async (request: Request) => {
    const router = Router({ base: '/push' })
    const pathGlobal = '/:expoToken/:instanceUrl/:accountId'

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
    router.post(`/send${pathGlobal}`, async (request: Request & ParamsSend) => {
      this.account = `${request.params.instanceUrl}/${request.params.accountId}`
      const accounts = await this.state.storage.get<Accounts>('accounts', {
        allowConcurrency: true
      })
      if (!accounts || !accounts[this.account]) {
        return new Response('Could not find corresponding account to send to', {
          status: 404
        })
      }
      return new Response(JSON.stringify(accounts[this.account]))
    })
    router.all('*', () => new Response(null, { status: 404 }))

    return router.handle(request).catch((err: unknown) =>
      handleErrors('durable objects - device', err, {
        request,
        env: this.env,
        context: this.state
      })
    )
  }
}
