import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { before, after, describe, it } from 'node:test'
import { chromium } from 'playwright'

describe('WebFinger in Chromium', { timeout: 30000 }, function () {
  let browser
  let source

  before(async function () {
    source = await readFile(new URL('../../lib/webfinger.js', import.meta.url), 'utf8')
    browser = await chromium.launch()
  })

  after(async function () {
    await browser?.close()
  })

  const cases = [
    { name: 'bare account without relations', address: 'user1@foo.example', resource: 'acct:user1@foo.example', options: {}, rels: [] },
    { name: 'account URI with a single relation', address: 'acct:user1@foo.example', resource: 'acct:user1@foo.example', options: { rel: 'self' }, rels: ['self'] },
    { name: 'HTTPS resource with repeated relations and reserved characters', address: 'https://foo.example/users/a+b?q=hello%20world&x=1', resource: 'https://foo.example/users/a+b?q=hello%20world&x=1', options: { rel: ['self', 'https://rels.example/a+b?x=1&y=2'] }, rels: ['self', 'https://rels.example/a+b?x=1&y=2'] },
    { name: 'empty relation array', address: 'user1@foo.example', resource: 'acct:user1@foo.example', options: { rel: [] }, rels: [] }
  ]

  for (const { name, address, resource, options, rels } of cases) {
    it(name, async function (t) {
      const context = await browser.newContext()
      t.after(() => context.close())
      const page = await context.newPage()
      const requests = []
      const unexpected = []
      const link = { rel: 'self', type: 'application/activity+json', href: 'https://foo.example/users/user1' }

      await context.route('**/*', async route => {
        const request = route.request()
        const url = new URL(request.url())
        if (url.href === 'https://client.example/') {
          await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>WebFinger test</title>' })
        } else if (url.href === 'https://client.example/webfinger.js') {
          await route.fulfill({ contentType: 'text/javascript', body: source })
        } else if (url.origin === 'https://foo.example' && url.pathname === '/.well-known/webfinger') {
          requests.push({ url: url.href, method: request.method(), accept: request.headers().accept })
          await route.fulfill({
            contentType: 'application/jrd+json',
            headers: { 'Access-Control-Allow-Origin': 'https://client.example' },
            body: JSON.stringify({ subject: resource, links: [link] })
          })
        } else {
          unexpected.push(url.href)
          await route.abort()
        }
      })

      await page.goto('https://client.example/')
      const result = await page.evaluate(async ({ address, options }) => {
        const { webfinger } = await import('https://client.example/webfinger.js')
        const jrd = await webfinger(address, options)
        return {
          subject: jrd.subject,
          link: jrd.link('self', 'application/activity+json'),
          frozen: Object.isFrozen(jrd.links) && Object.isFrozen(jrd.links[0])
        }
      }, { address, options })

      assert.deepEqual(unexpected, [])
      assert.equal(requests.length, 1)
      const query = new URL(requests[0].url).searchParams
      assert.deepEqual(query.getAll('resource'), [resource])
      assert.deepEqual(query.getAll('rel'), rels)
      assert.equal(requests[0].method, 'GET')
      assert.ok(requests[0].accept.includes('application/jrd+json'))
      assert.deepEqual(result, { subject: resource, link, frozen: true })
    })
  }
})
