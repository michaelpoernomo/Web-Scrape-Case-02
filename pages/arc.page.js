/**
 * @typedef {import('puppeteer').Browser} PuppeteerBrowser
 */

const db = require('../models')
const { getBrowser } = require('../utils/browser')
const advancePage = require('./advance.page')

const { content: Content, job: Job, website: Website } = db

/**
 * @param {Website} website - Website object
 */
module.exports = async (website) => {
  console.log('scraping arc page...')
  const { url } = website

  /**
   * create a new job
   */
  const job = new Job({
    link: [url],
    website: website._id,
  })
  await job.save()

  try {
    /**
     * scraping page
     */
    /** @type {PuppeteerBrowser} */
    const browser = getBrowser()
    const page = await browser.newPage()

    await page.goto(url)
    const documentTitle = await page.title()
    const contentHandles = await page.$$(
      'xpath///*[@id="content"]//div[@class="faq_title"]/../..'
    )
    const links = await page.$$eval(
      'xpath///*[@id="content"]//table//td/a',
      (elements) => elements.map((e) => e.getAttribute('href'))
    )

    const scrapedContent = []
    for (const contentHandle of contentHandles) {
      const faqTitle = await page.evaluate(
        (el) => el.querySelector('.faq_title > div:nth-child(2)').textContent,
        contentHandle
      )
      const heads = await page.evaluate(
        (el) =>
          Object.values(el.querySelectorAll('th')).map((e) => e.textContent),
        contentHandle
      )
      const tables = await page.evaluate(
        (el) =>
          Object.values(el.querySelectorAll('td')).map((e) =>
            e.textContent.trim()
          ),
        contentHandle
      )
      scrapedContent.push({
        title: faqTitle,
        content: heads.reduce(
          (prev, e, idx) => ({ ...prev, [e]: tables[idx] }),
          {}
        ),
      })
    }
    page.close()

    /**
     * scraping links
     */
    const results = await Promise.all(links.map((link) => advancePage(link)))

    /**
     * find any scraping error
     */
    const errorResults = results
      .filter((content) => !content.ok)
      .map(({ url, error }) => ({
        url,
        error,
      }))
    if (!!errorResults.length) {
      throw new Error(JSON.stringify(errorResults))
    }

    /**
     * update DB if no error found
     */
    const parentContent = new Content({
      url,
      title: documentTitle,
      metadata: scrapedContent,
      date: new Date(),
      website: website._id,
    })
    await parentContent.save()
    const insertedContents = await Content.insertMany(
      results.map((result) => ({
        ...result.content,
        parentDocument: parentContent._id,
        website: website._id,
      }))
    )
    await Website.findByIdAndUpdate(website._id, {
      jobs: [...(website.jobs || []), job._id],
      content: [
        ...(website.content || []),
        ...insertedContents.map((e) => e._id),
      ],
    })
    job.status = 'finished'
    job.links = links
    job.endTime = new Date()
    await job.save()
  } catch (err) {
    /**
     * update job
     */
    job.status = 'error'
    job.error = {
      message: err.message,
    }
    await job.save()
  }
}
