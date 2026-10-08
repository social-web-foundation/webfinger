import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { webfinger } from '../lib/webfinger.js'

describe('WebFinger resource encoding', function () {
  const cases = [
    {
      name: 'a bare address',
      input: 'josé@bücher.example',
      expected: 'acct:jos%C3%A9@xn--bcher-kva.example'
    },
    {
      name: 'an acct: URI',
      input: 'acct:josé@bücher.example',
      expected: 'acct:jos%C3%A9@xn--bcher-kva.example'
    },
    {
      name: 'literal percent escapes in an acct: local part',
      input: 'acct:jos%C3%A9@bücher.example',
      expected: 'acct:jos%25C3%25A9@xn--bcher-kva.example'
    },
    ...['http', 'https', 'ftp'].map(protocol => ({
      name: `a ${protocol}: URI`,
      input: `${protocol}://bücher.example/profile/josé`,
      expected: `${protocol}://xn--bcher-kva.example/profile/jos%C3%A9`
    }))
  ]

  for (const { name, options } of [
    { name: 'by default', options: {} },
    { name: 'when encode is true', options: { encode: true } }
  ]) {
    for (const { name: inputName, input, expected } of cases) {
      it(`encodes ${inputName} ${name}`, async function (t) {
        const customFetch = t.mock.fn(async () => new Response(JSON.stringify({ subject: expected, links: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/jrd+json' }
        }))

        const jrd = await webfinger(input, { ...options, fetch: customFetch })

        assert.equal(customFetch.mock.callCount(), 1)
        const requestUrl = new URL(customFetch.mock.calls[0].arguments[0])
        assert.equal(requestUrl.origin, 'https://xn--bcher-kva.example')
        assert.equal(requestUrl.pathname, '/.well-known/webfinger')
        assert.deepEqual(requestUrl.searchParams.getAll('resource'), [expected])
        assert.equal(jrd.subject, expected)
      })
    }
  }

  for (const input of [
    'acct:jos%C3%A9@xn--bcher-kva.example',
    'acct:josé@bücher.example',
    ...['http', 'https', 'ftp'].flatMap(protocol => [
      `${protocol}://xn--bcher-kva.example/profile/jos%c3%a9?q=a%20b&x=1`,
      `${protocol}://bücher.example/profile/josé`
    ])
  ]) {
    it(`preserves ${JSON.stringify(input)} when encode is false`, async function (t) {
      const customFetch = t.mock.fn(async () => new Response(JSON.stringify({ subject: input, links: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/jrd+json' }
      }))

      await webfinger(input, { encode: false, fetch: customFetch })

      assert.equal(customFetch.mock.callCount(), 1)
      const requestUrl = new URL(customFetch.mock.calls[0].arguments[0])
      assert.equal(requestUrl.origin, 'https://xn--bcher-kva.example')
      assert.equal(requestUrl.pathname, '/.well-known/webfinger')
      assert.deepEqual(requestUrl.searchParams.getAll('resource'), [input])
    })
  }

  it('rejects a bare address before fetching when encode is false', async function (t) {
    const customFetch = t.mock.fn(async () => {
      assert.fail('A bare address must be rejected before fetching')
    })

    await assert.rejects(webfinger('user1@foo.example', { encode: false, fetch: customFetch }))
    assert.equal(customFetch.mock.callCount(), 0)
  })
})
