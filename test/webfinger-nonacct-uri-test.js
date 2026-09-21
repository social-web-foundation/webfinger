// hostmeta-test.js
//
// Test getting LRDD data for a non-acct URI
//
// Copyright 2013, E14N https://e14n.com/
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

var assert = require("node:assert"),
    nock = require("nock"),
    wf = require("../lib/webfinger");

var {describe, it, before} = require("node:test");
var {useNock} = require("./helpers/nock");

describe("RFC6415 (host-meta) interface", function() {
    useNock();

    describe("When an HTTP service just supports host-meta with XRD", function() {
        before(function() {
            nock("https://localhost")
                .get("/.well-known/webfinger")
                .query({"resource": "http://localhost/profile/alice"})
                .replyWithError(Object.assign(new Error("Connection refused"), {code: "ECONNREFUSED"}));

            nock("https://127.0.0.1")
                .get("/.well-known/host-meta.json")
                .replyWithError(Object.assign(new Error("Connection refused"), {code: "ECONNREFUSED"}));

            nock("http://localhost")
                .get("/.well-known/host-meta.json")
                .reply(404, "Not found");

            nock("http://localhost")
                .get("/.well-known/host-meta")
                .reply(200, "<?xml version='1.0' encoding='UTF-8'?>\n<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>\n<Link rel='lrdd' type='application/xrd+xml' template='http://localhost/lrdd?uri={uri}' /></XRD>", {"Content-Type": "application/xrd+xml"});

            nock("http://localhost")
                .get("/lrdd")
                .query({"uri": "http://localhost/profile/alice"})
                .reply(200, "<?xml version='1.0' encoding='UTF-8'?>\n<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>\n<Subject>http://localhost/profile/alice</Subject><Link rel='feed' href='http://localhost/profile/alice/feed' /></XRD>", {"Content-Type": "application/xrd+xml"});
        });

        it("it installs the HTTP fixtures", function() {
            assert.ok(nock.activeMocks().length > 0);
        });

        describe("and we get an http URL's metadata", function() {
            var jrd;

            before(async function() {
                jrd = await wf.webfinger("http://localhost/profile/alice");
            }, {timeout: 10000});

            it("it works", function() {
                assert.ok(jrd !== null && typeof jrd === "object" && !Array.isArray(jrd));
            });

            it("it has the link", function() {
                assert.ok(jrd !== null && typeof jrd === "object" && !Array.isArray(jrd));
                assert.ok(Object.hasOwn(jrd, "links"));
                assert.ok(Array.isArray(jrd.links));
                assert.strictEqual(jrd.links.length, 1);
                assert.ok(jrd.links[0] !== null && typeof jrd.links[0] === "object" && !Array.isArray(jrd.links[0]));
                assert.ok(Object.hasOwn(jrd.links[0], "rel"));
                assert.equal(jrd.links[0].rel, "feed");
                assert.ok(Object.hasOwn(jrd.links[0], "href"));
                assert.equal(jrd.links[0].href, "http://localhost/profile/alice/feed");
            });
        });
    });
});
