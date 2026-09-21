// hostmeta-404-test.js
//
// Test webfinger when the hostmeta endpoint is missing
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

describe("Test missing hostmeta endpoint", function() {
    describe("When we run an HTTP app that does not support host-meta", function() {
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
            app.get("/.well-known/host-meta", function(req, res) {
                res.send(404, 'No such resource');
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

        describe("and we get its host-meta data", function() {
            var err, jrd;

            before(function(context, done) {
                var onResult = function(error, value1) {
                    err = error;
                    jrd = value1;
                    done(error);
                };

                var callback = onResult;
                wf.hostmeta("localhost", function(err, jrd) {
                    if (err) {
                        callback(null);
                    } else {
                        callback(new Error("Unexpected success!"));
                    }
                });
            }, {timeout: 10000});

            it("it works", function() {
                assert.ifError(err);
            });
        });
    });
});
