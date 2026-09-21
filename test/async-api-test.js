const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const nock = require('nock')
const wf = require('../lib/webfinger')
const { useNock } = require('./helpers/nock')

describe('Promise API', function () {
  useNock()

  it('resolves XRD conversion to a JRD', async function () {
    const result = wf.xrd2jrd('<XRD><Subject>acct:alice@localhost</Subject></XRD>')
    assert.ok(result instanceof Promise)
    assert.deepEqual(await result, { subject: 'acct:alice@localhost' })
  })

  it('rejects malformed XRD', async function () {
    await assert.rejects(wf.xrd2jrd('<XRD><Subject></XRD>'))
  })

  it('resolves discovery of a hostname', async function () {
    const document = { links: [] }
    nock('https://127.0.0.1')
      .get('/.well-known/host-meta.json')
      .reply(200, document)

    assert.deepEqual(await wf.discover('localhost'), document)
  })

  it('resolves discovery of an account', async function () {
    const document = { subject: 'acct:alice@localhost', links: [] }
    nock('https://localhost')
      .get('/.well-known/webfinger')
      .query({ resource: 'acct:alice@localhost' })
      .reply(200, document)

    assert.deepEqual(await wf.discover('alice@localhost'), document)
  })
})
