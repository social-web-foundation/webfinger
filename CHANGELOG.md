# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Historical entries were reconstructed from Git history; dates are taken from
the tagged release commits.

## [Unreleased]

### Added

- GitHub Actions CI running lint and tests on Node.js 22, 24, and 26 for branch
  pushes and version tags matching `vX.Y.Z`.
- StandardJS formatting and an `npm run lint` task.
- Dependabot weekly checks for npm and GitHub Actions, each with a seven-day
  cooldown.
- Tests for JRD link selection, media type arrays, and read-only collections.
- README documentation for the JRD interface and an ActivityPub actor lookup
  example.
- An npm lockfile for reproducible dependency installation.
- A code of conduct.

### Changed

- **Breaking:** `webfinger()` now returns promises instead of accepting callbacks. Errors reject
  the returned promise. Internal control flow uses async/await in place of Step.
- **Breaking:** `webfinger()` now resolves to a `JRD` instance with getter-only
  properties and frozen aliases, properties, links, and standard link metadata.
  Its `link(rel, type?)` method selects the first matching link, accepting a
  single media type or an array of accepted types. JRD instances are obtained
  through discovery; the class is not exported.
- **Breaking:** Supported Node.js versions are now 22.x, 24.x, and 26.x.
- **Breaking:** Converted the library and tests from CommonJS to ECMAScript
  modules. `webfinger` is a named export.
- Discovery now uses native `fetch()` and requests `application/jrd+json`,
  with `application/json` as a lower-priority alternative.
- Reserved example and invalid domains now follow normal HTTPS discovery
  instead of being rejected before a request is attempted.
- Replaced Vows with the built-in Node.js test runner and native assertions.
- Replaced Express test servers with Nock HTTP mocks. Tests call the real
  `webfinger()` function without network access, root privileges, listening
  ports, or TLS certificates.
- Test resources and mocked endpoints now use `user1` and `foo.example`
  instead of `alice` and `localhost`.
- Updated project links and contact information for the Social Web Foundation.

### Removed

- **Breaking:** Removed host-meta/LRDD fallback and XRD conversion. Discovery
  now uses the HTTPS WebFinger endpoint and JSON responses only.
- **Breaking:** Removed the `lrdd()`, `hostmeta()`, `discover()`, and
  `xrd2jrd()` exports. The `httpsOnly` and `webfingerOnly` options no longer
  have an effect; the `options` argument is currently unused.

### Security

- Removed the xml2js dependency along with XRD support, eliminating exposure
  to its previously used version's CVE-2023-0842 (prototype pollution).

## [0.4.2] - 2013-07-17

### Changed

- Reject reserved example and invalid hostnames before attempting network
  discovery: `example.com`, `example.net`, `example.org`, and names ending in
  `.example` or `.invalid`.

## [0.4.1] - 2013-04-30

### Changed

- Automatically prefix bare `user@domain` resources with `acct:` in
  `webfinger()` and `lrdd()`.

### Fixed

- Retry failed WebFinger and LRDD requests without the `acct:` prefix for
  compatibility with servers that accept only bare account addresses.

## [0.4.0] - 2013-04-29

### Added

- Public `lrdd()` function for discovery through host-meta and LRDD templates.
- `webfingerOnly` option to disable fallback to host-meta/LRDD discovery.
- Support for URI resources such as HTTP and HTTPS URLs in WebFinger and LRDD
  lookups.

## [0.3.2] - 2013-04-29

### Added

- Travis CI testing on Node.js 0.8 and 0.10.

### Fixed

- HTTPS test setup to allow the test servers' self-signed certificates.

## [0.3.1] - 2013-04-03

### Changed

- Expanded the Node.js version requirement from 0.8.x to 0.8 and later.
- Updated the Vows test dependency to 0.7.x.

## [0.3.0] - 2013-02-05

### Added

- Discovery through `/.well-known/webfinger`, tried before host-meta/LRDD
  fallback, following the WebFinger draft at the time.
- A `rel` argument for filtering WebFinger results by one or more link relations.
- An `httpsOnly` option for host-meta and WebFinger discovery, including LRDD
  fallback.

### Security

- Reject redirects from the WebFinger endpoint to non-HTTPS URLs, and reject
  non-HTTPS host-meta and LRDD redirects when `httpsOnly` is enabled.

## [0.2.0] - 2013-01-13

### Changed

- Stop host-meta discovery immediately when DNS resolution fails.
- Skip further host-meta requests using the same protocol after a connection
  is refused.

## [0.1.1] - 2012-09-28

### Fixed

- Corrected the Git repository URL in package metadata.

## [0.1.0] - 2012-08-29

### Added

- Initial release of the WebFinger and Host Meta (RFC 6415) client library.
- Host-meta and host-meta.json discovery over HTTP and HTTPS, with redirect
  handling and content negotiation.
- WebFinger account discovery through host-meta and LRDD templates.
- XRD and JRD support, returning discovery results as JRD objects, and an
  `xrd2jrd()` conversion function.
- A `discover()` helper that selects host-meta or WebFinger discovery based on
  the supplied address.

[Unreleased]: https://github.com/social-web-foundation/webfinger/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/social-web-foundation/webfinger/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/social-web-foundation/webfinger/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/social-web-foundation/webfinger/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/social-web-foundation/webfinger/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/social-web-foundation/webfinger/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/social-web-foundation/webfinger/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/social-web-foundation/webfinger/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/social-web-foundation/webfinger/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/social-web-foundation/webfinger/releases/tag/v0.1.0
