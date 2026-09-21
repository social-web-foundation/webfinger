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
    express = require("express"),
    wf = require("../lib/webfinger");

var {describe, it, before, after} = require("node:test");
var {listen, closeServers} = require("./helpers/servers");
var http = require("node:http");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe("webfinger httpsOnly flag causes error", function() {
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

            app.get("/.well-known/host-meta.json", function(req, res) {
                res.json({
                    links: [
                        {
                            rel: "lrdd",
                            type: "application/json",
                            template: "http://localhost/lrdd.json?uri={uri}"
                        }
                    ]
                });
            });
            app.get("/lrdd.json", function(req, res) {
                var uri = req.query.uri,
                    parts = uri.split("@"),
                    username = parts[0],
                    hostname = parts[1];

                if (username.substr(0, 5) == "acct:") {
                    username = username.substr(5);
                }

                res.json({
                    links: [
                        {
                            rel: "profile",
                            href: "http://localhost/profile/" + username
                        }
                    ]
                });
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

        describe("and we get a webfinger with https-only flag set", function() {
            var err, jrd;

            before(function(context, done) {
                var onResult = function(error, value1) {
                    err = error;
                    jrd = value1;
                    done(error);
                };

                var callback = onResult;
                wf.webfinger("alice@localhost", null, {httpsOnly: true}, function(err, jrd) {
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
