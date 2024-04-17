const db = require('./models')
const Website = db.website

;(async () => {
  await db.mongoose.connect(db.url)
  await Website.findOneAndUpdate(
    { name: 'arc' },
    {
      name: 'arc',
      url: 'https://www.ird.gov.hk/eng/ppr/arc.htm',
    },
    { upsert: true }
  )

  db.mongoose.disconnect()
})()
