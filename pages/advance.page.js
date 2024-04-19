const { JSDOM } = require('jsdom')
const { findAndCompare } = require('../utils/diff')

module.exports = async (url) => {
  try {
    /**
     * scraping page
     */
    const dom = await JSDOM.fromURL(url)
    const documentTitle = dom.window.document.querySelector('title').textContent
    const scrapedContent = dom.window.document
      .querySelector('#content')
      .textContent.trim()
    const reviewDate = dom.window.document.documentElement.querySelector(
      'footer #lastUpdatedDate'
    ).value

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
    console.log('error: ', err)
    return {
      ok: false,
      url,
      error: err.message,
    }
  }
}
