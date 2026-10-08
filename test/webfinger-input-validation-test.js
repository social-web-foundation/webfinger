import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { webfinger } from '../lib/webfinger.js'

describe('WebFinger input validation', function () {
  it('rejects a null resource with a descriptive TypeError before fetching', async function (t) {
    const customFetch = t.mock.fn(async () => {
      assert.fail('An invalid resource must be rejected before fetching')
    })

    await assert.rejects(webfinger(null, { fetch: customFetch }), {
      name: 'TypeError',
      message: /resource/i
    })
    assert.equal(customFetch.mock.callCount(), 0)
  })
})
