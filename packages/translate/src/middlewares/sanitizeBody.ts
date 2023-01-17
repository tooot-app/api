import { IRequest } from 'itty-router'
import { Env, WithIncoming } from '..'

const sanitizeBody = ({ incoming }: WithIncoming & IRequest, _e: Env) => {
  if (!incoming) throw new Error('Incoming missing')

  if (incoming.source) {
    const _source = incoming.source.toLowerCase()
    if (_source.startsWith('zh-hans')) {
      incoming.source = 'zh-cn'
    } else if (_source.startsWith('zh-hant')) {
      incoming.source = 'zh-tw'
    } else {
      incoming.source = incoming.source.slice(0, 2)
    }
  }

  const _target = incoming.target.toLowerCase()
  if (_target.startsWith('zh-hans')) {
    incoming.target = 'zh-cn'
  } else if (_target.startsWith('zh-hant')) {
    incoming.target = 'zh-tw'
  } else {
    incoming.target = incoming.target.slice(0, 2)
  }

  if (!incoming.text.filter(t => t.length > 0)) {
    throw new Error('Text length empty')
  }

  incoming.textLength = incoming.text.join('').length + 1
}

export default sanitizeBody
