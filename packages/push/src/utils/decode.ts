// @ts-ignore
import createECDH from 'create-ecdh'
import { Buffer } from 'node:buffer'

export type DecodeData = {
  body: Buffer
  keys: {
    auth: string
    public: string
    private: string
    crypto: string
    encryption: string
  }
}

const hkdf = async (
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  keylen: number
): Promise<Uint8Array> => {
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info
      },
      await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']),
      keylen << 3
    )
  )
}

function createInfo(type: 'aesgcm' | 'nonce', clientPublicKey: Buffer, serverPublicKey: Buffer) {
  const len = type.length

  const info = Buffer.alloc(18 + len + 1 + 5 + 1 + 2 + 65 + 2 + 65)

  info.write('Content-Encoding: ')
  info.write(type, 18)
  info.write('\0', 18 + len)
  info.write('P-256', 19 + len)
  info.write('\0', 24 + len)
  info.writeUInt16BE(clientPublicKey.byteLength, 25 + len)
  clientPublicKey.copy(info, 27 + len)
  info.writeUInt16BE(serverPublicKey.byteLength, 92 + len)
  serverPublicKey.copy(info, 94 + len)

  return info
}

const decode = async ({
  body,
  keys
}: DecodeData): Promise<{
  access_token: string
  preferred_locale: string
  notification_id: number
  notification_type: 'follow' | 'favourite' | 'reblog' | 'mention' | 'poll'
  icon: string
  title: string
  body: string
}> => {
  const decodeAuth = Buffer.from(keys.auth, 'base64')
  const decodePublic = Buffer.from(keys.public, 'base64')
  const decodePrivate = Buffer.from(keys.private, 'base64')

  const salt = Buffer.from(keys.encryption, 'base64')
  const cryptoKey = Buffer.from(keys.crypto, 'base64')

  const receiver_curve = createECDH('prime256v1')
  receiver_curve.setPrivateKey(decodePrivate)
  const sharedSecret = receiver_curve.computeSecret(cryptoKey)

  const authInfo = Buffer.from('Content-Encoding: auth\0', 'utf8')
  const prk = await hkdf(sharedSecret, decodeAuth, authInfo, 32)

  const contentEncryptionKeyInfo = createInfo('aesgcm', decodePublic, cryptoKey)
  const contentEncryptionKey = await hkdf(prk, salt, contentEncryptionKeyInfo, 16)

  const nonceInfo = createInfo('nonce', decodePublic, cryptoKey)
  const nonce = await hkdf(prk, salt, nonceInfo, 12)

  const aesKey = await crypto.subtle.importKey('raw', contentEncryptionKey, 'AES-GCM', true, [
    'encrypt',
    'decrypt'
  ])

  var result: ArrayBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    body
  )

  return JSON.parse(Buffer.from(result).toString('utf-8').substring(2))
}

export default decode
