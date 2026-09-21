# Webfinger

Webfinger and host-meta client library for Node.js.

It supports:

* XRD documents
* JRD documents
* host-meta
* host-meta.json
* http and https
* RFC 6415 and the upcoming Webfinger RFC (up to draft 09)

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

All methods return promises. Await the result; errors reject the promise.
This replaces the previous callback API.

### webfinger(address)

Resolves to link data for the address `address` in JRD format.

The `address` argument can be any kind of URL that node.js recognizes;
acct: and http: and https: URLs are the most likely to work.

Note that the data is returned in JRD format even if it's in XRD
format on the server.

This method will first try the `/.well-known/webfinger` endpoint; if
that doesn't work it will fall back to RFC 6415 discovery.

### webfinger(address, rel)

As above, but passes the `rel` parameter to the
`/.well-known/webfinger` endpoint if it's truthy.

This is mostly advisory. Some servers will send all links back
anyways; others don't support the webfinger endpoint, so when we
fallback to RFC 6415 everything is returned.

Even if you pass a `rel` argument, you should still filter the
results. (But future versions of this library may do it for you.)

### webfinger(address, rel, options)

Pass `null` for `rel` when specifying options without a relation filter.

As above, but you can use the `options` object to control
behaviour. Currently, the options are:

* `httpsOnly`: boolean flag, default `false` for whether to only use
  HTTPS for communicating with the server. When this is set, it won't
  use Webfinger, host-meta or LRDD endpoints that aren't HTTPS, and won't
  follow redirect requests to HTTP endpoints.
* `webfingerOnly`: boolean flag, default `false` for whether to only use
  the .well-known/webfinger endpoint. When this is set, it won't
  use host-meta and LRDD endpoints as a fallback.

### lrdd(address)

Explicitly use Host Metadata + LRDD lookup per RFC 6415 and avoid the
/.well-known/webfinger endpoint. Use this if you know a host only
supports LRDD.

### lrdd(address, options)

As above, but with fine control of options. Options include:

* `httpsOnly`: boolean flag, default `false` for whether to only use
  HTTPS for communicating with the server. When this is set, it won't
  use Webfinger, host-meta or LRDD endpoints that aren't HTTPS, and won't
  follow redirect requests to HTTP endpoints.

### hostmeta(address)

Resolves to link data for the host at `address` in JRD format.

### hostmeta(address, options)

As above, but you can use the `options` object to control
behaviour. Currently, the options are:

* `httpsOnly`: boolean flag, default `false`, for whether to only use
  HTTPS for communicating with the server. When this is set, it won't
  use host-meta or host-meta.json endpoints that aren't HTTPS, and won't
  follow redirect requests to HTTP endpoints.

### discover(address)

Resolves to link data for `address` in JRD format.

If you've got an address and you don't want to bother figuring out if it's a
webfinger or a hostname, call this and we'll do it for you.

### xrd2jrd(xml)

Resolves to the JRD representation of an XRD document. Invalid XML rejects
the promise.

## Testing

Use Node.js 22, 24, or 26 to run the tests with the built-in Node Test Runner.
Nock intercepts HTTP and HTTPS requests, and the tests mock DNS resolution.
No servers, certificates, network access, or elevated privileges are needed.

    npm test

# Bugs

Bugs welcome, see:

 https://github.com/social-web-foundation/webfinger/issues
