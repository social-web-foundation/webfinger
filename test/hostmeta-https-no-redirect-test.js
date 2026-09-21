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

var Step = require("step"),
    fs = require("fs"),
    path = require("path"),
    https = require("https"),
    assert = require("node:assert"),
    express = require("express"),
    wf = require("../lib/webfinger");

var {describe, it, before, after} = require("node:test");
var {listen, closeServers} = require("./helpers/servers");
var http = require("node:http");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe("hostmeta shouldn't redirect to http if https-only flag set", function() {
    describe("When we run an HTTPS app that redirects to an HTTP app for hostmeta", function() {
        var err, hm, hm2;
        var servers = [];

        before(function(context, done) {
            var onResult = function(error, value1, value2) {
                err = error;
                hm = value1;
                hm2 = value2;
                done(error);
            };

            hm = express();
            hm2 = express();
            var callback = onResult;

            // parse queries
            hm.use(express.query());

            hm.get("/.well-known/host-meta.json", function(req, res) {
                res.redirect(307, "http://localhost/.well-known/host-meta.json");
            });

            // parse queries
            hm2.use(express.query());

            hm2.get("/.well-known/host-meta.json", function(req, res) {
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

            hm.on("error", function(err) {
                callback(err, null);
            });

            hm2.on("error", function(err) {
                callback(err, null);
            });

            Step(
                function() {
                    var opts = {key: fs.readFileSync(path.join(__dirname, "data", "localhost.key")),
                                cert: fs.readFileSync(path.join(__dirname, "data", "localhost.crt"))};

                    listen(servers, https.createServer(opts, hm), 443, this.parallel());
                    listen(servers, http.createServer(hm2), 80, this.parallel());
                },
                function(err) {
                    callback(err, hm, hm2);
                }
            );
        }, {timeout: 10000});

        after(function() {
            return closeServers(servers);
        });

        it("it works", function() {
            assert.ifError(err);
            assert.strictEqual(typeof hm, "function");
            assert.strictEqual(typeof hm2, "function");
        });

        describe("and we get hostmeta data with httpsOnly flag set", function() {
            var err, jrd;

            before(function(context, done) {
                var onResult = function(error, value1) {
                    err = error;
                    jrd = value1;
                    done(error);
                };

                var callback = onResult;
                wf.hostmeta("localhost", {httpsOnly: true}, function(err, jrd) {
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
