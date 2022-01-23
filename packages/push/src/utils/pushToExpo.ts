export type Message = {
  context: {
    expoToken: string
    instanceUrl: string
    accountId: string
    accountFull: string
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
}

const pushToExpo = async (token: string, message: Message) => {
  let toPush

  if (message.details) {
    toPush = {
      to: message.context.expoToken,
      sound: 'default',
      badge: 1,
      title: message.details.title,
      subtitle: message.context.accountFull,
      body: message.details.body,
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
      badge: 1,
      title: message.context.accountFull,
      body: '🔔',
      data: {
        instanceUrl: message.context.instanceUrl,
        accountId: message.context.accountId,
        expoToken: message.context.expoToken
      },
      channelId: `${message.context.accountFull}_default`
    }
  }

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
}

export default pushToExpo
