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

  for (const { name, resource, encodedResource, origin } of [
    {
      name: 'a non-ASCII local part',
      resource: 'josé@foo.example',
      encodedResource: 'acct:jos%C3%A9@foo.example',
      origin: 'https://foo.example'
    },
    {
      name: 'a non-ASCII domain',
      resource: 'user1@bücher.example',
      encodedResource: 'acct:user1@xn--bcher-kva.example',
      origin: 'https://xn--bcher-kva.example'
    },
    {
      name: 'a non-ASCII local part and domain',
      resource: 'josé@bücher.example',
      encodedResource: 'acct:jos%C3%A9@xn--bcher-kva.example',
      origin: 'https://xn--bcher-kva.example'
    }
  ]) {
    it(`encodes and looks up a bare account address with ${name}`, async function () {
      const link = { rel: 'profile', href: `${origin}/profile/user1` }
      const scope = nock(origin)
        .get('/.well-known/webfinger')
        .query({ resource: encodedResource })
        .reply(200, { subject: encodedResource, links: [link] })

      const jrd = await wf.webfinger(resource)

      assert.ok(scope.isDone(), 'The expected WebFinger endpoint was requested')
      assert.strictEqual(jrd.subject, encodedResource)
      assert.deepStrictEqual(jrd.link('profile'), link)
    })
  }

  it('uses the last @ as the hostname separator in a bare account address', async function () {
    const resource = 'something@something@foo.example'
    const encodedResource = 'acct:something%40something@foo.example'
    const scope = nock('https://foo.example')
      .get('/.well-known/webfinger')
      .query({ resource: encodedResource })
      .reply(200, { subject: encodedResource, links: [] })

    const jrd = await wf.webfinger(resource)

    assert.ok(scope.isDone(), 'The local-part @ was encoded and the correct hostname was requested')
    assert.strictEqual(jrd.subject, encodedResource)
  })

  for (const { name, resource, origin } of [
    {
      name: 'a percent-encoded local part',
      resource: 'acct:jos%C3%A9@foo.example',
      origin: 'https://foo.example'
    },
    {
      name: 'an IDNA-encoded domain',
      resource: 'acct:user1@xn--bcher-kva.example',
      origin: 'https://xn--bcher-kva.example'
    },
    {
      name: 'a percent-encoded local part and IDNA-encoded domain',
      resource: 'acct:jos%C3%A9@xn--bcher-kva.example',
      origin: 'https://xn--bcher-kva.example'
    },
    {
      name: 'an escaped @ and percent sign',
      resource: 'acct:some%40name%25@foo.example',
      origin: 'https://foo.example'
    },
    {
      name: 'lowercase percent escapes',
      resource: 'acct:jos%c3%a9@foo.example',
      origin: 'https://foo.example'
    }
  ]) {
    it(`preserves an acct: URI with ${name} when encode is false`, async function () {
      const link = { rel: 'profile', href: `${origin}/profile/user1` }
      const scope = nock(origin)
        .get('/.well-known/webfinger')
        .query({ resource })
        .reply(200, { subject: resource, links: [link] })

      const jrd = await wf.webfinger(resource, { encode: false })

      assert.ok(scope.isDone(), 'The original acct: URI was sent as the resource')
      assert.strictEqual(jrd.subject, resource)
      assert.deepStrictEqual(jrd.link('profile'), link)
    })
  }

  describe('When an HTTPS service just supports Webfinger', function () {
    before(function () {
      nock('https://foo.example')
        .get('/.well-known/webfinger')
        .query({ resource: 'acct:user1@foo.example' })
        .reply(200, { subject: 'acct:user1@foo.example', links: [{ rel: 'profile', href: 'https://foo.example/profile/user1' }] })
    })

    it('it installs the HTTP fixtures', function () {
      assert.ok(nock.activeMocks().length > 0)
    })

    describe('and we get a Webfinger', function () {
      let jrd

      before(async function () {
        jrd = await wf.webfinger('acct:user1@foo.example')
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
        assert.equal(jrd.links[0].rel, 'profile')
        assert.ok(Object.hasOwn(jrd.links[0], 'href'))
        assert.equal(jrd.links[0].href, 'https://foo.example/profile/user1')
      })
    })
  })
})
