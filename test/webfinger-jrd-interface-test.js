'use strict'

const assert = require('node:assert/strict')
const { describe, it, beforeEach } = require('node:test')
const nock = require('nock')
const { webfinger } = require('../lib/webfinger')
const { useNock } = require('./helpers/nock')

describe('JRD interface returned by webfinger()', function () {
  useNock()

  const activityType = 'application/activity+json'
  const linkedDataType = 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
  const nameProperty = 'https://foo.example/ns/name'
  const flagProperty = 'https://foo.example/ns/flag'
  let document, jrd

  beforeEach(async function () {
    document = {
      subject: 'acct:user1@foo.example',
      aliases: ['https://foo.example/users/user1', 'https://foo.example/@user1'],
      properties: { [nameProperty]: 'Example User', [flagProperty]: null },
      links: [
        { rel: 'profile', type: activityType, href: 'https://foo.example/profile/user1' },
        { rel: 'self', href: 'https://foo.example/users/user1/untyped' },
        {
          rel: 'self',
          type: linkedDataType,
          href: 'https://foo.example/users/user1/ld',
          titles: { en: 'Example User' },
          properties: { [flagProperty]: null }
        },
        { rel: 'self', type: activityType, href: 'https://foo.example/users/user1' },
        { rel: 'self', type: activityType, href: 'https://foo.example/users/user1/alternate' }
      ]
    }

    nock('https://foo.example')
      .get('/.well-known/webfinger')
      .query({ resource: 'acct:user1@foo.example', rel: 'self' })
      .reply(200, document, { 'Content-Type': 'application/jrd+json' })

    jrd = await webfinger('user1@foo.example', 'self')
  })

  it('exposes the subject, aliases, properties, and complete links', function () {
    assert.equal(jrd.subject, document.subject)
    assert.deepEqual(jrd.aliases, document.aliases)
    assert.deepEqual(jrd.properties, document.properties)
    assert.deepEqual(jrd.links, document.links)
    assert.equal(jrd.properties[flagProperty], null)
    assert.equal(Object.hasOwn(jrd.properties, flagProperty), true)
    assert.equal(Object.hasOwn(jrd.properties, 'https://foo.example/ns/missing'), false)
  })

  it('selects the first relation match without requiring a media type', function () {
    assert.strictEqual(jrd.link('self'), jrd.links[1])
  })

  it('matches both relation and a single media type in document order', function () {
    assert.strictEqual(jrd.link('self', activityType), jrd.links[3])
  })

  it('matches any accepted media type in document order, not type preference order', function () {
    assert.strictEqual(jrd.link('self', [activityType, linkedDataType]), jrd.links[2])
    assert.strictEqual(jrd.link('self', [linkedDataType, activityType]), jrd.links[2])
    assert.strictEqual(jrd.link('self', [activityType]), jrd.links[3])
  })

  it('returns undefined when the relation or media type does not match', function () {
    assert.equal(jrd.link('missing'), undefined)
    assert.equal(jrd.link('missing', activityType), undefined)
    assert.equal(jrd.link('self', 'text/html'), undefined)
    assert.equal(jrd.link('self', ['text/html', 'text/plain']), undefined)
    assert.equal(jrd.link('self', 'application/ld+json'), undefined)
    assert.equal(jrd.link('self', []), undefined)
  })

  it('selects locally from all returned links despite the discovery rel parameter', function () {
    assert.strictEqual(jrd.link('profile', activityType), jrd.links[0])
  })

  it('does not allow collection properties to be replaced', function () {
    for (const key of ['aliases', 'properties', 'links']) {
      const original = jrd[key]
      assert.throws(function () { jrd[key] = null }, TypeError)
      assert.strictEqual(jrd[key], original)
    }
  })

  it('exposes a frozen aliases array', function () {
    assert.ok(Object.isFrozen(jrd.aliases))
    assert.throws(function () { jrd.aliases.push('https://foo.example/other') }, TypeError)
    assert.throws(function () { jrd.aliases[0] = 'https://foo.example/other' }, TypeError)
    assert.deepEqual(jrd.aliases, document.aliases)
  })

  it('exposes frozen document properties', function () {
    assert.ok(Object.isFrozen(jrd.properties))
    assert.throws(function () { jrd.properties[nameProperty] = 'Changed' }, TypeError)
    assert.throws(function () { delete jrd.properties[flagProperty] }, TypeError)
    assert.deepEqual(jrd.properties, document.properties)
  })

  it('exposes a frozen links array with frozen links and nested metadata', function () {
    assert.ok(Object.isFrozen(jrd.links))
    for (const link of jrd.links) {
      assert.ok(Object.isFrozen(link))
    }
    const link = jrd.link('self', linkedDataType)
    assert.strictEqual(link, jrd.links[2])
    assert.ok(Object.isFrozen(link.titles))
    assert.ok(Object.isFrozen(link.properties))
    assert.throws(function () { jrd.links.pop() }, TypeError)
    assert.throws(function () { link.href = 'https://foo.example/other' }, TypeError)
    assert.throws(function () { link.titles.en = 'Changed' }, TypeError)
    assert.throws(function () { link.properties[flagProperty] = 'Changed' }, TypeError)
    assert.deepEqual(jrd.links, document.links)
  })
})

describe('JRD with an empty links array', function () {
  useNock()

  it('returns undefined from link selection', async function () {
    nock('https://foo.example')
      .get('/.well-known/webfinger')
      .query({ resource: 'acct:user1@foo.example' })
      .reply(200, { subject: 'acct:user1@foo.example', links: [] })

    const jrd = await webfinger('user1@foo.example')

    assert.deepEqual(jrd.links, [])
    assert.equal(jrd.link('self'), undefined)
    assert.equal(jrd.link('self', ['application/activity+json']), undefined)
  })
})
