// webfinger-https-no-redirect-test.js
//
// Test that requests for Webfinger won't redirect to HTTP for redirect
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
    assert = require("node:assert"),
    express = require("express"),
    https = require("https"),
    wf = require("../lib/webfinger"),
    fs = require("fs"),
    path = require("path");

var {describe, it, before, after} = require("node:test");
var {listen, closeServers} = require("./helpers/servers");
var http = require("node:http");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe("Webfinger should not redirect to HTTP", function() {
    describe("When we run an HTTPS app that redirects to HTTP for Webfinger", function() {
        var err, app, sapp;
        var servers = [];

        before(function(context, done) {
            var onResult = function(error, value1, value2) {
                err = error;
                app = value1;
                sapp = value2;
                done(error);
            };

            app = express();
            sapp = express();
            var opts;
            var callback = onResult;

            // Secure app redirects to insecure

            sapp.get("/.well-known/webfinger", function(req, res) {
                var host = req.header('Host');
                res.redirect(303, 'http://'+host+req.url);
            });

            app.get("/.well-known/webfinger", function(req, res) {
                var uri = req.query.resource,
                    parts = uri.split("@"),
                    username = parts[0],
                    hostname = parts[1];

                res.json({
                    subject: uri,
                    links: [
                        {
                            rel: "profile",
                            href: "https://localhost/profile/" + username
                        }
                    ]
                });
            });

            app.on("error", function(err) {
                callback(err, null);
            });

            opts = {key: fs.readFileSync(path.join(__dirname, "data", "localhost.key")),
                    cert: fs.readFileSync(path.join(__dirname, "data", "localhost.crt"))};

            Step(
                function() {
                    listen(servers, https.createServer(opts, sapp), 443, this.parallel());
                    listen(servers, http.createServer(app), 80, this.parallel());
                },
                function(err) {
                    callback(err, app, sapp);
                }
            );
        }, {timeout: 10000});

        after(function() {
            return closeServers(servers);
        });

        it("it works", function() {
            assert.ifError(err);
            assert.strictEqual(typeof app, "function");
            assert.strictEqual(typeof sapp, "function");
        });

        describe("and we get a Webfinger", function() {
            var err;

            before(function(context, done) {
                var onResult = function(error) {
                    err = error;
                    done(error);
                };

                var callback = onResult;
                wf.webfinger("alice@localhost", function(err, jrd) {
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
