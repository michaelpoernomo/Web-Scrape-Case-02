/**
 * @typedef {import('puppeteer').Browser} PuppeteerBrowser
 */

const { getBrowser } = require('../utils/browser')
const { findAndCompare } = require('../utils/diff')

module.exports = async (url) => {
  try {
    /**
     * scraping page
     */
    /** @type {PuppeteerBrowser} */
    const browser = getBrowser()
    const page = await browser.newPage()

    await page.goto(url)
    const documentTitle = await page.title()

    const scrapedContent = await page.$eval('xpath///*[@id="content"]', (el) =>
      el.textContent.trim()
    )
    const reviewDate = await page.$eval(
      'xpath///footer//div[@class="footer-message"]/div[@class="date-message"]/span',
      (el) => el.textContent.trim()
    )
    page.close()

    /**
     * compare
     */
    const comparison = await findAndCompare(url, scrapedContent)

    const content = {
      url,
      title: documentTitle,
      metadata: {
        reviewDate,
        diff: !comparison.checksum ? '' : comparison.diff,
      },
      content: scrapedContent,
      date: new Date(),
      checksum: comparison.checksum,
    }

    return {
      ok: true,
      content,
    }
  } catch (err) {
    return {
      ok: false,
      url,
      error: err.message,
    }
  }
}
