import { IRequest } from 'itty-router'
import { Env, WithIncoming } from '..'
import languageName from '../utils/languageName'

const useIBM = async (request: WithIncoming & IRequest, env: Env) => {
  if (!request.incoming) throw new Error('Incoming missing')

  if (!request.outgoing) {
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
          .map(lang => lang.language),
        target: availableLanguages.languages
          .filter(lang => lang.supported_as_target)
          .map(lang => lang.language)
      }
      await env.LANGUAGES.put('IBM', JSON.stringify(languages), {
        expirationTtl: 60 * 60 * 24 * 30
      })
    }

    if (request.incoming.source && !languages.source.includes(request.incoming.source)) {
      delete request.incoming.source
    }
    if (request.incoming.target !== 'zh' && !languages.target.includes(request.incoming.target)) {
      request.log({
        message: {
          tooot_translate_provider: 'IBM',
          error_type: 'target_not_supported'
        },
        succeed: false
      })
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
            ...(request.incoming.source && { source: request.incoming.source }),
            text: request.incoming.text,
            target: request.incoming.target
          })
        }
      )
    ).json()

    if (translation.code && translation.code === 404) {
      request.log({
        message: {
          tooot_translate_provider: 'IBM',
          error_type: 'source_not_supported'
        },
        succeed: false
      })
      return new Response(JSON.stringify({ error: 'source_not_supported' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    if (!translation.translations || !Array.isArray(translation.translations)) {
      request.log({
        message: {
          tooot_translate_provider: 'IBM',
          error_type: 'translation_failed',
          error: JSON.stringify(translation)
        },
        succeed: false
      })
      throw new Error(JSON.stringify(translation))
    }

    request.log({ message: { tooot_translate_provider: 'IBM' } })

    request.outgoing = {
      provider: 'IBM',
      sourceLanguage: languageName({
        source: request.incoming.source || translation.detected_language,
        target: request.incoming.target
      }),
      text: translation.translations.map(t => t.translation)
    }
  }
}

export default useIBM
