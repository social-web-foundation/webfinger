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
                    parts = uri.split("@"),
                    username = parts[0],
                    hostname = parts[1];

                if (username.substr(0, 5) == "acct:") {
                    username = username.substr(5);
                }

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

        describe("and we do LRDD discovery", function() {
            var err;

            before(function(context, done) {
                var onResult = function(error) {
                    err = error;
                    done(error);
                };

                var callback = onResult;

                wf.lrdd("alice@localhost", function(err, jrd) {
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
