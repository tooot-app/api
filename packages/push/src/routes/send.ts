import Buffer from 'buffer/'
import { DurableObjectDevice, Env, HeadersSend, ParamsSend } from '..'
import { Account } from '../durableObjects/device'
import decode from '../utils/decode'
import pushToExpo from '../utils/pushToExpo'

const send = async (
  request: Request & DurableObjectDevice & ParamsSend,
  env: Env,
  context: ExecutionContext
): Promise<Response> => {
  if (!request.body) {
    return new Response('[send] Request body empty', { status: 400 })
  }

  const headers = Object.fromEntries(request.headers) as HeadersSend

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

  const resDO = await request.durableObject.fetch(request.clone())
  if (resDO.status !== 200) {
    return resDO
  }
  const stored: Account = await resDO.json()

  if (`${getServerKey[1]}=` !== stored.serverKey) {
    return new Response(
      '[send] serverKey in crypto-key header does not match record',
      {
        status: 403
      }
    )
  }

  if (!stored.auth && !stored.legacyKeys?.auth) {
    context.waitUntil(
      pushToExpo(env.EXPO_ACCESS_TOKEN_PUSH, {
        context: {
          ...request.params,
          accountFull: stored.accountFull
        }
      })
    )
  } else {
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
      return new Response('[send] No auth key found', { status: 404 })
    }

    if (env.ENVIRONMENT !== 'release') {
      const message = await decode({
        body: Buffer.Buffer.from(
          'pTTuh1jT8KJ4zaGwIWjg417KTDzh+eIVe472nMgett3XyhoM5pAz8Yu2RPBXJHE/AojoMA1g+/uzbByu3d1/AygBh99qJ6Xtjya+XBSYoVrNJqT7vq0cKU9bZ8NrEepnaZUc2HjFUDDXNyHi2xBtJnMk/hSZTzyaiCQS2KssGAwixgdK/dTP8Yg+Pul3tgOQvq5CbYFd7iwBQntVv80vO8X+5hyIglA21+6/2fq5lCZSMri5K9/WbSb6erLkxO//A92KjZTnuufE4pUwtIdYW1bFnw5xu6ozjsCsDLbQTSo+JmghOzc/iYx5hG+y5YViC1UXue4eKKlmjbVDRLH6WkEEIKH2cwd4Gf9ewhYwhH7oKKIc4tjvRunq2gtBirQgRYJahgfwykdYA44iyogBc1rFZPGbxr1ph4RxVhdBmIZ+yMN6GQSiDCS+8jKGsc5xnjxrSXXdFva1a2xc1lpiReypZlTTXFmF16Cf+Z6B0UvFTa2AcqEDD0BBlhhbMBoG7n4CRjr5ObE2lG5PBg+gqitx/O1S+X8a4N78L+eK1upEVM+HRQAdCmiqDNJF0/N/VWSMrNCl7HNgnhmYU9Z1aYepiEioz1Tu14UzY/2NOx5z4h4szyJW8s/diAyOhnh+RBRM3QLHtygpLZ3i7o6vVUc=',
          'base64'
        ),
        keys: {
          auth: tempAuth,
          private: tempPrivate,
          public: tempPublic,
          crypto: getCryptoKey[1],
          encryption: getEncryption[1]
        }
      })
      context.waitUntil(
        (async () => {
          await new Promise(() =>
            setTimeout(() => console.log('This is being waited on'), 2000)
          )
        })()
      )
      return new Response(JSON.stringify(message), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
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
        status: 400
      })
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

    context.waitUntil(
      pushToExpo(env.EXPO_ACCESS_TOKEN_PUSH, {
        context: {
          ...request.params,
          accountFull: stored.accountFull
        },
        details: message
      })
    )
  }

  return new Response()
}

export default send
