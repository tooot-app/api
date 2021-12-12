import sanitize from 'sanitize-html'
import { BodyContent } from '.'

const sanitizeBody = (body: BodyContent): BodyContent => {
  // https://github.com/google/cld3#supported-languages
  // Remove some confusing languages, like new and old Norwegian shown as only `no`
  if (body.source) {
    switch (body.source) {
      case 'no':
        body.source = undefined
        break
      default:
        body.source = body.source?.slice(0, 2)
        break
    }
  }

  body.text = body.text.map(t =>
    sanitize(t, {
      allowedTags: ['p', 'br'],
      allowedAttributes: {},
      nonTextTags: ['style', 'script', 'textarea', 'option', 'a'],
      exclusiveFilter: frame => frame.tag !== 'br' && !frame.text.trim()
    }).trim()
  )

  return body
}

export default sanitizeBody
