import { DurableObjectDevice, Env, HeadersSend, ParamsSend } from '..'
import { Account } from '../durableObjects/device'
import decode from '../utils/decode'
import logToNR from '../utils/logToNR'
import pushToExpo from '../utils/pushToExpo'

const send = async (
  request: Request & DurableObjectDevice & ParamsSend,
  env: Env,
  context: ExecutionContext
): Promise<Response> => {
  if (!request.body) {
    return new Response(JSON.stringify({ error: '[send] Request body empty' }), { status: 400 })
  }

  const headers = Object.fromEntries(request.headers) as HeadersSend

  if (headers['content-encoding'] !== 'aesgcm') {
    return new Response(JSON.stringify({ error: '[send] Encoding error' }), { status: 403 })
  }

  if (!headers['crypto-key']) {
    return new Response(JSON.stringify({ error: '[send] Are you a legit server?' }), {
      status: 403
    })
  }

  const regexServerKey = new RegExp(/dh=.*;p256ecdsa=(.*)/)
  const getServerKey = headers['crypto-key'].match(regexServerKey)
  if (!getServerKey || !getServerKey[1]) {
    return new Response(
      JSON.stringify({ error: '[send] Cannot find serverKey in crypto-key header' }),
      { status: 400 }
    )
  }

  const regexCryptoKey = new RegExp(/dh=(.*);p256ecdsa=/)
  const getCryptoKey = headers['crypto-key'].match(regexCryptoKey)
  if (!getCryptoKey || !getCryptoKey[1]) {
    return new Response(
      JSON.stringify({ error: '[send] Cannot find crypto key in crypto-key header' }),
      { status: 403 }
    )
  }
  const regexEncryption = new RegExp(/salt=(.*)/)
  const getEncryption = headers.encryption.match(regexEncryption)
  if (!getEncryption || !getEncryption[1]) {
    return new Response(JSON.stringify({ error: '[send] Cannot find encryption key in header' }), {
      status: 403
    })
  }

  const resDO = await request.durableObject.fetch(request.clone())
  if (resDO.status !== 200) {
    return resDO
  }
  const stored: { account: Account; badge: number } = await resDO.json()

  if (`${getServerKey[1]}=` !== stored.account.serverKey) {
    return new Response(
      JSON.stringify({ error: '[send] serverKey in crypto-key header does not match record' }),
      { status: 403 }
    )
  }

  if (!stored.account.auth && !stored.account.legacyKeys?.auth) {
    context.waitUntil(
      pushToExpo(
        env.EXPO_ACCESS_TOKEN_PUSH,
        {
          context: {
            ...request.params,
            accountFull: stored.account.accountFull,
            badge: stored.badge
          },
          extra: { decode: false }
        },
        { request, env, context }
      )
    )
  } else {
    let tempPublic: string
    let tempPrivate: string
    let tempAuth: string
    if (stored.account.auth) {
      tempPublic = env.KEY_PUBLIC
      tempPrivate = env.KEY_PRIVATE
      tempAuth = stored.account.auth
    } else if (stored.account.legacyKeys) {
      tempPublic = stored.account.legacyKeys.public
      tempPrivate = stored.account.legacyKeys.private
      tempAuth = stored.account.legacyKeys.auth
    } else {
      context.waitUntil(
        logToNR(env.NEW_RELIC_KEY, {
          tooot_push_log: 'error_no_route',
          workers_type: 'durable_object'
        })
      )
      return new Response(JSON.stringify({ error: '[send] No auth key found' }), { status: 404 })
    }

    const message = await decode({
      body: Buffer.from(await request.arrayBuffer()),
      keys: {
        auth: tempAuth,
        private: tempPrivate,
        public: tempPublic,
        crypto: getCryptoKey[1],
        encryption: getEncryption[1]
      }
    })

    if (env.ENVIRONMENT === 'development') {
      return new Response(JSON.stringify({ ...message, badge: stored.badge }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    context.waitUntil(
      pushToExpo(
        env.EXPO_ACCESS_TOKEN_PUSH,
        {
          context: {
            ...request.params,
            accountFull: stored.account.accountFull,
            badge: stored.badge
          },
          details: message,
          extra: {
            decode: true,
            legacy: !!stored.account.legacyKeys?.auth
          }
        },
        { request, env, context }
      )
    )
  }

  return new Response()
}

export default send
