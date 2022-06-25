import { Context, Env } from '..'
import languageName from '../utils/languageName'

const useDeepL = async (request: Request, env: Env, context: Context) => {
  if (!context.outgoing) {
    const params = new URLSearchParams()
    params.append('target_lang', context.incoming.target)
    for (const t of context.incoming.text) {
      params.append('text', t)
    }
    params.append('tag_handling', 'xml')

    const translation: {
      translations: { detected_source_language: string; text: string }[]
    } = await (
      await fetch(
        'https://api-free.deepl.com/v2/translate?' + params.toString(),
        {
          headers: {
            Authorization: `DeepL-Auth-Key ${env.DEEPL_KEY}`
          }
        }
      )
    ).json()

    context.outgoing = {
      provider: 'DeepL',
      sourceLanguage: languageName({
        source:
          context.incoming.source ||
          translation.translations[0].detected_source_language,
        target: context.incoming.target
      }),
      text: translation.translations.map(t => t.text)
    }
  }
}

export default useDeepL
