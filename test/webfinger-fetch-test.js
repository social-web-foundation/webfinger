import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { webfinger } from '../lib/webfinger.js'

describe('WebFinger custom fetch', function () {
  it('uses options.fetch to request and parse the WebFinger document', async function (t) {
    const document = {
      subject: 'acct:user1@foo.example',
      links: [{
        rel: 'self',
        type: 'application/activity+json',
        href: 'https://foo.example/users/user1'
      }]
    }
    const response = () => new Response(JSON.stringify(document), {
      status: 200,
      headers: { 'Content-Type': 'application/jrd+json' }
    })
    const globalFetch = t.mock.method(globalThis, 'fetch', async () => response())
    const customFetch = t.mock.fn(async () => response())

    const jrd = await webfinger('user1@foo.example', { rel: 'self', fetch: customFetch })

    assert.equal(customFetch.mock.callCount(), 1)
    assert.equal(globalFetch.mock.callCount(), 0)

    const [url, options] = customFetch.mock.calls[0].arguments
    const requestUrl = new URL(url)
    assert.equal(requestUrl.origin, 'https://foo.example')
    assert.equal(requestUrl.pathname, '/.well-known/webfinger')
    assert.equal(requestUrl.searchParams.get('resource'), document.subject)
    assert.equal(requestUrl.searchParams.get('rel'), 'self')
    assert.ok(new Headers(options.headers).get('Accept').includes('application/jrd+json'))
    assert.equal(jrd.subject, document.subject)
    assert.deepEqual(jrd.link('self', 'application/activity+json'), document.links[0])
  })

  it('accepts options as the second argument without a relation filter', async function (t) {
    const document = {
      subject: 'acct:user1@foo.example',
      links: [{
        rel: 'self',
        type: 'application/activity+json',
        href: 'https://foo.example/users/user1'
      }]
    }
    const response = () => new Response(JSON.stringify(document), {
      status: 200,
      headers: { 'Content-Type': 'application/jrd+json' }
    })
    const globalFetch = t.mock.method(globalThis, 'fetch', async () => response())
    const customFetch = t.mock.fn(async () => response())

    const jrd = await webfinger('user1@foo.example', { fetch: customFetch })

    assert.equal(customFetch.mock.callCount(), 1)
    assert.equal(globalFetch.mock.callCount(), 0)

    const [url, options] = customFetch.mock.calls[0].arguments
    const requestUrl = new URL(url)
    assert.equal(requestUrl.origin, 'https://foo.example')
    assert.equal(requestUrl.pathname, '/.well-known/webfinger')
    assert.equal(requestUrl.searchParams.get('resource'), document.subject)
    assert.equal(requestUrl.searchParams.has('rel'), false)
    assert.ok(new Headers(options.headers).get('Accept').includes('application/jrd+json'))
    assert.equal(jrd.subject, document.subject)
    assert.deepEqual(jrd.link('self', 'application/activity+json'), document.links[0])
  })

  for (const [label, rel] of [['undefined', undefined], ['null', null], ['an empty string', '']]) {
    it(`omits the relation query parameter when options.rel is ${label}`, async function (t) {
      const subject = 'acct:user1@foo.example'
      t.mock.method(globalThis, 'fetch', async () => {
        assert.fail('Expected the custom fetch function to be used')
      })
      const customFetch = t.mock.fn(async () => new Response(JSON.stringify({ subject, links: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/jrd+json' }
      }))

      const jrd = await webfinger('user1@foo.example', { rel, fetch: customFetch })

      assert.equal(customFetch.mock.callCount(), 1)
      const requestUrl = new URL(customFetch.mock.calls[0].arguments[0])
      assert.equal(requestUrl.searchParams.get('resource'), subject)
      assert.equal(requestUrl.searchParams.has('rel'), false)
      assert.equal(jrd.subject, subject)
    })
  }
})
