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

import assert from 'node:assert'
import nock from 'nock'
import * as wf from '../lib/webfinger.js'

import { describe, it, before } from 'node:test'
import { useNock } from './helpers/nock.js'

describe('WebFinger interface', function () {
  useNock()

  describe('When an HTTPS service just supports Webfinger', function () {
    before(function () {
      nock('https://foo.example')
        .get('/.well-known/webfinger')
        .query({ resource: 'acct:user1@foo.example', rel: ['profile', 'avatar'] })
        .reply(200, { subject: 'acct:user1@foo.example', links: [{ rel: 'profile', href: 'https://foo.example/profile/user1' }, { rel: 'avatar', href: 'https://foo.example/avatar/user1.png' }] })
    })

    it('it installs the HTTP fixtures', function () {
      assert.ok(nock.activeMocks().length > 0)
    })

    describe('and we get multiple Webfinger rels', function () {
      let jrd

      before(async function () {
        jrd = await wf.webfinger('user1@foo.example', ['profile', 'avatar'])
      }, { timeout: 10000 })

      it('it works', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
      })

      it('it has the links', function () {
        assert.ok(jrd !== null && typeof jrd === 'object' && !Array.isArray(jrd))
        assert.strictEqual(typeof jrd.link, 'function')
        assert.ok(Array.isArray(jrd.links))
        assert.strictEqual(jrd.links.length, 2)

        const profiles = jrd.links.filter(function (item) { return item.rel === 'profile' })

        assert.strictEqual(profiles.length, 1)
        assert.ok(profiles[0] !== null && typeof profiles[0] === 'object' && !Array.isArray(profiles[0]))
        assert.ok(Object.hasOwn(profiles[0], 'rel'))
        assert.equal(profiles[0].rel, 'profile')
        assert.ok(Object.hasOwn(profiles[0], 'href'))
        assert.equal(profiles[0].href, 'https://foo.example/profile/user1')

        const avatars = jrd.links.filter(function (item) { return item.rel === 'avatar' })

        assert.strictEqual(avatars.length, 1)
        assert.ok(avatars[0] !== null && typeof avatars[0] === 'object' && !Array.isArray(avatars[0]))
        assert.ok(Object.hasOwn(avatars[0], 'rel'))
        assert.equal(avatars[0].rel, 'avatar')
        assert.ok(Object.hasOwn(avatars[0], 'href'))
        assert.equal(avatars[0].href, 'https://foo.example/avatar/user1.png')
      })
    })
  })
})
