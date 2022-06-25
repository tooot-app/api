import { Context, Env } from '..'
import languageName from '../utils/languageName'

// Source https://github.com/vitalets/google-translate-api as wrangler 2 cannot polyfill well

const useGoogle = async (request: Request, env: Env, context: Context) => {
  if (!context.outgoing) {
    const rpcids = 'MkEWBc'

    const baseURL = 'https://translate.google.com'
    const init = await (await fetch(baseURL)).text()

    const extract = (key: string, body: string) => {
      var re = new RegExp(`"${key}":".*?"`)
      var result = re.exec(body)
      if (result !== null) {
        return result[0].replace(`"${key}":"`, '').slice(0, -1)
      }
      return ''
    }
    const searchParams = new URLSearchParams({
      rpcids,
      'source-path': '/',
      'f.sid': extract('FdrFJe', init),
      bl: extract('cfb2h', init),
      hl: 'en-US',
      'soc-app': '1',
      'soc-platform': '1',
      'soc-device': '1',
      _reqid: Math.floor(1000 + Math.random() * 9000).toString(),
      rt: 'c'
    })

    const freq = [
      [
        [
          rpcids,
          JSON.stringify([
            [
              context.incoming.text.join('\n\n'),
              context.incoming.source,
              context.incoming.target,
              false
            ],
            [null]
          ]),
          null,
          'generic'
        ]
      ]
    ]

    let translation = undefined
    try {
      translation = await (
        await fetch(
          `${baseURL}/_/TranslateWebserverUi/data/batchexecute?${searchParams.toString()}`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: 'f.req=' + encodeURIComponent(JSON.stringify(freq)) + '&'
          }
        )
      ).text()
    } catch (error) {
      context.log({
        message: {
          tooot_translate_provider: 'google',
          error_type: 'translate_request_failed',
          error
        },
        succeed: false
      })
      return
    }

    if (!translation) {
      return
    }

    let json = translation.slice(6)
    let length = ''

    const result = {
      text: '',
      from: {
        language: {
          didYouMean: false,
          iso: ''
        },
        text: {
          autoCorrected: false,
          value: '',
          didYouMean: false
        }
      }
    }

    try {
      length = /^\d+/.exec(json)?.[0] || ''
      json = JSON.parse(
        json.slice(length.length, parseInt(length, 10) + length.length)
      )
      json = JSON.parse(json[0][2])
    } catch (error) {
      context.log({
        message: {
          tooot_translate_provider: 'google',
          error_type: 'parse_json_failed',
          error
        },
        succeed: false
      })
      return
    }

    if (json[1][0][0][5] === undefined || json[1][0][0][5] === null) {
      // translation not found, could be a hyperlink or gender-specific translation?
      result.text = json[1][0][0][0]
    } else {
      result.text = json[1][0][0][5]
        // @ts-ignore
        .map(function (obj) {
          return obj[0]
        })
        .filter(Boolean)
        // Google api seems to split text per sentences by <dot><space>
        // So we join text back with spaces.
        // See: https://github.com/vitalets/google-translate-api/issues/73
        .join(' ')
    }

    // From language
    if (json[0] && json[0][1] && json[0][1][1]) {
      result.from.language.didYouMean = true
      result.from.language.iso = json[0][1][1][0]
    } else if (json[1][3] === 'auto') {
      result.from.language.iso = json[2]
    } else {
      result.from.language.iso = json[1][3]
    }

    // Did you mean & autocorrect
    if (json[0] && json[0][1] && json[0][1][0]) {
      var str = json[0][1][0][0][1]

      str = str.replace(/<b>(<i>)?/g, '[')
      str = str.replace(/(<\/i>)?<\/b>/g, ']')

      result.from.text.value = str

      // @ts-ignore
      if (json[0][1][0][2] === 1) {
        result.from.text.autoCorrected = true
      } else {
        result.from.text.didYouMean = true
      }
    }

    context.log({ message: { tooot_translate_provider: 'google' } })

    context.outgoing = {
      provider: 'Google',
      sourceLanguage: languageName({
        source: result.from.language.iso,
        target: context.incoming.target
      }),
      text: [result.text]
    }
  }
}

export default useGoogle
