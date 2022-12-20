import { IRequest } from 'itty-router'
import { Env } from '..'

const prepareNR = async (request: IRequest, env: Env, context: ExecutionContext) => {
  request.log = ({ message, succeed = true }: { message: Object; succeed?: boolean }) => {
    const log = JSON.stringify({
      translation_succeed: succeed,
      incoming_translation: !succeed
        ? request.incoming
        : {
            source: request.incoming.source,
            target: request.incoming.target,
            textLength: request.incoming.textLength
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
          }).then(() => {})
        )
        break
    }
  }
}

export default prepareNR
