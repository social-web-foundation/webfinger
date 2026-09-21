// hostmeta-test.js
//
// Test the module interface
//
// Copyright 2012, E14N https://e14n.com/
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
                .query({"resource": "acct:alice@localhost"})
                .replyWithError(Object.assign(new Error("Connection refused"), {code: "ECONNREFUSED"}));

            nock("https://localhost")
                .get("/.well-known/webfinger")
                .query({"resource": "alice@localhost"})
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
                .query({"uri": "acct:alice@localhost"})
                .reply(200, "<?xml version='1.0' encoding='UTF-8'?>\n<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>\n<Subject>acct:alice@localhost</Subject><Link rel='profile' href='http://localhost/profile/alice' /></XRD>", {"Content-Type": "application/xrd+xml"});
        });

        it("it installs the HTTP fixtures", function() {
            assert.ok(nock.activeMocks().length > 0);
        });

        describe("and we get a webfinger's metadata", function() {
            var jrd;

            before(async function() {
                jrd = await wf.webfinger("alice@localhost");
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
                assert.equal(jrd.links[0].rel, "profile");
                assert.ok(Object.hasOwn(jrd.links[0], "href"));
                assert.equal(jrd.links[0].href, "http://localhost/profile/alice");
            });
        });
    });
});
