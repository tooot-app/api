import { Env, NewRequest } from '..'
import languageName from '../utils/languageName'

const useDeepL = async (request: NewRequest, env: Env) => {
  if (!request.translation) {
    const params = new URLSearchParams()
    params.append('target_lang', request.bodyJson.target)
    for (const t of request.bodyJson.text) {
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

    request.translation = {
      provider: 'DeepL',
      sourceLanguage: languageName({
        source:
          request.bodyJson.source ||
          translation.translations[0].detected_source_language,
        target: request.bodyJson.target
      }),
      text: translation.translations.map(t => t.text)
    }
  }
}

export default useDeepL
