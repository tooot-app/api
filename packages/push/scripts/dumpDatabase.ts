import fs from 'fs'
import { Knex, knex } from 'knex'
import { DeviceState } from '../src/durableObjects/device'

type DB_Expo = {
  expoToken: string
  connectedTimestamp: Date
  errorCounts: number
}
type DB_Account = {
  id: number
  serverKey: string
  keys: string // JSON or null
  instanceUrl: string
  accountId: string
  accountFull: string
  expoTokenExpoToken: string
}

const config: Knex.Config = {
  client: 'sqlite3',
  connection: {
    filename: './scripts/db.sqlite'
  }
}

const knexInstance = knex(config)

const app = async () => {
  const expos = await knexInstance<DB_Expo>('expo_token').select('*')
  const accounts = await knexInstance<DB_Account>('server_and_account').select(
    '*'
  )

  const data: { device: string; accounts: DeviceState['accounts'] }[] = expos
    .map(expo => ({
      device: expo.expoToken,
      accounts: accounts
        .filter(account => account.expoTokenExpoToken === expo.expoToken)
        .reduce<{
          [k: string]: {
            accountFull: string
            serverKey: string
            auth: string | undefined
            legacyKeys:
              | {
                  public: string
                  private: string
                  auth: string
                }
              | undefined
          }
        }>((account, value) => {
          const uniqueAccount = `${value.instanceUrl}/${value.accountId}`
          if (!account.hasOwnProperty(uniqueAccount)) {
            account[uniqueAccount] = {
              accountFull: value.accountFull,
              serverKey: value.serverKey,
              auth: undefined,
              legacyKeys: value.keys ? JSON.parse(value.keys) : undefined
            }
          }
          return account
        }, {})
    }))
    .filter(d => Object.keys(d.accounts).length > 0)

  fs.writeFile('./scripts/output.json', JSON.stringify(data), err => {
    if (err) {
      console.error(err)
      return
    }
  })
}

app()
