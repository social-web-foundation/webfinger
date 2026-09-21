// webfinger-only-lrdd-test.js
//
// Test LRDD discovery on a server that only supports Webfinger
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

describe("RFC6415 (host-meta) interface", function() {
    useNock();

    describe("When an HTTPS service just supports Webfinger", function() {
        before(function() {
            nock("https://127.0.0.1")
                .get("/.well-known/host-meta.json")
                .reply(404, "Not found");

            nock("https://localhost")
                .get("/.well-known/host-meta")
                .reply(404, "Not found");

            nock("http://localhost")
                .get("/.well-known/host-meta.json")
                .replyWithError(Object.assign(new Error("Connection refused"), {code: "ECONNREFUSED"}));

            forbid(nock("https://localhost"))
                .get("/.well-known/webfinger")
                .query({"resource": "acct:alice@localhost"})
                .optionally()
                .reply(200, {"subject": "acct:alice@localhost", "links": [{"rel": "profile", "href": "https://localhost/profile/alice"}]});
        });

        it("it installs the HTTP fixtures", function() {
            assert.ok(nock.activeMocks().length > 0);
        });

        describe("and we do LRDD discovery", function() {
            it("it fails correctly", async function() {
                await assert.rejects(wf.lrdd("alice@localhost"));
            }, {timeout: 10000});
        });
    });
});
