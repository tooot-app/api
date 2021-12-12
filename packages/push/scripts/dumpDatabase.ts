import fs from 'fs'
import { Knex, knex } from 'knex'
import { ExpoData } from '../src/durableObjects/expo'

type DB_Expo = {
  expoToekn: string
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
  const accounts = await knexInstance<DB_Account>('server_and_account').select(
    '*'
  )

  const newData: {
    uniqueName: string
    data: Omit<ExpoData, 'errorCounts' | 'connectedTimestamp'>
  }[] = accounts.map(account => ({
    uniqueName: `${account.expoTokenExpoToken}/${account.instanceUrl}/${account.accountId}`,
    data: {
      accountFull: account.accountFull,
      serverKey: account.serverKey,
      auth: null,
      legacyKeys: account.keys ? JSON.parse(account.keys) : null
    }
  }))

  fs.writeFile('./scripts/output.json', JSON.stringify(newData), err => {
    if (err) {
      console.error(err)
      return
    }
  })
}

app()
