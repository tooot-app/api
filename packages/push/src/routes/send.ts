import Buffer from 'buffer/'
import { Env } from '..'
import decode from '../utils/decode'
import parsePath from '../utils/parsePath'
import pushToExpo from '../utils/pushToExpo'

const send = async ({
  request,
  env,
  context
}: {
  request: Request
  env: Env
  context: any
}) => {
  const { uniqueName, expoToken, instanceUrl, accountId } = parsePath(
    request.url
  )

  if (!request.body) {
    throw new Error('[send] Request body empty')
  }

  const headers = Object.fromEntries(request.headers) as {
    'crypto-key': string
    encryption: string
  }

  if (!headers['crypto-key']) {
    throw new Error('[send] Are you a legit server?')
  }

  const regexServerKey = new RegExp(/dh=.*;p256ecdsa=(.*)/)
  const getServerKey = headers['crypto-key'].match(regexServerKey)
  if (!getServerKey || !getServerKey[1]) {
    throw new Error('[send] Cannot find serverKey in crypto-key header')
  }

  const regexCryptoKey = new RegExp(/dh=(.*);p256ecdsa=/)
  const getCryptoKey = headers['crypto-key'].match(regexCryptoKey)
  if (!getCryptoKey || !getCryptoKey[1]) {
    throw new Error('[send] Cannot find crypto key in crypto-key header')
  }
  const regexEncryption = new RegExp(/salt=(.*)/)
  const getEncryption = headers.encryption.match(regexEncryption)
  if (!getEncryption || !getEncryption[1]) {
    throw new Error('[send] Cannot find encryption key in header')
  }

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_ENDPOINT
      : env.TOOOT_PUSH_ENDPOINT_DEV

  const id = durableObject.idFromName(uniqueName)
  const obj = durableObject.get(id)
  const stored: {
    accountFull: string
    serverKey: string
    auth: string | null
  } = await (await obj.fetch(request.clone())).json()

  if (`${getServerKey[1]}=` !== stored.serverKey) {
    throw new Error(
      '[send] serverKey in crypto-key header does not match record'
    )
  }

  if (!stored.auth) {
    await pushToExpo(context, env.EXPO_ACCESS_TOKEN_PUSH, {
      context: {
        expoToken,
        instanceUrl,
        accountId,
        accountFull: stored.accountFull
      }
    })
  } else {
    const readAllChunks = async (readableStream: ReadableStream) => {
      const reader = readableStream.getReader()
      const chunks = []

      let done, value
      while (!done) {
        ;({ value, done } = await reader.read())
        if (done) {
          return chunks
        }
        chunks.push(value)
      }
    }
    const bodyStream = await readAllChunks(request.body)
    if (!bodyStream) {
      throw new Error('[send] Cannot read body stream')
    }

    const message = await decode({
      body: Buffer.Buffer.concat(bodyStream),
      keys: {
        auth: stored.auth,
        private: env.KEY_PRIVATE,
        public: env.KEY_PUBLIC,
        crypto: getCryptoKey[1],
        encryption: getEncryption[1]
      }
    })

    await pushToExpo(context, env.EXPO_ACCESS_TOKEN_PUSH, {
      context: {
        expoToken,
        instanceUrl,
        accountId,
        accountFull: stored.accountFull
      },
      details: message
    })
  }
}

export default send
