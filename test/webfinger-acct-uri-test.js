// webfinger-only-test.js
//
// Test discovery just using Webfinger without host-meta
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

    describe("When an HTTPS service just supports Webfinger", function() {
        before(function() {
            nock("https://localhost")
                .get("/.well-known/webfinger")
                .query({"resource": "acct:alice@localhost"})
                .reply(200, {"subject": "acct:alice@localhost", "links": [{"rel": "profile", "href": "https://localhost/profile/alice"}]});
        });

        it("it installs the HTTP fixtures", function() {
            assert.ok(nock.activeMocks().length > 0);
        });

        describe("and we get a Webfinger", function() {
            var err, jrd;

            before(function(context, done) {
                var onResult = function(error, value1) {
                    err = error;
                    jrd = value1;
                    done(error);
                };

                wf.webfinger("acct:alice@localhost", onResult);
            }, {timeout: 10000});

            it("it works", function() {
                assert.ifError(err);
                assert.ok(jrd !== null && typeof jrd === "object" && !Array.isArray(jrd));
            });

            it("it has the link", function() {
                assert.ifError(err);
                assert.ok(jrd !== null && typeof jrd === "object" && !Array.isArray(jrd));
                assert.ok(Object.hasOwn(jrd, "links"));
                assert.ok(Array.isArray(jrd.links));
                assert.strictEqual(jrd.links.length, 1);
                assert.ok(jrd.links[0] !== null && typeof jrd.links[0] === "object" && !Array.isArray(jrd.links[0]));
                assert.ok(Object.hasOwn(jrd.links[0], "rel"));
                assert.equal(jrd.links[0].rel, "profile");
                assert.ok(Object.hasOwn(jrd.links[0], "href"));
                assert.equal(jrd.links[0].href, "https://localhost/profile/alice");
            });
        });
    });
});
