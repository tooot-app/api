import sanitize from 'sanitize-html'
import { Env, TheRequest } from '..'

const sanitizeBody = ({ incoming }: TheRequest, _e: Env) => {
  if (incoming.source) {
    const _source = incoming.source.toLowerCase()
    console.log('_source', _source)
    switch (_source) {
      case 'zh-hans':
        incoming.source = 'zh-cn'
        break
      case 'zh-hant':
        incoming.source = 'zh-tw'
        break
      default:
        incoming.source = incoming.source.slice(0, 2)
        break
    }
  }

  const _target = incoming.target.toLowerCase()
  console.log('_target', _target)
  switch (_target) {
    case 'zh-hans':
      incoming.target = 'zh-cn'
      break
    case 'zh-hant':
      incoming.target = 'zh-tw'
      break
    default:
      incoming.target = incoming.target.slice(0, 2)
      break
  }

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
