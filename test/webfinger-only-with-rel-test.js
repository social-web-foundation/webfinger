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
    express = require("express"),
    https = require("https"),
    wf = require("../lib/webfinger"),
    fs = require("fs"),
    path = require("path");

var {describe, it, before, after} = require("node:test");
var {listen, closeServers} = require("./helpers/servers");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe("RFC6415 (host-meta) interface", function() {
    describe("When we run an HTTPS app that just supports Webfinger", function() {
        var err, app;
        var servers = [];

        before(function(context, done) {
            var onResult = function(error, value1) {
                err = error;
                app = value1;
                done(error);
            };

            app = express();
            var opts;
            var callback = onResult;

            app.get("/.well-known/webfinger", function(req, res) {
                var uri = req.query.resource,
                    rel = req.query.rel,
                    parts = uri.split("@"),
                    username = parts[0],
                    hostname = parts[1],
                    result = {
                        subject: uri,
                        links: []
                    };

                if (username.substr(0, 5) == "acct:") {
                    username = username.substr(5);
                }

                if (!rel || rel == "profile") {
                    result.links.push({rel: "profile",
                                       href: "https://localhost/profile/" + username});
                }

                if (!rel || rel == "avatar") {
                    result.links.push({rel: "avatar",
                                       href: "https://localhost/avatar/" + username + ".png"});
                }

                res.json(result);
            });

            app.on("error", function(err) {
                callback(err, null);
            });

            opts = {key: fs.readFileSync(path.join(__dirname, "data", "localhost.key")),
                    cert: fs.readFileSync(path.join(__dirname, "data", "localhost.crt"))};

            listen(servers, https.createServer(opts, app), 443, function(err) {
                callback(err, app);
            });
        }, {timeout: 10000});

        after(function() {
            return closeServers(servers);
        });

        it("it works", function() {
            assert.ifError(err);
        });

        describe("and we get a single Webfinger rel", function() {
            var err, jrd;

            before(function(context, done) {
                var onResult = function(error, value1) {
                    err = error;
                    jrd = value1;
                    done(error);
                };

                wf.webfinger("alice@localhost", "profile", onResult);
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
                assert.strictEqual(jrd.links.length, 1);
                assert.ok(jrd.links[0] !== null && typeof jrd.links[0] === "object" && !Array.isArray(jrd.links[0]));
                assert.ok(Object.hasOwn(jrd.links[0], "rel"));
                assert.equal(jrd.links[0].rel, "profile");
                assert.ok(Object.hasOwn(jrd.links[0], "href"));
                assert.equal(jrd.links[0].href, "https://localhost/profile/alice");
            });
        });

        describe("and we get the other Webfinger rel", function() {
            var err, jrd;

            before(function(context, done) {
                var onResult = function(error, value1) {
                    err = error;
                    jrd = value1;
                    done(error);
                };

                wf.webfinger("alice@localhost", "avatar", onResult);
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
                assert.strictEqual(jrd.links.length, 1);
                assert.ok(jrd.links[0] !== null && typeof jrd.links[0] === "object" && !Array.isArray(jrd.links[0]));
                assert.ok(Object.hasOwn(jrd.links[0], "rel"));
                assert.equal(jrd.links[0].rel, "avatar");
                assert.ok(Object.hasOwn(jrd.links[0], "href"));
                assert.equal(jrd.links[0].href, "https://localhost/avatar/alice.png");
            });
        });

        describe("and we get an unrecognized Webfinger rel", function() {
            var err, jrd;

            before(function(context, done) {
                var onResult = function(error, value1) {
                    err = error;
                    jrd = value1;
                    done(error);
                };

                wf.webfinger("alice@localhost", "http://web.example/unrecognized", onResult);
            }, {timeout: 10000});

            it("it works", function() {
                assert.ifError(err);
                assert.ok(jrd !== null && typeof jrd === "object" && !Array.isArray(jrd));
            });

            it("it has no links", function() {
                assert.ifError(err);
                assert.ok(jrd !== null && typeof jrd === "object" && !Array.isArray(jrd));
                assert.ok(Object.hasOwn(jrd, "links"));
                assert.ok(Array.isArray(jrd.links));
                assert.strictEqual(jrd.links.length, 0);
            });
        });
    });
});
