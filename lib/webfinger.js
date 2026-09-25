// index.js
//
// main module for Webfinger
//
// Copyright 2012, E14N https://e14n.com/
// Copyright 2026, Social Web Foundation https://socialwebfoundation.org/
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

import querystring from 'node:querystring'

class JRD {
  #subject
  #aliases
  #properties
  #links
  constructor (json) {
    if (!json) {
      return
    }
    this.#subject = ('subject' in json) ? json.subject : undefined
    this.#aliases = ('aliases' in json) ? Object.freeze(json.aliases) : Object.freeze([])
    this.#properties = ('properties' in json) ? Object.freeze(json.properties) : Object.freeze({})
    this.#links = ('links' in json) ? this.#freezeLinks(json.links) : Object.freeze([])
  }

  get subject () {
    return this.#subject
  }

  get aliases () {
    return this.#aliases
  }

  get properties () {
    return this.#properties
  }

  get links () {
    return this.#links
  }

  link (rel, type = null) {
    const types = (type)
      ? (Array.isArray(type))
          ? type
          : [type]
      : null
    return this.#links.find((link) =>
      link.rel === rel &&
      (types === null || types.includes(link.type)))
  }

  #freezeLinks (links) {
    return Object.freeze(links.map((link) => {
      if ('titles' in link) {
        Object.freeze(link.titles)
      }
      if ('properties' in link) {
        Object.freeze(link.properties)
      }
      return Object.freeze(link)
    }))
  }
}

function protocolOf (str) {
  const m = str.match(/^([A-Za-z][A-Za-z0-9+.-]*):/)
  return (m) ? m[1] : null
}

export async function webfinger (resource, rel = null, options = {}) {
  let hostname

  let protocol = protocolOf(resource)

  if (protocol === null) {
    if (resource.indexOf('@') !== -1) {
      resource = 'acct:' + resource
      protocol = 'acct'
    } else {
      throw new Error(`${resource} is not an URI`)
    }
  }

  if (protocol === 'acct') {
    const parts = resource.slice(6).split('@')
    hostname = parts[1]
  } else {
    const parsed = URL.parse(resource)
    hostname = parsed.hostname
  }

  if (!hostname) {
    throw new Error(`No hostname for ${resource}`)
  }

  const params = { resource }

  if (rel) {
    params.rel = rel
  }

  const qs = querystring.stringify(params)

  const url = `https://${hostname}/.well-known/webfinger?${qs}`

  const res = await fetch(url, {
    headers: {
      Accept: 'application/jrd+json;q=1.0, application/json;q=0.5'
    }
  })

  if (res.status !== 200) {
    throw new Error(`Webfinger not supported: ${hostname}`)
  }

  let json = null

  try {
    json = await res.json()
  } catch (err) {
    throw new Error('Invalid JSON')
  }

  return new JRD(json)
}
