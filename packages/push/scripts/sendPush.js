const webpush = require('web-push')

webpush.setVapidDetails(
  'mailto:test@example.com',
  'BAEBLiba6Y3LYvNXaAd0K_K9fpLFwJ-TH2z7AiIhdHFydUx6HmIONYloTFLbGIG7tJfU1W01JTQuduuAhe-aGTY',
  'OQCuLAUk4fwCiZSxEplH1nbnHWmRyxH30hUsjc3tylY'
)

const pushSubscription = {
  endpoint:
    'https://localhost:8787/push/send/ExponentPushToken[TEST-1]/instance-1/1',
  keys: {
    auth: 'BTBZMqHH6r4Tts7J_aSIgg',
    p256dh:
      'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'
  }
}

const payload = JSON.stringify({ Hello: 'World !' })

const options = { contentEncoding: 'aesgcm' }

console.log('--- sending push ---')
const details = webpush.generateRequestDetails(
  pushSubscription,
  payload,
  options
)
console.log('--- details ---')
console.log(details)
webpush.sendNotification(pushSubscription, payload, options).then(res => {
  console.log('--- response ---')
  console.log(res)
})
