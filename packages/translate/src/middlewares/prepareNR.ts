import { Env, TheRequest } from '..'

const prepareNR = async (
  request: TheRequest,
  env: Env,
  context: ExecutionContext
) => {
  request.log = ({ message, succeed = true }) => {
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
          })
        )
        break
    }
  }
}

export default prepareNR
