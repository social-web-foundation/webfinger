// module-test.js
//
// Test the module interface
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

var assert = require("node:assert");

var {describe, it, before} = require("node:test");

describe("Webfinger module interface", function() {
    describe("When we get the app module", function() {
        var mod;

        before(function() {
            mod = require("../lib/webfinger");
        });

        it("there is one", function() {
            assert.ok(mod !== null && typeof mod === "object" && !Array.isArray(mod));
        });

        it("it has the xrd2jrd() export", function() {
            assert.strictEqual(typeof mod.xrd2jrd, "function");
        });

        it("it has the webfinger() export", function() {
            assert.strictEqual(typeof mod.webfinger, "function");
        });

        it("it has the hostmeta() export", function() {
            assert.strictEqual(typeof mod.hostmeta, "function");
        });

        it("it has the discover() export", function() {
            assert.strictEqual(typeof mod.discover, "function");
        });
    });
});
