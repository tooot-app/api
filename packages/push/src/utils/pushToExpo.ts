import { DurableObjectDevice, Env } from '..'
import logToNR from './logToNR'
import sentryCapture from './sentryCapture'

export type Message = {
  context: {
    expoToken: string
    instanceUrl: string
    accountId: string
    accountFull: string
    badge: number
  }
  details?: {
    access_token: string
    preferred_locale: string
    notification_id: number
    notification_type: 'follow' | 'favourite' | 'reblog' | 'mention' | 'poll'
    icon: string
    title: string
    body: string
  }
  extra: {
    decode: boolean
    legacy?: boolean
  }
}

const pushToExpo = async (
  token: string,
  message: Message,
  workers: {
    request: Request & DurableObjectDevice
    env: Env
    context: Pick<ExecutionContext, 'waitUntil'>
  }
): Promise<any> => {
  let toPush

  if (message.details) {
    toPush = {
      to: message.context.expoToken,
      sound: 'default',
      title: message.details.title,
      subtitle: message.context.accountFull,
      body: message.details.body,
      badge: message.context.badge,
      data: {
        instanceUrl: message.context.instanceUrl,
        accountId: message.context.accountId,
        notification_id: message.details.notification_id,
        expoToken: message.context.expoToken
      },
      categoryId: message.details.notification_type,
      channelId: `${message.context.accountFull}_${message.details.notification_type}`
    }
  } else {
    toPush = {
      to: message.context.expoToken,
      sound: 'default',
      title: message.context.accountFull,
      body: '🔔',
      badge: message.context.badge,
      data: {
        instanceUrl: message.context.instanceUrl,
        accountId: message.context.accountId,
        expoToken: message.context.expoToken
      },
      channelId: `${message.context.accountFull}_default`
    }
  }

  if (workers.env.ENVIRONMENT !== 'development') {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        host: 'exp.host',
        accept: 'application/json',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json'
      },
      body: JSON.stringify(toPush)
    })
      .then(async res => {
        const body: {
          data:
            | { status: 'ok'; id: string }
            | {
                status: 'error'
                message: string
                details: { error: string; fault: string }
              }
        } = await res.json()

        await logToNR(workers.env.NEW_RELIC_KEY, {
          tooot_push_type: message.details?.notification_type,
          expoToken: message.context.expoToken,
          instanceUrl: message.context.instanceUrl,
          push_decode: message.extra.decode,
          push_legacy: message.extra.legacy,
          ...body
        })

        if (body.data?.status === 'error') {
          await workers.request.durableObject.fetch(
            `${new URL(workers.request.url).origin}/push/do/count-error`,
            {
              method: 'PUT'
            }
          )
        }

        if (res.status !== 200) {
          const sentry = sentryCapture('expo - push ticket', workers)
          sentry.setExtras(body)
          sentry.captureException(res)
        }
      })
      .catch(err => {
        const sentry = sentryCapture('expo - error', workers)
        sentry.captureException(err)
      })
  }
}

export default pushToExpo
