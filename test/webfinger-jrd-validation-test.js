import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import nock from 'nock'
import { webfinger } from '../lib/webfinger.js'
import { useNock } from './helpers/nock.js'

describe('WebFinger JRD response validation', function () {
  useNock()

  const subject = 'acct:user1@foo.example'

  it('returns an empty JRD when the endpoint returns JSON null', async function () {
    nock('https://foo.example')
      .get('/.well-known/webfinger')
      .query({ resource: subject })
      .reply(200, 'null', { 'Content-Type': 'application/jrd+json' })

    const jrd = await webfinger('user1@foo.example')

    assert.equal(jrd.subject, undefined)
    assert.deepEqual(jrd.aliases, [])
    assert.deepEqual(jrd.properties, {})
    assert.deepEqual(jrd.links, [])
    assert.ok(Object.isFrozen(jrd.aliases))
    assert.ok(Object.isFrozen(jrd.properties))
    assert.ok(Object.isFrozen(jrd.links))
    assert.equal(jrd.link('self'), undefined)
    assert.equal(jrd.link('self', ['application/activity+json']), undefined)
  })

  it('exposes an empty links array when links is missing', async function () {
    nock('https://foo.example')
      .get('/.well-known/webfinger')
      .query({ resource: subject })
      .reply(200, { subject }, { 'Content-Type': 'application/jrd+json' })

    const jrd = await webfinger('user1@foo.example')

    assert.equal(jrd.subject, subject)
    assert.deepEqual(jrd.links, [])
    assert.ok(Object.isFrozen(jrd.links))
    assert.equal(jrd.link('self'), undefined)
    assert.equal(jrd.link('self', ['application/activity+json']), undefined)
  })

  for (const [label, links] of [
    ['null', null],
    ['a scalar string', 'scalar'],
    ['an object', { object: true }]
  ]) {
    it(`uses an empty links array for malformed links: ${label}`, async function () {
      nock('https://foo.example')
        .get('/.well-known/webfinger')
        .query({ resource: subject })
        .reply(200, { subject, links }, { 'Content-Type': 'application/jrd+json' })

      const jrd = await webfinger('user1@foo.example')

      assert.equal(jrd.subject, subject)
      assert.deepEqual(jrd.links, [])
      assert.ok(Object.isFrozen(jrd.links))
      assert.equal(jrd.link('self'), undefined)
      assert.equal(jrd.link('self', ['application/activity+json']), undefined)
    })
  }
})

describe('WebFinger link metadata validation', function () {
  useNock()

  for (const field of ['titles', 'properties']) {
    for (const [label, value] of [
      ['null', null],
      ['a string', 'scalar'],
      ['a number', 42],
      ['a boolean', false],
      ['an empty array', []],
      ['a nonempty array', ['invalid']]
    ]) {
      it(`leaves ${field} undefined when its value is ${label}`, async function () {
        const subject = 'acct:user1@foo.example'
        const validMetadata = field === 'titles'
          ? { properties: { 'https://foo.example/ns/role': 'author' } }
          : { titles: { en: 'Profile' } }
        const expected = {
          rel: 'self',
          type: 'application/activity+json',
          href: 'https://foo.example/users/user1',
          ...validMetadata
        }

        nock('https://foo.example')
          .get('/.well-known/webfinger')
          .query({ resource: subject })
          .reply(200, {
            subject,
            links: [{ ...expected, [field]: value }]
          }, { 'Content-Type': 'application/jrd+json' })

        const jrd = await webfinger('user1@foo.example')
        const link = jrd.link('self', 'application/activity+json')

        assert.equal(jrd.links.length, 1)
        assert.ok(link)
        assert.equal(link[field], undefined)
        assert.equal(link.rel, expected.rel)
        assert.equal(link.type, expected.type)
        assert.equal(link.href, expected.href)
        for (const [key, metadata] of Object.entries(validMetadata)) {
          assert.deepEqual(link[key], metadata)
          assert.ok(Object.isFrozen(link[key]))
        }
        assert.ok(Object.isFrozen(link))
      })
    }
  }
})
