import { Context, Env } from '..'
import languageName from '../utils/languageName'

const useIBM = async (_r: Request, env: Env, context: Context) => {
  if (!context.outgoing) {
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
      context.incoming.source &&
      !languages.source.includes(context.incoming.source)
    ) {
      delete context.incoming.source
    }
    if (!languages.target.includes(context.incoming.target)) {
      context.log({
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
            ...(context.incoming.source && { source: context.incoming.source }),
            text: context.incoming.text,
            target: context.incoming.target
          })
        }
      )
    ).json()

    if (translation.code && translation.code === 404) {
      context.log({
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
      context.log({
        message: {
          tooot_translate_provider: 'IBM',
          error_type: 'translation_failed',
          error: JSON.stringify(translation)
        },
        succeed: false
      })
      throw new Error(JSON.stringify(translation))
    }

    context.log({ message: { tooot_translate_provider: 'IBM' } })

    context.outgoing = {
      provider: 'IBM',
      sourceLanguage: languageName({
        source: context.incoming.source || translation.detected_language,
        target: context.incoming.target
      }),
      text: translation.translations.map(t => t.translation)
    }
  }
}

export default useIBM
