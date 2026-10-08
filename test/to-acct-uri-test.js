import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as wf from '../lib/webfinger.js'

describe('toAcctUri()', function () {
  it('rejects null with a descriptive TypeError', function () {
    assert.throws(() => wf.toAcctUri(null), {
      name: 'TypeError',
      message: /address/i
    })
  })

  for (const { name, address, expected } of [
    {
      name: 'an ASCII address',
      address: 'user1@foo.example',
      expected: 'acct:user1@foo.example'
    },
    {
      name: 'a non-ASCII local part',
      address: 'josé@foo.example',
      expected: 'acct:jos%C3%A9@foo.example'
    },
    {
      name: 'a non-ASCII domain',
      address: 'user1@bücher.example',
      expected: 'acct:user1@xn--bcher-kva.example'
    },
    {
      name: 'a non-ASCII local part and domain',
      address: 'josé@bücher.example',
      expected: 'acct:jos%C3%A9@xn--bcher-kva.example'
    },
    {
      name: 'multiple @ characters using the last as the separator',
      address: 'something@something@foo.example',
      expected: 'acct:something%40something@foo.example'
    },
    {
      name: 'a literal percent sign in the unescaped local part',
      address: 'user%40name@foo.example',
      expected: 'acct:user%2540name@foo.example'
    },
    {
      name: 'a plus sign in the local part',
      address: 'user+tag@foo.example',
      expected: 'acct:user%2Btag@foo.example'
    },
    {
      name: 'an already ASCII IDNA domain',
      address: 'user1@xn--bcher-kva.example',
      expected: 'acct:user1@xn--bcher-kva.example'
    },
    {
      name: 'an acct: prefix as literal username text',
      address: 'acct:user1@foo.example',
      expected: 'acct:acct%3Auser1@foo.example'
    },
    {
      name: 'an acct: prefix and existing escapes as literal username text',
      address: 'acct:jos%C3%A9@xn--bcher-kva.example',
      expected: 'acct:acct%3Ajos%25C3%25A9@xn--bcher-kva.example'
    },
    {
      name: 'a mailto: prefix as literal username text',
      address: 'mailto:user1@foo.example',
      expected: 'acct:mailto%3Auser1@foo.example'
    },
    {
      name: 'an HTTPS URL in the username',
      address: 'https://foo.example/users/user1@bar.example',
      expected: 'acct:https%3A%2F%2Ffoo.example%2Fusers%2Fuser1@bar.example'
    },
    {
      name: 'a URL containing @ in the username',
      address: 'https://foo.example/users/user@name@bar.example',
      expected: 'acct:https%3A%2F%2Ffoo.example%2Fusers%2Fuser%40name@bar.example'
    }
  ]) {
    it(`converts ${name}`, function () {
      assert.equal(wf.toAcctUri(address), expected)
    })
  }

  for (const address of [
    'https://foo.example/users/user1',
    'user1',
    '',
    '@foo.example',
    'username@'
  ]) {
    it(`rejects ${JSON.stringify(address)}`, function () {
      assert.equal(typeof wf.toAcctUri, 'function', 'toAcctUri must be exported before checking rejection')
      assert.throws(() => wf.toAcctUri(address))
    })
  }
})
