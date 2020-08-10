const fs = require('fs')
const googlehome = require('google-home-notifier')
const axios = require('axios')
const ps4Waker = require('ps4-waker')

const IRKIT_ADDR = process.env.IRKIT_ADDR
const GOOGLE_HOME_IP = process.env.GOOGLE_HOME_IP

googlehome.device('Google Home', 'ja')
if (GOOGLE_HOME_IP) {
  googlehome.ip(GOOGLE_HOME_IP, 'ja')
}
const ps4 = new ps4Waker.Device()

module.exports = async (robot) => {
  robot.respond('ping', (res) => {
    res.send('pong')
  })

  robot.hear(/say (.*)/i, (res) => {
    const msg = res.match[1]
    res.send(`Googleホームで「${msg}」と読み上げます`)
    googlehome.notify(msg, console.log)
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

  const { data: appliances } = await axios.get('https://api.nature.global/1/appliances', {
    headers: {
      Authorization: `Bearer ${process.env.NATURE_REMO_TOKEN}`
    }})
  for (const app of appliances) {
    if (app.aircon) {
      robot.hear(/(冷房|暖房)[ 　]([\d０-９]+)/i, async (res) => {
        try {
          let [_, mode, temp] = res.match
          mode = {'冷房': 'cool', '暖房': 'warm'}[mode]
          temp = temp.normalize('NFKC')
          const { data: { temp: setTemp } } = await axios.post(`https://api.nature.global/1/appliances/${app.id}/aircon_settings`, `temperature=${temp}&operation_mode=${mode}`, {
            headers: {
              Authorization: `Bearer ${process.env.NATURE_REMO_TOKEN}`
            }})
          res.send(`エアコンを${setTemp}度に設定しました`)
        } catch (e) {
          res.send(`${e}`)
        }
      })
      robot.hear(/(?:エアコン|冷房|暖房)[ 　のを-](?:オフ|停止)/i, async (res) => {
        try {
          const { data: { button } } = await axios.post(`https://api.nature.global/1/appliances/${app.id}/aircon_settings`, 'button=power-off', {
            headers: {
              Authorization: `Bearer ${process.env.NATURE_REMO_TOKEN}`
            }})
          res.send(`エアコンをオフにしました(${button})`)
        } catch (e) {
          res.send(`${e}`)
        }
      })
    } else {
      for (const sig of app.signals) {
        robot.hear(new RegExp(`${app.nickname}[ 　のを-]${sig.name}`, 'i'), async (res) => {
          try {
            await axios.post(`https://api.nature.global/1/signals/${sig.id}/send`, null, {
              headers: {
                Authorization: `Bearer ${process.env.NATURE_REMO_TOKEN}`
              }})
            res.send(`${app.nickname}-${sig.name} のリモコン操作をしました`)
          } catch (e) {
            res.send(`${e}`)
          }
        })
      }
    }
  }
}
