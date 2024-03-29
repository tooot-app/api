const logToNR = async (key: string, message: Object) => {
  console.log('NR', message)
  await fetch('https://log-api.eu.newrelic.com/log/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': key
    },
    body: JSON.stringify({ message })
  })
}

export default logToNR
