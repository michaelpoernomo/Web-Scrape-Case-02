const puppeteer = require('puppeteer')

let browser

const initializeBrowser = async () => {
  browser = await puppeteer.launch()
  return browser
}

const getBrowser = () => {
  if (!browser) {
    throw new Error('Browser not initialized')
  }
  return browser
}

module.exports = { initializeBrowser, getBrowser }
