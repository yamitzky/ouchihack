const process = require('process')
const express = require('express')
const localtunnel = require('localtunnel')
const googlehome = require('google-home-notifier')
const ps4Waker = require('ps4-waker')
const bodyParser = require('body-parser')
const fs = require('fs')
const axios = require('axios')

const PORT = parseInt(process.env.PORT || 8080)
const SUBDOMAIN = process.env.SUBDOMAIN
const IRKIT_ADDR = process.env.IRKIT_ADDR

googlehome.device('Google Home', 'ja')
const ps4 = new ps4Waker.Device()

app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.get('/', (req, res) => {
  res.send('hello world')
})
app.post('/notification', (req, res) => {
  console.log(req.body)
  googlehome.notify(req.body.title, console.log)
  res.send('')
})
app.post('/irkit', (req, res) => {
  console.log(req.body)
  fs.readFile(`${process.env.HOME}/.irkit.d/signals/${req.body.key}.json`, async (err, data) => {
    if (err) {
      console.log(err)
      res.send('')
      return
    }
    await axios.post(`${IRKIT_ADDR}/messages`, data)
    console.log(`IRKitに${req.body.key}をリクエストしました`)
    res.send('')
  })
})
app.post('/turn_on_ps4', async (req, res) => {
  await ps4.turnOn()
  console.log('PS4を起動しました')
  res.send('')
})
app.post('/turn_off_ps4', async (req, res) => {
  await ps4.turnOff()
  console.log('PS4を終了しました')
  res.send('')
})
app.listen(PORT, () => {
  console.log(`Running at port ${PORT}`)
  const tunnel = localtunnel(PORT, { subdomain: SUBDOMAIN }, (err, tunnel) => {
    if (err) {
      console.error(err)
      res.send('')
      return
    }
    console.log(`Running on ${tunnel.url}`)
  })
})
