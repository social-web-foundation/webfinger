// webfinger-extended-test.js
//
// Test extended properties in XRD output
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
                .reply(200, "<?xml version='1.0' encoding='UTF-8'?>\n<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>\n<Subject>acct:alice@localhost</Subject>\n<Alias>http://localhost/profile/alice</Alias>\n<Alias>http://localhost/user/1</Alias>\n<Link rel='profile' href='http://localhost/profile/alice' />\n<Link rel='http://apinamespace.org/atom' type='application/atomsvc+xml' href='http://localhost/app/alice.atom'><Property type='http://apinamespace.org/atom/username'>alice</Property></Link></XRD>", {"Content-Type": "application/xrd+xml"});
        });

        it("it installs the HTTP fixtures", function() {
            assert.ok(nock.activeMocks().length > 0);
        });

        describe("and we get a webfinger's metadata", function() {
            var err, jrd;

            before(function(context, done) {
                var onResult = function(error, value1) {
                    err = error;
                    jrd = value1;
                    done(error);
                };

                wf.webfinger("alice@localhost", onResult);
            }, {timeout: 10000});

            it("it works", function() {
                assert.ifError(err);
                assert.ok(jrd !== null && typeof jrd === "object" && !Array.isArray(jrd));
            });

            it("it has the links", function() {
                assert.ifError(err);
                assert.ok(jrd !== null && typeof jrd === "object" && !Array.isArray(jrd));
                assert.ok(Object.hasOwn(jrd, "links"));
                assert.ok(Array.isArray(jrd.links));
                assert.strictEqual(jrd.links.length, 2);
                assert.ok(jrd.links[0] !== null && typeof jrd.links[0] === "object" && !Array.isArray(jrd.links[0]));
                assert.ok(Object.hasOwn(jrd.links[0], "rel"));
                assert.equal(jrd.links[0].rel, "profile");
                assert.ok(Object.hasOwn(jrd.links[0], "href"));
                assert.equal(jrd.links[0].href, "http://localhost/profile/alice");
                assert.ok(jrd.links[1] !== null && typeof jrd.links[1] === "object" && !Array.isArray(jrd.links[1]));
                assert.ok(Object.hasOwn(jrd.links[1], "rel"));
                assert.equal(jrd.links[1].rel, "http://apinamespace.org/atom");
                assert.ok(Object.hasOwn(jrd.links[1], "type"));
                assert.equal(jrd.links[1].type, "application/atomsvc+xml");
                assert.ok(Object.hasOwn(jrd.links[1], "href"));
                assert.equal(jrd.links[1].href, "http://localhost/app/alice.atom");
                assert.ok(Object.hasOwn(jrd.links[1], "properties"));
                assert.ok(jrd.links[1].properties !== null && typeof jrd.links[1].properties === "object" && !Array.isArray(jrd.links[1].properties));
                assert.ok(Object.hasOwn(jrd.links[1].properties, "http://apinamespace.org/atom/username"));
                assert.equal(jrd.links[1].properties["http://apinamespace.org/atom/username"], "alice");
            });

            it("it has the subject", function() {
                assert.ifError(err);
                assert.ok(jrd !== null && typeof jrd === "object" && !Array.isArray(jrd));
                assert.ok(Object.hasOwn(jrd, "subject"));
                assert.strictEqual(typeof jrd.subject, "string");
                assert.equal(jrd.subject, "acct:alice@localhost");
            });

            it("it has the alias", function() {
                assert.ifError(err);
                assert.ok(jrd !== null && typeof jrd === "object" && !Array.isArray(jrd));
                assert.ok(Object.hasOwn(jrd, "aliases"));
                assert.ok(Array.isArray(jrd.aliases));
                assert.strictEqual(jrd.aliases.length, 2);
                assert.strictEqual(typeof jrd.aliases[0], "string");
                assert.equal(jrd.aliases[0], "http://localhost/profile/alice");
                assert.strictEqual(typeof jrd.aliases[1], "string");
                assert.equal(jrd.aliases[1], "http://localhost/user/1");
            });
        });
    });
});
