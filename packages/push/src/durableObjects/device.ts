import Toucan from 'toucan-js'
import { Env } from '..'
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

export type DeviceState = {
  accounts: {
    [hash: string]: Account
  }
  errorCounts: number
  connectedTimestamp: number
}

export class Device {
  state: DurableObjectState
  env: Env

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  fetch = async (request: Request) => {
    const sentry = new Toucan({
      dsn: this.env.SENTRY_DSN,
      environment: this.env.ENVIRONMENT,
      debug: this.env.ENVIRONMENT === 'development',
      request,
      allowedHeaders: [
        'user-agent',
        'cf-challenge',
        'accept-encoding',
        'accept-language',
        'cf-ray',
        'content-length',
        'content-type',
        'x-real-ip',
        'host'
      ],
      allowedSearchParams: /(.*)/,
      rewriteFrames: {
        root: '/'
      }
    })
    const colo = request.cf && request.cf.colo ? request.cf.colo : 'UNKNOWN'
    sentry.setTag('colo', colo)
    sentry.setTag('DurableObject', 'TOOOT_PUSH_DEVICE')
    const ipAddress =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')
    const userAgent = request.headers.get('user-agent') || ''
    sentry.setUser({ ip: ipAddress, userAgent: userAgent, colo: colo })
    // sentry.setRequestBody(request.clone().json())

    return await handleErrors(sentry, async () => {
      const path = new URL(request.url).pathname.slice(1).split('/')
      console.log('Reading durable object', path[1])

      let accountPointer: string
      let bodyJson: Partial<Account>
      let existingAccounts: { [hash: string]: Account } = {}

      switch (path[1]) {
        case 'connect':
          existingAccounts = (await this.state.storage.get('accounts')) || {}
          if (Object.keys(existingAccounts).length === 0) {
            return new Response(null, { status: 404 })
          }
          await this.state.storage.put(
            'connectedTimestamp',
            new Date().getTime()
          )
          return new Response()

        case 'subscribe':
          accountPointer = `${path[3]}/${path[4]}`
          bodyJson = await request.json<Account>()

          existingAccounts = (await this.state.storage.get('accounts')) || {}
          await this.state.storage.put({
            accounts: {
              ...existingAccounts,
              [accountPointer]: bodyJson
            },
            connectedTimestamp: new Date().getTime()
          })
          return new Response()

        case 'unsubscribe':
          accountPointer = `${path[3]}/${path[4]}`

          existingAccounts = (await this.state.storage.get('accounts')) || {}
          delete existingAccounts[accountPointer]
          await this.state.storage.put({
            accounts: existingAccounts,
            connectedTimestamp: new Date().getTime()
          })
          return new Response()

        case 'update-decode':
          accountPointer = `${path[3]}/${path[4]}`
          bodyJson = await request.json<Pick<Account, 'auth'>>()

          existingAccounts = (await this.state.storage.get('accounts')) || {}
          if (!existingAccounts[accountPointer]) {
            return new Response('Could not find corresponding account.', {
              status: 404
            })
          }
          existingAccounts[accountPointer].auth = bodyJson.auth
          if (!bodyJson.auth && existingAccounts[accountPointer].legacyKeys) {
            delete existingAccounts[accountPointer].legacyKeys
          }
          await this.state.storage.put('accounts', existingAccounts)
          return new Response()

        case 'send':
          accountPointer = `${path[3]}/${path[4]}`
          const accounts = await this.state.storage.get<{
            [hash: string]: Account
          }>('accounts')
          if (!accounts || !accounts[accountPointer]) {
            return new Response('Could not find corresponding account.', {
              status: 404
            })
          }
          return new Response(JSON.stringify(accounts[accountPointer]))

        // Migration
        case 'migration':
          const accountsMigration: DeviceState['accounts'] =
            await request.json()

          await this.state.storage.put({
            accounts: accountsMigration,
            errorCounts: 0,
            connectedTimestamp: new Date().getTime()
          })
          return new Response()

        // Legacy
        case 'register1':
          const dataRegister1 = await request.json<{
            expoToken: string
            instanceUrl: string
            accountId: string
            accountFull: string
            auth: string
          }>()

          existingAccounts = (await this.state.storage.get('accounts')) || {}
          accountPointer = `${dataRegister1.instanceUrl}/${dataRegister1.accountId}`

          await this.state.storage.put({
            accounts: {
              ...existingAccounts,
              [accountPointer]: {
                accountFull: dataRegister1.accountFull,
                auth: dataRegister1.auth
              }
            }
          })
          return new Response()

        case 'register2':
          const dataRegister2 = await request.json<{
            expoToken: string
            instanceUrl: string
            accountId: string
            serverKey: string
            removeKeys: boolean
          }>()

          existingAccounts = (await this.state.storage.get('accounts')) || {}
          accountPointer = `${dataRegister2.instanceUrl}/${dataRegister2.accountId}`

          if (!existingAccounts[accountPointer]) {
            return new Response('Could not find corresponding account.', {
              status: 404
            })
          }
          existingAccounts[accountPointer] = {
            ...existingAccounts[accountPointer],
            serverKey: dataRegister2.serverKey,
            ...(dataRegister2.removeKeys ? { auth: undefined } : null)
          }
          await this.state.storage.put({
            accounts: existingAccounts,
            errorCounts: 0,
            connectedTimestamp: new Date().getTime()
          })
          return new Response()

        case 'unregister':
          const dataUnregister = await request.json<{
            expoToken: string
            instanceUrl: string
            accountId: string
          }>()

          existingAccounts = (await this.state.storage.get('accounts')) || {}
          accountPointer = `${dataUnregister.instanceUrl}/${dataUnregister.accountId}`

          delete existingAccounts[accountPointer]
          await this.state.storage.put({
            accounts: existingAccounts,
            connectedTimestamp: new Date().getTime()
          })
          return new Response()

        default:
          return new Response('Unknown request.', { status: 404 })
      }
    })
  }
}
