# Webfinger

Webfinger client library for Node.js.

It supports RFC 7033.

## License

Copyright 2012,2013 E14N https://e14n.com/
Copyright 2026, Social Web Foundation https://socialwebfoundation.org/

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## API

The `webfinger()` function returns a promise. Await the result; errors reject the promise.
This replaces the previous callback API.

### webfinger(address)

Resolves to a `JRD` instance containing discovery data for `address`.

The `address` argument accepts an `acct:` URI, a bare account identifier such
as `user1@foo.example`, or a URL with a hostname, such as an `http:` or `https:`
URL. Bare account identifiers are prefixed with `acct:` before discovery.

Discovery requests `https://<hostname>/.well-known/webfinger` with the resource
in the query string. The response must have status 200 and contain JSON.
XRD conversion and host-meta/LRDD fallback are not supported.

### webfinger(address, rel)

As above, but passes the `rel` parameter to the
`/.well-known/webfinger` endpoint if it's truthy. Supply a relation string or
an array of relation strings; an array sends repeated `rel` query parameters.

Servers may return additional links. Use the returned JRD's `link()` method
or filter its `links` array to select the links you need.

### webfinger(address, rel, options)

The third argument is accepted but currently unused. The former `httpsOnly`
and `webfingerOnly` options have no effect.

### JRD

`JRD` represents a JSON Resource Descriptor returned by `webfinger()`. Obtain
instances by awaiting `webfinger()`; the class is internal and is not exported
for direct construction.

The class provides synchronous access to the document and its links. Reading
its properties or selecting a link does not make a network request.

#### Properties

All four properties are getter-only:

* `subject`: the subject identifier from the document, or `undefined` when
  absent.
* `aliases`: a frozen array of alternative identifiers, defaulting to an empty
  array when absent. Access an individual alias with `jrd.aliases[i]`.
* `properties`: a frozen object mapping property URI keys to string or `null`
  values, defaulting to an empty object when absent. Explicit `null` values
  are preserved.
* `links`: a frozen array of link objects in document order, defaulting to an
  empty array when absent. Each link object and its `titles` and `properties`
  objects, when present, are also frozen. Links retain the fields supplied by
  the server.

The collections and standard link metadata are read-only. Attempting to
change frozen contents or assign to these getter-only properties throws a
`TypeError` in strict mode.

#### link(rel, type?)

Selects a link from the returned document by relation and, optionally, media
type. This is local selection, independent of any `rel` parameter passed to
`webfinger()` during discovery.

Returns the first link in document order whose `rel` exactly matches the
requested relation and whose media type satisfies the optional filter:

* Omit `type` or pass `null` to accept any media type, including a missing type.
* Pass a nonempty string to require an exact `type` match.
* Pass an array of strings to accept any listed type. Array order does not
  establish a preference; document order determines the first match.
* Pass an empty array to match nothing.

Media type matching compares the complete string, including any parameters;
it does not normalize media types.

The result is the same frozen link object exposed in `links`. Read its `href`
property for the target URI. No match returns `undefined`. Callers needing
multiple matches can filter the `links` array.

#### Example: finding an ActivityPub actor

With `webfinger` imported from this package, use the following expression
inside an async function to find an account's ActivityPub actor URI:

```js
(await webfinger('user1@foo.example')).link('self', ['application/activity+json', 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'])?.href
```

This returns the first matching link's `href`, or `undefined` if no matching
link has a target URI. Discovery errors still reject the promise.

## Testing

Use Node.js 22, 24, or 26 to run the tests with the built-in Node Test Runner.
Nock intercepts HTTP and HTTPS requests; the tests call the real `webfinger()`
function.
No servers, certificates, network access, or elevated privileges are needed.

    npm test

## Bugs

Bugs welcome, see:

 https://github.com/social-web-foundation/webfinger/issues
