import { Env, NewRequest } from '..'
import languageName from '../utils/languageName'

const useIBM = async (
  request: NewRequest,
  env: Env
): Promise<Response | void> => {
  if (!request.translation) {
    let languages: {
      source: string[]
      target: string[]
    } | null = await env.LANGUAGES.get('IBM', {
      type: 'json'
    })
    if (!languages) {
      const availableLanguages: {
        languages: {
          language: string
          language_name: string
          native_language_name: string
          country_code: string
          words_separated: boolean
          direction: 'left_to_right' | 'right_to_left'
          supported_as_source: boolean
          supported_as_target: boolean
          identifiable: boolean
        }[]
      } = await (
        await fetch(
          'https://api.eu-de.language-translator.watson.cloud.ibm.com/v3/languages?version=2018-05-01',
          {
            headers: {
              Authorization: `Basic ${btoa(`apikey:${env.IBM_KEY}`)}`,
              'Content-Type': 'application/json'
            }
          }
        )
      ).json()
      languages = {
        source: availableLanguages.languages
          .filter(lang => lang.supported_as_source)
          .map(lang => lang.language.slice(0, 2)),
        target: availableLanguages.languages
          .filter(lang => lang.supported_as_target)
          .map(lang => lang.language.slice(0, 2))
      }
      await env.LANGUAGES.put('IBM', JSON.stringify(languages), {
        expirationTtl: 60 * 60 * 24 * 30
      })
    }

    if (
      request.bodyJson.source &&
      !languages.source.includes(request.bodyJson.source)
    ) {
      delete request.bodyJson.source
    }
    if (!languages.target.includes(request.bodyJson.target)) {
      return new Response(JSON.stringify({ error: 'target_not_supported' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const translation: {
      code?: number
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

    if (translation.code && translation.code === 404) {
      return new Response(JSON.stringify({ error: 'source_not_supported' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    if (!translation.translations || !Array.isArray(translation.translations)) {
      throw new Error(JSON.stringify(translation))
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
