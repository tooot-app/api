import { Env } from '.'
import languageName from './languageName'

const useDeepL = async ({
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
  const params = new URLSearchParams()
  params.append('auth_key', env.DEEPL_KEY)
  params.append('target_lang', target)
  for (const t of text) {
    params.append('text', t)
  }
  params.append('tag_handling', 'xml')

  const translation: {
    translations: { detected_source_language: string; text: string }[]
  } = await (
    await fetch('https://api-free.deepl.com/v2/translate?' + params.toString())
  ).json()

  return {
    provider: 'DeepL',
    sourceLanguage: languageName({
      source: source || translation.translations[0].detected_source_language,
      target
    }),
    text: translation.translations.map(t => t.text)
  }
}

export default useDeepL
