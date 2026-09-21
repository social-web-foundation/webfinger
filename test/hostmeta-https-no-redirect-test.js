// hostmeta-https-no-redirect-test.js
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

describe("hostmeta shouldn't redirect to http if https-only flag set", function() {
    useNock();

    describe("When an HTTPS service redirects to an HTTP service for hostmeta", function() {
        before(function() {
            nock("https://127.0.0.1")
                .get("/.well-known/host-meta.json")
                .reply(307, "Redirect", {"Location": "http://localhost/.well-known/host-meta.json"});

            nock("https://localhost")
                .get("/.well-known/host-meta")
                .reply(404, "Not found");

            forbid(nock("http://localhost"))
                .get("/.well-known/host-meta.json")
                .optionally()
                .reply(200, {"links": [{"rel": "lrdd", "type": "application/json", "template": "http://localhost/lrdd.json?uri={uri}"}]});
        });

        it("it installs the HTTP fixtures", function() {
            assert.ok(nock.activeMocks().length > 0);
        });

        describe("and we get hostmeta data with httpsOnly flag set", function() {
            it("it fails correctly", async function() {
                await assert.rejects(wf.hostmeta("localhost", {httpsOnly: true}));
            }, {timeout: 10000});
        });
    });
});
