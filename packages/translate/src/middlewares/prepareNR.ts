import { Context, Env } from '..'

const prepareNR = async (_r: Request, env: Env, context: Context) => {
  context.log = ({ message, succeed = true }) => {
    const log = JSON.stringify({
      translation_succeed: succeed,
      incoming_translation: !succeed
        ? context.incoming
        : {
            source: context.incoming.source,
            target: context.incoming.target,
            textLength: context.incoming.textLength
          },
      ...message
    })

    switch (env.ENVIRONMENT) {
      case 'development':
        console.log('logging to NR', log)
        break
      default:
        context.waitUntil(
          fetch('https://log-api.eu.newrelic.com/log/v1', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Api-Key': env.NEW_RELIC_KEY
            },
            body: log
          })
        )
        break
    }
  }
}

export default prepareNR
