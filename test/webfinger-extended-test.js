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
    express = require("express"),
    wf = require("../lib/webfinger");

var {describe, it, before, after} = require("node:test");
var {listen, closeServers} = require("./helpers/servers");
var http = require("node:http");

describe("RFC6415 (host-meta) interface", function() {
    describe("When we run an HTTP app that just supports host-meta with XRD", function() {
        var err, app;
        var servers = [];

        before(function(context, done) {
            var onResult = function(error, value1) {
                err = error;
                app = value1;
                done(error);
            };

            app = express();
            var callback = onResult;

            // parse queries
            app.use(express.query());

            app.get("/.well-known/host-meta", function(req, res) {
                res.status(200);
                res.set("Content-Type", "application/xrd+xml");
                res.end("<?xml version='1.0' encoding='UTF-8'?>\n"+
                        "<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>\n" +
                        "<Link rel='lrdd' type='application/xrd+xml' template='http://localhost/lrdd?uri={uri}' />"+
                        "</XRD>");
            });
            app.get("/lrdd", function(req, res) {
                var uri = req.query.uri,
                    parts = uri.split("@"),
                    username = parts[0],
                    hostname = parts[1];

                if (username.substr(0, 5) == "acct:") {
                    username = username.substr(5);
                }

                res.status(200);
                res.set("Content-Type", "application/xrd+xml");
                res.end("<?xml version='1.0' encoding='UTF-8'?>\n"+
                        "<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>\n" +
                        "<Subject>"+uri+"</Subject>\n"+
                        "<Alias>http://localhost/profile/"+username+"</Alias>\n"+
                        "<Alias>http://localhost/user/1</Alias>\n"+
                        "<Link rel='profile' href='http://localhost/profile/"+username+"' />\n"+
                        "<Link rel='http://apinamespace.org/atom' type='application/atomsvc+xml'"+
                        " href='http://localhost/app/"+username+".atom'>"+
                         "<Property type='http://apinamespace.org/atom/username'>"+username+"</Property></Link>"+
                        "</XRD>");
            });
            app.on("error", function(err) {
                callback(err, null);
            });
            listen(servers, http.createServer(app), 80, function(err) {
                callback(err, app);
            });
        }, {timeout: 10000});

        after(function() {
            return closeServers(servers);
        });

        it("it works", function() {
            assert.ifError(err);
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
