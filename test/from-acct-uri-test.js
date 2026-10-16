import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as wf from '../lib/webfinger.js'

describe('fromAcctUri()', function () {
  for (const { name, value } of [
    { name: 'null', value: null },
    { name: 'undefined', value: undefined },
    { name: 'an empty string', value: '' },
    { name: 'a number', value: 42 },
    { name: 'a boolean', value: true },
    { name: 'an object', value: {} },
    { name: 'an array', value: [] }
  ]) {
    it(`rejects ${name} with a descriptive TypeError`, function () {
      assert.equal(typeof wf.fromAcctUri, 'function')
      assert.throws(() => wf.fromAcctUri(value), {
        name: 'TypeError',
        message: /string/i
      })
    })
  }

  for (const { name, uri, expected } of [
    {
      name: 'a Unicode username and Unicode domain',
      uri: 'acct:jos%C3%A9@xn--bcher-kva.example',
      expected: 'josé@bücher.example'
    },
    {
      name: 'a Unicode username and ASCII domain',
      uri: 'acct:jos%C3%A9@foo.example',
      expected: 'josé@foo.example'
    },
    {
      name: 'an ASCII username and Unicode domain',
      uri: 'acct:user1@xn--bcher-kva.example',
      expected: 'user1@bücher.example'
    },
    {
      name: 'an ASCII username and ASCII domain',
      uri: 'acct:user1@foo.example',
      expected: 'user1@foo.example'
    }
  ]) {
    it(`returns a readable handle for ${name}`, function () {
      assert.equal(wf.fromAcctUri(uri), expected)
    })
  }

  it('rejects an ASCII address without an acct: prefix', function () {
    assert.throws(() => wf.fromAcctUri('user1@foo.example'), {
      name: 'Error',
      message: /acct:/i
    })
  })
})
