import { Env, TheRequest } from '..'
import languageName from '../utils/languageName'

const useDeepL = async (request: TheRequest, env: Env) => {
  if (!request.outgoing) {
    const params = new URLSearchParams()
    params.append('target_lang', request.incoming.target)
    for (const t of request.incoming.text) {
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

    request.outgoing = {
      provider: 'DeepL',
      sourceLanguage: languageName({
        source:
          request.incoming.source ||
          translation.translations[0].detected_source_language,
        target: request.incoming.target
      }),
      text: translation.translations.map(t => t.text)
    }
  }
}

export default useDeepL
