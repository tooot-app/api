const crypto = require('crypto')

const keyCurve = crypto.createECDH('prime256v1')
keyCurve.generateKeys()
const publicKey = keyCurve.getPublicKey()
const privateKey = keyCurve.getPrivateKey()
const auth = crypto.randomBytes(16)

console.log('public', publicKey.toString('base64'))
console.log('private', privateKey.toString('base64'))
console.log('auth', auth.toString('base64'))
