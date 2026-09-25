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

const assert = require('node:assert')
const nock = require('nock')
const wf = require('../lib/webfinger')

const { describe, it, before } = require('node:test')
const { useNock } = require('./helpers/nock')

describe('WebFinger interface', function () {
  useNock()

  describe('When an HTTPS service just supports Webfinger', function () {
    before(function () {
      nock('https://foo.example')
        .get('/.well-known/webfinger')
        .query({ resource: 'acct:user1@foo.example', rel: 'profile' })
        .reply(200, { subject: 'acct:user1@foo.example', links: [{ rel: 'profile', href: 'https://foo.example/profile/user1' }] })

      nock('https://foo.example')
        .get('/.well-known/webfinger')
        .query({ resource: 'acct:user1@foo.example', rel: 'avatar' })
        .reply(200, { subject: 'acct:user1@foo.example', links: [{ rel: 'avatar', href: 'https://foo.example/avatar/user1.png' }] })

      nock('https://foo.example')
        .get('/.well-known/webfinger')
        .query({ resource: 'acct:user1@foo.example', rel: 'http://web.example/unrecognized' })
        .reply(200, { subject: 'acct:user1@foo.example', links: [] })
    })

    it('it installs the HTTP fixtures', function () {
      assert.ok(nock.activeMocks().length > 0)
    })

    describe('and we get a single Webfinger rel', function () {
      let jrd

      before(async function () {
        jrd = await wf.webfinger('user1@foo.example', 'profile')
      }, { timeout: 10000 })

      it('it works', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
      })

      it('it has the links', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
        assert.ok(Object.hasOwn(jrd, 'links'))
        assert.ok(Array.isArray(jrd.links))
        assert.strictEqual(jrd.links.length, 1)
        assert.ok(jrd.links[0] !== null && typeof jrd.links[0] === 'object' && !Array.isArray(jrd.links[0]))
        assert.ok(Object.hasOwn(jrd.links[0], 'rel'))
        assert.equal(jrd.links[0].rel, 'profile')
        assert.ok(Object.hasOwn(jrd.links[0], 'href'))
        assert.equal(jrd.links[0].href, 'https://foo.example/profile/user1')
      })
    })

    describe('and we get the other Webfinger rel', function () {
      let jrd

      before(async function () {
        jrd = await wf.webfinger('user1@foo.example', 'avatar')
      }, { timeout: 10000 })

      it('it works', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
      })

      it('it has the links', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
        assert.ok(Object.hasOwn(jrd, 'links'))
        assert.ok(Array.isArray(jrd.links))
        assert.strictEqual(jrd.links.length, 1)
        assert.ok(jrd.links[0] !== null && typeof jrd.links[0] === 'object' && !Array.isArray(jrd.links[0]))
        assert.ok(Object.hasOwn(jrd.links[0], 'rel'))
        assert.equal(jrd.links[0].rel, 'avatar')
        assert.ok(Object.hasOwn(jrd.links[0], 'href'))
        assert.equal(jrd.links[0].href, 'https://foo.example/avatar/user1.png')
      })
    })

    describe('and we get an unrecognized Webfinger rel', function () {
      let jrd

      before(async function () {
        jrd = await wf.webfinger('user1@foo.example', 'http://web.example/unrecognized')
      }, { timeout: 10000 })

      it('it works', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
      })

      it('it has no links', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
        assert.ok(Object.hasOwn(jrd, 'links'))
        assert.ok(Array.isArray(jrd.links))
        assert.strictEqual(jrd.links.length, 0)
      })
    })
  })
})
