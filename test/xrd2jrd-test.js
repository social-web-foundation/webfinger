const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const { xrd2jrd } = require('../lib/webfinger')

describe('XRD conversion', function () {
  it('converts single elements, attributes, and text', async function () {
    const xml = `<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
      <Subject>acct:alice@localhost</Subject>
      <Expires>2030-01-01T00:00:00Z</Expires>
      <Alias>https://localhost/alice</Alias>
      <Property type="https://localhost/name">Alice</Property>
      <Link rel="profile" type="text/html" href="https://localhost/alice">
        <Title>Alice's profile</Title>
        <Property type="https://localhost/visibility">public</Property>
      </Link>
    </XRD>`

    assert.deepEqual(await xrd2jrd(xml), {
      subject: 'acct:alice@localhost',
      expires: '2030-01-01T00:00:00Z',
      aliases: ['https://localhost/alice'],
      properties: { 'https://localhost/name': 'Alice' },
      links: [{
        rel: 'profile',
        type: 'text/html',
        href: 'https://localhost/alice',
        titles: { default: "Alice's profile" },
        properties: { 'https://localhost/visibility': 'public' }
      }]
    })
  })

  it('preserves repeated elements, language titles, and null properties', async function () {
    const xml = `<XRD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
      <Alias>https://localhost/alice</Alias>
      <Alias>https://localhost/users/1</Alias>
      <Property type="https://localhost/name">Alice</Property>
      <Property type="https://localhost/location" xsi:nil="true"/>
      <Link rel="profile" href="https://localhost/alice">
        <Title>Profile</Title>
        <Title xml:lang="fr">Profil</Title>
        <Property type="https://localhost/visibility">public</Property>
        <Property type="https://localhost/description" xsi:nil="true"/>
      </Link>
      <Link rel="avatar" href="https://localhost/alice.png"/>
    </XRD>`

    assert.deepEqual(await xrd2jrd(xml), {
      aliases: ['https://localhost/alice', 'https://localhost/users/1'],
      properties: {
        'https://localhost/name': 'Alice',
        'https://localhost/location': null
      },
      links: [{
        rel: 'profile',
        href: 'https://localhost/alice',
        titles: { default: 'Profile', fr: 'Profil' },
        properties: {
          'https://localhost/visibility': 'public',
          'https://localhost/description': null
        }
      }, {
        rel: 'avatar',
        href: 'https://localhost/alice.png'
      }]
    })
  })

  it('preserves text whitespace normalization', async function () {
    const xml = `<XRD>
      <Subject> acct:alice@localhost </Subject>
      <Link rel="profile">
        <Title> Alice's   profile </Title>
        <Property type="https://localhost/name"> Alice   Smith </Property>
      </Link>
    </XRD>`

    assert.deepEqual(await xrd2jrd(xml), {
      subject: 'acct:alice@localhost',
      links: [{
        rel: 'profile',
        titles: { default: "Alice's profile" },
        properties: { 'https://localhost/name': 'Alice Smith' }
      }]
    })
  })

  it('converts an empty descriptor without adding fields', async function () {
    assert.deepEqual(await xrd2jrd('<XRD/>'), {})
  })
})
