import sanitize from 'sanitize-html'
import { Env, TheRequest } from '..'

const sanitizeBody = ({ incoming }: TheRequest, _e: Env) => {
  // https://github.com/google/cld3#supported-languages
  // Remove some confusing languages, like new and old Norwegian shown as only `no`
  // Google translate supported `no` as Norwegian
  if (incoming.source) {
    incoming.source = incoming.source.slice(0, 2)
  }

  incoming.target = incoming.target.slice(0, 2)

  incoming.textRaw = [...incoming.text]
  incoming.text = incoming.text.map(t =>
    sanitize(t, {
      allowedTags: ['p', 'br'],
      allowedAttributes: {},
      nonTextTags: ['style', 'script', 'textarea', 'option', 'a'],
      exclusiveFilter: frame => frame.tag !== 'br' && !frame.text.trim()
    }).trim()
  )

  if (!incoming.text.filter(t => t.length > 0)) {
    throw new Error('sanitized_text_empty')
  }

  incoming.textLength = incoming.text.join('').length + 1
}

export default sanitizeBody
