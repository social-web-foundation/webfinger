const assert = require('node:assert/strict')
const { before, after } = require('node:test')
const nock = require('nock')

const unexpectedRequests = []

function recordUnexpected (request) {
  unexpectedRequests.push(`${request.method || 'GET'} ${request.path || request.href || request.url || ''}`)
}

function useNock () {
  before(function () {
    nock.disableNetConnect()
    nock.emitter.on('no match', recordUnexpected)
  })

  after(function () {
    try {
      assert.deepEqual(unexpectedRequests, [], 'Unexpected HTTP requests')
      assert.deepEqual(nock.pendingMocks(), [], 'Expected HTTP requests were not made')
    } finally {
      nock.abortPendingRequests()
      nock.cleanAll()
      nock.emitter.removeListener('no match', recordUnexpected)
      nock.enableNetConnect()
      unexpectedRequests.length = 0
    }
  })
}

module.exports = { useNock }
