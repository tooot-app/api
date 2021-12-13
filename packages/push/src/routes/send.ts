import Buffer from 'buffer/'
import { Env } from '..'
import { Account } from '../durableObjects/device'
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
  const { device, instanceUrl, accountId } = parsePath(request.url)

  if (!request.body) {
    return new Response('[send] Request body empty', { status: 400 })
  }

  const headers = Object.fromEntries(request.headers) as {
    'crypto-key': string
    encryption: string
  }

  if (!headers['crypto-key']) {
    return new Response('[send] Are you a legit server?', { status: 403 })
  }

  const regexServerKey = new RegExp(/dh=.*;p256ecdsa=(.*)/)
  const getServerKey = headers['crypto-key'].match(regexServerKey)
  if (!getServerKey || !getServerKey[1]) {
    return new Response('[send] Cannot find serverKey in crypto-key header', {
      status: 400
    })
  }

  const regexCryptoKey = new RegExp(/dh=(.*);p256ecdsa=/)
  const getCryptoKey = headers['crypto-key'].match(regexCryptoKey)
  if (!getCryptoKey || !getCryptoKey[1]) {
    return new Response('[send] Cannot find crypto key in crypto-key header', {
      status: 403
    })
  }
  const regexEncryption = new RegExp(/salt=(.*)/)
  const getEncryption = headers.encryption.match(regexEncryption)
  if (!getEncryption || !getEncryption[1]) {
    return new Response('[send] Cannot find encryption key in header', {
      status: 403
    })
  }

  const durableObject =
    env.ENVIRONMENT === 'production'
      ? env.TOOOT_PUSH_DEVICE
      : env.TOOOT_PUSH_DEVICE_DEV

  const id = durableObject.idFromName(device)
  const obj = durableObject.get(id)
  const stored: Account = await (await obj.fetch(request.clone())).json()

  if (`${getServerKey[1]}=` !== stored.serverKey) {
    return new Response(
      '[send] serverKey in crypto-key header does not match record',
      {
        status: 403
      }
    )
  }

  if (!stored.auth && !stored.legacyKeys?.auth) {
    await pushToExpo(context, env.EXPO_ACCESS_TOKEN_PUSH, {
      context: {
        expoToken: device,
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
      return new Response('[send] Cannot read body stream', {
        status: 500
      })
    }

    let tempPublic: string
    let tempPrivate: string
    let tempAuth: string
    if (stored.auth) {
      tempPublic = env.KEY_PUBLIC
      tempPrivate = env.KEY_PRIVATE
      tempAuth = stored.auth
    } else if (stored.legacyKeys) {
      tempPublic = stored.legacyKeys.public
      tempPrivate = stored.legacyKeys.private
      tempAuth = stored.legacyKeys.auth
    } else {
      return new Response('[send] No auth key found', { status: 500 })
    }

    const message = await decode({
      body: Buffer.Buffer.concat(bodyStream),
      keys: {
        auth: tempAuth,
        private: tempPrivate,
        public: tempPublic,
        crypto: getCryptoKey[1],
        encryption: getEncryption[1]
      }
    })

    await pushToExpo(context, env.EXPO_ACCESS_TOKEN_PUSH, {
      context: {
        expoToken: device,
        instanceUrl,
        accountId,
        accountFull: stored.accountFull
      },
      details: message
    })
  }
}

export default send
