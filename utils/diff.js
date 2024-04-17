const diff = require('diff')
const { content: Content } = require('../models')

function compareStrings(oldStr, newStr) {
  const diffResult = diff.diffChars(oldStr, newStr)
  let result = ''

  diffResult.forEach((part) => {
    const prefix = part.added ? '+{' : part.removed ? '-{' : ''
    const postfix = part.added || part.removed ? '}' : ''
    result += `${prefix}${part.value}${postfix}`
  })

  return { checksum: diffResult.length - 1, diff: result }
}

async function findAndCompare(url, newContent) {
  const prevContent = await Content.findOne({ url }).sort({ dateField: -1 })
  return compareStrings(prevContent ? prevContent.content : '', newContent)
}

module.exports = { compareStrings, findAndCompare }
