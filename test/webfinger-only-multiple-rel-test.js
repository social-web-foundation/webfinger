// webfinger-only-multiple-rel-test.js
//
// Test discovery using multiple rel parameters
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
      nock('https://localhost')
        .get('/.well-known/webfinger')
        .query({ resource: 'acct:alice@localhost', rel: ['profile', 'avatar'] })
        .reply(200, { subject: 'acct:alice@localhost', links: [{ rel: 'profile', href: 'https://localhost/profile/alice' }, { rel: 'avatar', href: 'https://localhost/avatar/alice.png' }] })
    })

    it('it installs the HTTP fixtures', function () {
      assert.ok(nock.activeMocks().length > 0)
    })

    describe('and we get multiple Webfinger rels', function () {
      let jrd

      before(async function () {
        jrd = await wf.webfinger('alice@localhost', ['profile', 'avatar'])
      }, { timeout: 10000 })

      it('it works', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
      })

      it('it has the links', function () {
        let profiles, avatars
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
        assert.ok(Object.hasOwn(jrd, 'links'))
        assert.ok(Array.isArray(jrd.links))
        assert.strictEqual(jrd.links.length, 2)

        profiles = jrd.links.filter(function (item) { return item.rel == 'profile' })

        assert.strictEqual(profiles.length, 1)
        assert.ok(profiles[0] !== null && typeof profiles[0] === 'object' && !Array.isArray(profiles[0]))
        assert.ok(Object.hasOwn(profiles[0], 'rel'))
        assert.equal(profiles[0].rel, 'profile')
        assert.ok(Object.hasOwn(profiles[0], 'href'))
        assert.equal(profiles[0].href, 'https://localhost/profile/alice')

        avatars = jrd.links.filter(function (item) { return item.rel == 'avatar' })

        assert.strictEqual(avatars.length, 1)
        assert.ok(avatars[0] !== null && typeof avatars[0] === 'object' && !Array.isArray(avatars[0]))
        assert.ok(Object.hasOwn(avatars[0], 'rel'))
        assert.equal(avatars[0].rel, 'avatar')
        assert.ok(Object.hasOwn(avatars[0], 'href'))
        assert.equal(avatars[0].href, 'https://localhost/avatar/alice.png')
      })
    })
  })
})
