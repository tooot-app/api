import sanitize from 'sanitize-html'
import { Env, TheRequest } from '..'

const sanitizeBody = ({ incoming }: TheRequest, _e: Env) => {
  if (incoming.source) {
    const _source = incoming.source.toLowerCase()
    incoming.source = incoming.source.slice(0, 2)
    if (_source.startsWith('zh-hans')) {
      incoming.source = 'zh-cn'
    }
    if (_source.startsWith('zh-hant')) {
      incoming.source = 'zh-tw'
    }
  }

  const _target = incoming.target.toLowerCase()
  incoming.target = incoming.target.slice(0, 2)
  if (_target.startsWith('zh-hans')) {
    incoming.target = 'zh-cn'
  }
  if (_target.startsWith('zh-hant')) {
    incoming.target = 'zh-tw'
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
