const assert = require('node:assert/strict')
const dns = require('node:dns')
const { before, after, mock } = require('node:test')
const nock = require('nock')

const unexpectedRequests = []

function recordUnexpected (request) {
  unexpectedRequests.push(`${request.method || 'GET'} ${request.path || request.href || request.url || ''}`)
}

function forbid (scope) {
  scope.on('request', recordUnexpected)
  return scope
}

function useNock () {
  let lookup

  before(function () {
    nock.disableNetConnect()
    nock.emitter.on('no match', recordUnexpected)
    lookup = mock.method(dns, 'lookup', function (hostname, options, callback) {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }
      assert.equal(hostname, 'localhost')
      process.nextTick(function () {
        if (options && options.all) callback(null, [{ address: '127.0.0.1', family: 4 }])
        else callback(null, '127.0.0.1', 4)
      })
    })
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
      if (lookup) lookup.mock.restore()
      unexpectedRequests.length = 0
    }
  })
}

module.exports = { useNock, forbid }
