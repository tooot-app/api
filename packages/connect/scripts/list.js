const fs = require('fs')

const list = Array.from({ length: 100 }, () => (Math.random() + 1).toString(36).substring(2))

fs.writeFile(__dirname + '/list.json', JSON.stringify(list), { flag: 'wx' }, err => {
  if (err) {
    console.error(err)
  }
})
