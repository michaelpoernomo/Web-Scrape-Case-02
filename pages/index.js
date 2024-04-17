const PAGE = {
  ARC: 'arc',
  ADVANCE: 'advance',
}

const pages = {
  [PAGE.ARC]: require('./arc.page'),
  [PAGE.ADVANCE]: require('./advance.page'),
}

module.exports = { pages, PAGE }
