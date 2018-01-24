const fs = require('fs')
const googlehome = require('google-home-notifier')
const axios = require('axios')
const ps4Waker = require('ps4-waker')

const IRKIT_ADDR = process.env.IRKIT_ADDR

googlehome.device('Google Home', 'ja')
const ps4 = new ps4Waker.Device()

module.exports = (robot) => {
  robot.respond('ping', (res) => {
    res.send('pong')
  })

  robot.hear(/say (.*)/i, (res) => {
    const msg = res.match[1]
    res.send(`Googleホームで「${msg}」と読み上げます`)
    googlehome.notify(msg, console.log)
  })

  robot.hear(/irkit (.*)/i, (res) => {
    const key = res.match[1]
    fs.readFile(`${process.env.HOME}/.irkit.d/signals/${key}.json`, async (err, data) => {
      if (err) {
        console.log(err)
        res.send(`${err}`)
        return
      }
      try {
        await axios.post(`${IRKIT_ADDR}/messages`, data)
        console.log(`IRKitに${req.body.key}をリクエストしました`)
        res.send(`IRKitで ${key} を実行しました`)
      } catch (e) {
        res.send(`${e}`)
      }
    })
  })

  robot.hear(/turn on ps4/i, async (res) => {
    try {
      await ps4.turnOn()
      res.send('PS4を起動しました')
    } catch (e) {
      res.send(`${e}`)
    }
  })

  robot.hear(/turn off ps4/i, async (res) => {
    try {
      await ps4.turnOff()
      res.send('PS4を終了しました')
    } catch (e) {
      res.send(`${e}`)
    }
  })
}
