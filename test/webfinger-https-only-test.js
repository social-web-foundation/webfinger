// webfinger-https-only-test.js
//
// Test the httpsOnly flag for the webfinger function
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
var {useNock, forbid} = require("./helpers/nock");

describe("webfinger httpsOnly flag causes error", function() {
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

            forbid(nock("http://localhost"))
                .get("/.well-known/host-meta.json")
                .optionally()
                .reply(200, {"links": [{"rel": "lrdd", "type": "application/json", "template": "http://localhost/lrdd.json?uri={uri}"}]});

            forbid(nock("http://localhost"))
                .get("/lrdd.json")
                .query({"uri": "acct:alice@localhost"})
                .optionally()
                .reply(200, {"subject": "acct:alice@localhost", "links": [{"rel": "profile", "href": "http://localhost/profile/alice"}]});

            forbid(nock("http://localhost"))
                .get("/lrdd.json")
                .query({"uri": "alice@localhost"})
                .optionally()
                .reply(200, {"subject": "alice@localhost", "links": [{"rel": "profile", "href": "http://localhost/profile/alice"}]});
        });

        it("it installs the HTTP fixtures", function() {
            assert.ok(nock.activeMocks().length > 0);
        });

        describe("and we get a webfinger with https-only flag set", function() {
            it("it fails correctly", async function() {
                await assert.rejects(wf.webfinger("alice@localhost", null, {httpsOnly: true}));
            }, {timeout: 10000});
        });
    });
});
