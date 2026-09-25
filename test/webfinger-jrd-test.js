const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const nock = require('nock')
const wf = require('../lib/webfinger')
const { useNock } = require('./helpers/nock')

describe('WebFinger JRD media type', function () {
  useNock()

  it('accepts an endpoint that returns only application/jrd+json', async function () {
    const resource = 'https://foo.example/profile/user1'
    const document = {
      subject: resource,
      links: [{ rel: 'profile', href: resource }]
    }

    nock('https://foo.example')
      .get('/.well-known/webfinger')
      .query({ resource })
      .reply(200, document, { 'Content-Type': 'application/jrd+json' })

    const result = await wf.webfinger(resource)

    assert.equal(result.subject, document.subject)
    assert.deepEqual(result.links, document.links)
    assert.strictEqual(result.link('profile'), result.links[0])
  })
})
