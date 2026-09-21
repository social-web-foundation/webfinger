// hostmeta-test.js
//
// Test the module interface
//
// Copyright 2012, StatusNet Inc.
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

            forbid(nock("http://localhost"))
                .get("/.well-known/host-meta")
                .optionally()
                .reply(200, "<?xml version='1.0' encoding='UTF-8'?>\n<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>\n<Link rel='lrdd' type='application/xrd+xml' template='http://localhost/lrdd?uri={uri}' /></XRD>", {"Content-Type": "application/xrd+xml"});

            forbid(nock("http://localhost"))
                .get("/lrdd")
                .query({"uri": "acct:alice@localhost"})
                .optionally()
                .reply(200, "<?xml version='1.0' encoding='UTF-8'?>\n<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>\n<Subject>acct:alice@localhost</Subject><Link rel='profile' href='http://localhost/profile/alice' /></XRD>", {"Content-Type": "application/xrd+xml"});
        });

        it("it installs the HTTP fixtures", function() {
            assert.ok(nock.activeMocks().length > 0);
        });

        describe("and we get a webfinger with the webfingerOnly flag set", function() {
            var err;

            before(function(context, done) {
                var onResult = function(error) {
                    err = error;
                    done(error);
                };

                var callback = onResult;
                wf.webfinger("alice@localhost", null, {webfingerOnly: true}, function(err, jrd) {
                    if (err) {
                        callback(null);
                    } else {
                        callback(new Error("Unexpected success"));
                    }
                });
            }, {timeout: 10000});

            it("it fails correctly", function() {
                assert.ifError(err);
            });
        });
    });
});
