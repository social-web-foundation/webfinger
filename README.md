# Webfinger

Webfinger client library for Node.js.

It supports RFC 7033.

## Table of Contents

- [Security](#security)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contributing](#contributing)
  - [Testing](#testing)
- [License](#license)

## Security

This library does not provide protection against server-side request forgery
(SSRF) out of the box. Its default transport is global `fetch`, which can
connect to private or internal network addresses, including through redirects.

When discovering user-supplied addresses, use [options.fetch](#optionsfetch)
to supply a transport that enforces your network policy, including checks on
resolved IP addresses and redirect destinations. The example below shows how
to supply an SSRF-protecting fetch implementation.

## Install

Requires Node.js 22.x, 24.x, or 26.x.

```sh
npm install webfinger
```

## Usage

Import the named `webfinger` export and await discovery:

```js
import { webfinger } from 'webfinger'

const jrd = await webfinger('user@example.com')
console.log(jrd.subject)
console.log(jrd.links)
```

See [API](#api) for relation filtering, custom fetch functions, and JRD link
selection. For user-supplied addresses, review [Security](#security).

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

### webfinger(address, options)

The optional second argument is an object with `rel` and `fetch` properties.
The previous positional `rel` argument and three-argument signature are no
longer supported. Move the relation into `options.rel` and pass any custom
fetch function in the same object.

#### options.rel

Supply a relation string or an array of relation strings to filter discovery
results. An array sends repeated `rel` query parameters. Omitting `rel`, or
passing `undefined`, `null`, an empty string, or an empty array, sends no
relation filter.

```js
const jrd = await webfinger('user1@foo.example', { rel: ['self', 'profile'] })
```

Servers may return additional links. Use the returned JRD's `link()` method
or filter its `links` array to select the links you need.

#### options.fetch

Supply a custom fetch function for the discovery request. When the `fetch`
property is absent, the module uses global `fetch`.

The function receives the discovery URL and a request-options object containing
the `Accept` header. It should return a promise for a fetch-compatible response
with a numeric `status` and an asynchronous `json()` method. The response must
have status 200; its JSON is parsed into the returned `JRD`.

```js
const jrd = await webfinger('user1@foo.example', { fetch: customFetch })
```

To also filter by relation, include `rel` in the same options object.
Supply a callable function. Explicit values such as `undefined` or `null` do
not select the default and cause the lookup to reject. If you pass an object
method that depends on `this`, bind it to its instance first. Errors from the
custom fetch function reject the lookup promise.

For example, after installing the optional
[`guarded-fetch`](https://github.com/vercel-labs/guarded-fetch) package in your
application, you can supply its fetch-compatible function:

```js
import { guardedFetch } from 'guarded-fetch'
import { webfinger } from 'webfinger'

const jrd = await webfinger('user@example.com', {
  fetch: guardedFetch
})
console.log(jrd.subject)
```

`guarded-fetch` checks destination IP addresses and redirects to help prevent
SSRF. This is an integration example; `guarded-fetch` is not a dependency of
this library. Its bare `guardedFetch` function does not limit response-body
size; consult its documentation when choosing resource limits for your
application.

The former `httpsOnly` and `webfingerOnly` options have no effect.

### JRD

`JRD` represents a JSON Resource Descriptor returned by `webfinger()`. Obtain
instances by awaiting `webfinger()`; the class is internal and is not exported
for direct construction.

The class provides synchronous access to the document and its links. Reading
its properties or selecting a link does not make a network request.

In general, malformed or mistyped response properties are ignored and filtered
out. Missing or invalid top-level fields retain their defaults: `subject` is
`undefined`, `aliases` and `links` are empty arrays, and `properties` is an empty
object. A JSON response of `null` or another non-object value, including an
array, produces an empty JRD.

Link `titles` and `properties` must be non-null, non-array objects. Invalid
values are omitted, so reading those fields returns `undefined`; the rest of
the link remains available. This handling applies to parsed response data.
Network errors, non-200 responses, and invalid JSON syntax still reject the
lookup promise.

#### Properties

All four properties are getter-only:

- `subject`: the subject identifier from the document, or `undefined` when
  absent or mistyped.
- `aliases`: a frozen array of alternative identifiers, defaulting to an empty
  array when absent or mistyped. Access an individual alias with `jrd.aliases[i]`.
- `properties`: a frozen object mapping property URI keys to string or `null`
  values, defaulting to an empty object when the field is absent or mistyped.
  Explicit `null` values within a valid properties object are preserved.
- `links`: a frozen array of link objects in document order, defaulting to an
  empty array when absent or mistyped. Each link object and its `titles` and `properties`
  objects, when present and valid, are also frozen. Links retain server-supplied
  fields except metadata filtered out by validation.

The collections and standard link metadata are read-only. Attempting to
change frozen contents or assign to these getter-only properties throws a
`TypeError` in strict mode.

#### link(rel, type?)

Selects a link from the returned document by relation and, optionally, media
type. This is local selection, independent of `options.rel` passed to
`webfinger()` during discovery.

Returns the first link in document order whose `rel` exactly matches the
requested relation and whose media type satisfies the optional filter:

- Omit `type` or pass `null` to accept any media type, including a missing type.
- Pass a nonempty string to require an exact `type` match.
- Pass an array of strings to accept any listed type. Array order does not
  establish a preference; document order determines the first match.
- Pass an empty array to match nothing.

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

## Contributing

Questions, bug reports, and pull requests are welcome through the
[GitHub repository](https://github.com/social-web-foundation/webfinger).
Use the [issue tracker](https://github.com/social-web-foundation/webfinger/issues)
for questions and bugs. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md)
and run lint and tests before submitting a pull request.

### Testing

Use Node.js 22, 24, or 26 to run the tests with the built-in Node Test Runner.
Nock intercepts HTTP and HTTPS requests; the tests call the real `webfinger()`
function.
No servers, certificates, network access, or elevated privileges are needed.

```sh
npm ci
npm run lint
npm test
```

Run the browser tests in headless Chromium with Playwright:

```sh
npx playwright install chromium
npm run test:browser
```

The browser tests import the library as a native ES module and exercise browser
`fetch` with intercepted responses, including cross-origin discovery with CORS
headers and repeated relation parameters. Installing Chromium requires network
access; the tests themselves do not contact external services. CI runs both
the Node.js and browser suites before publishing.

## License

- Copyright 2012,2013 E14N <https://e14n.com/>
- Copyright 2026, Social Web Foundation <https://socialwebfoundation.org/>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

<http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

See [LICENSE.md](LICENSE.md) for the full license text.
