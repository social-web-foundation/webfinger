// webfinger-only-test.js
//
// Test direct WebFinger discovery
//
// Copyright 2012, E14N https://e14n.com/
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import assert from 'node:assert'
import nock from 'nock'
import * as wf from '../lib/webfinger.js'

import { describe, it, before } from 'node:test'
import { useNock } from './helpers/nock.js'

describe('WebFinger interface', function () {
  useNock()

  for (const protocol of ['http', 'https']) {
    for (const { name, input, encoded, hostname } of [
      {
        name: 'a non-ASCII path',
        input: 'foo.example/profile/josé',
        encoded: 'foo.example/profile/jos%C3%A9',
        hostname: 'foo.example'
      },
      {
        name: 'a non-ASCII domain',
        input: 'bücher.example/profile/user1',
        encoded: 'xn--bcher-kva.example/profile/user1',
        hostname: 'xn--bcher-kva.example'
      },
      {
        name: 'a non-ASCII path and domain',
        input: 'bücher.example/profile/josé',
        encoded: 'xn--bcher-kva.example/profile/jos%C3%A9',
        hostname: 'xn--bcher-kva.example'
      }
    ]) {
      it(`looks up a ${protocol}: URI with ${name} as an encoded resource`, async function () {
        const resource = `${protocol}://${input}`
        const encodedResource = `${protocol}://${encoded}`
        const link = { rel: 'feed', href: `${encodedResource}/feed` }
        const scope = nock(`https://${hostname}`)
          .get('/.well-known/webfinger')
          .query({ resource: encodedResource })
          .reply(200, { subject: encodedResource, links: [link] })

        const jrd = await wf.webfinger(resource)

        assert.ok(scope.isDone(), 'The encoded resource was requested at the HTTPS endpoint')
        assert.strictEqual(jrd.subject, encodedResource)
        assert.deepStrictEqual(jrd.link('feed'), link)
      })
    }
  }

  describe('When an HTTPS service just supports Webfinger', function () {
    before(function () {
      nock('https://foo.example')
        .get('/.well-known/webfinger')
        .query({ resource: 'http://foo.example/profile/user1' })
        .reply(200, { subject: 'http://foo.example/profile/user1', links: [{ rel: 'feed', href: 'http://foo.example/profile/user1/feed' }] })
    })

    it('it installs the HTTP fixtures', function () {
      assert.ok(nock.activeMocks().length > 0)
    })

    describe("and we get an http URL's metadata", function () {
      let jrd

      before(async function () {
        jrd = await wf.webfinger('http://foo.example/profile/user1')
      }, { timeout: 10000 })

      it('it works', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
      })

      it('it has the link', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
        assert.strictEqual(typeof jrd.link, 'function')
        assert.ok(Array.isArray(jrd.links))
        assert.strictEqual(jrd.links.length, 1)
        assert.ok(jrd.links[0] !== null && typeof jrd.links[0] === 'object' && !Array.isArray(jrd.links[0]))
        assert.ok(Object.hasOwn(jrd.links[0], 'rel'))
        assert.equal(jrd.links[0].rel, 'feed')
        assert.ok(Object.hasOwn(jrd.links[0], 'href'))
        assert.equal(jrd.links[0].href, 'http://foo.example/profile/user1/feed')
      })
    })
  })
})
