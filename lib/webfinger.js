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

class JRD {
  #subject = undefined
  #aliases = Object.freeze([])
  #properties = Object.freeze({})
  #links = Object.freeze([])
  constructor (json) {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return
    }
    if ('subject' in json && typeof json.subject === 'string') {
      this.#subject = json.subject
    }
    if ('aliases' in json && Array.isArray(json.aliases)) {
      this.#aliases = Object.freeze(json.aliases)
    }
    if ('properties' in json && json.properties && typeof json.properties === 'object' && !Array.isArray(json.properties)) {
      this.#properties = Object.freeze(json.properties)
    }
    if ('links' in json && Array.isArray(json.links)) {
      this.#links = this.#freezeLinks(json.links)
    }
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
      if ('titles' in link && link.titles && typeof link.titles === 'object' && !Array.isArray(link.titles)) {
        link.titles = Object.freeze(link.titles)
      } else {
        delete link.titles
      }
      if ('properties' in link && link.properties && typeof link.properties === 'object' && !Array.isArray(link.properties)) {
        link.properties = Object.freeze(link.properties)
      } else {
        delete link.properties
      }
      return Object.freeze(link)
    }))
  }
}

function protocolOf (str) {
  const m = str.match(/^([A-Za-z][A-Za-z0-9+.-]*):/)
  return (m) ? m[1] : null
}

export function toAcctUri (address) {
  if (!address || typeof address !== 'string') {
    throw new TypeError('address must be a non-zero-length string')
  }
  const divider = address.lastIndexOf('@')
  if (divider <= 0 || divider === address.length - 1) {
    throw new Error(`${address} is not a proper Webfinger address`)
  }
  const username = encodeURIComponent(address.slice(0, divider))
  const hostname = new URL(`https://${address.slice(divider + 1)}/`).hostname
  return `acct:${username}@${hostname}`
}

export async function webfinger (resource, options = {}) {
  if (!resource || typeof resource !== 'string') {
    throw new TypeError('resource must be a non-zero-length string')
  }

  let hostname

  let protocol = protocolOf(resource)

  if (protocol === null) {
    resource = toAcctUri(resource)
    protocol = 'acct'
  }

  if (protocol === 'acct') {
    const divider = resource.lastIndexOf('@')
    if (divider === -1) {
      throw new Error(`${resource} is not an proper acct: URI`)
    }
    hostname = resource.slice(divider + 1)
  } else {
    const resourceUrl = new URL(resource)
    hostname = resourceUrl.hostname
  }

  if (!hostname) {
    throw new Error(`No hostname for ${resource}`)
  }

  const params = new URLSearchParams({ resource })

  if ('rel' in options && options.rel) {
    const rels = Array.isArray(options.rel) ? options.rel : [options.rel]
    for (const rel of rels) {
      params.append('rel', rel)
    }
  }

  const qs = params.toString()

  const url = `https://${hostname}/.well-known/webfinger?${qs}`

  const ff = ('fetch' in options)
    ? options.fetch
    : fetch

  const res = await ff(url, {
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
