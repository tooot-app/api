import { Env } from '.'
import languageName from './languageName'

const useIBM = async ({
  env,
  source,
  target,
  text
}: {
  env: Env
  source?: string
  target: string
  text: string[]
}) => {
  const translation: {
    detected_language: string
    translations: { translation: string }[]
  } = await (
    await fetch(
      'https://api.eu-de.language-translator.watson.cloud.ibm.com/v3/translate?version=2018-05-01',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`apikey:${env.IBM_KEY}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...(source && { source }), text, target })
      }
    )
  ).json()

  return {
    provider: 'IBM',
    sourceLanguage: languageName({
      source: source || translation.detected_language,
      target
    }),
    text: translation.translations.map(t => t.translation)
  }
}

export default useIBM
