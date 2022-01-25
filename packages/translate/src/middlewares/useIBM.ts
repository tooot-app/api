import { Env, NewRequest } from '..'
import languageName from '../utils/languageName'

const useIBM = async (request: NewRequest, env: Env) => {
  if (!request.translation) {
    const translation: {
      detected_language?: string
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
          body: JSON.stringify({
            ...(request.bodyJson.source && { source: request.bodyJson.source }),
            text: request.bodyJson.text,
            target: request.bodyJson.target
          })
        }
      )
    ).json()

    if (!translation.translations || !Array.isArray(translation.translations)) {
      throw new Error(translation.toString())
    }

    request.translation = {
      provider: 'IBM',
      sourceLanguage: languageName({
        source: request.bodyJson.source || translation.detected_language,
        target: request.bodyJson.target
      }),
      text: translation.translations.map(t => t.translation)
    }
  }
}

export default useIBM
