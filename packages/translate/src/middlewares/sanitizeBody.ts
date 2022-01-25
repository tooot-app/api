import sanitize from 'sanitize-html'
import { NewRequest } from '..'

const sanitizeBody = ({ bodyJson }: NewRequest) => {
  // https://github.com/google/cld3#supported-languages
  // Remove some confusing languages, like new and old Norwegian shown as only `no`
  if (bodyJson.source) {
    switch (bodyJson.source) {
      case 'no':
        bodyJson.source = undefined
        break
      default:
        bodyJson.source = bodyJson.source.slice(0, 2)
        break
    }
  }
  if (bodyJson.target) {
    bodyJson.target = bodyJson.target.slice(0, 2)
  }

  bodyJson.text = bodyJson.text.map(t =>
    sanitize(t, {
      allowedTags: ['p', 'br'],
      allowedAttributes: {},
      nonTextTags: ['style', 'script', 'textarea', 'option', 'a'],
      exclusiveFilter: frame => frame.tag !== 'br' && !frame.text.trim()
    }).trim()
  )
}

export default sanitizeBody
