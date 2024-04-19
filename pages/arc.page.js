const db = require('../models')
const advancePage = require('./advance.page')
const { JSDOM } = require('jsdom')

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
    const scrapedContent = []
    const dom = await JSDOM.fromURL(url)
    const documentTitle = dom.window.document.querySelector('title').textContent
    const contentHandles = dom.window.document.querySelectorAll(
      '#content .faq_title'
    )
    const links = Object.values(
      dom.window.document.querySelectorAll('#content table td a')
    ).map((e) => e.href)
    contentHandles.forEach((contentHandle) => {
      const parentElement = contentHandle.parentNode.parentNode
      const faqTitle =
        contentHandle.querySelector('div:nth-child(2)').textContent
      const tables = Object.values(parentElement.querySelectorAll('td')).map(
        (e) => e.textContent.trim()
      )
      scrapedContent.push({
        title: faqTitle,
        content: tables
          .slice(0, 3)
          .reduce(
            (prev, e, idx) => ({ ...prev, [e]: tables.slice(3)[idx] }),
            {}
          ),
      })
    })

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
