// hostmeta-test.js
//
// Test the module interface
//
// Copyright 2012-2013 E14N https://e14n.com/
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
    wf = require("../lib/webfinger");

var {describe, it} = require("node:test");
var {useNock} = require("./helpers/nock");

describe("Test hostmeta for bad domain", function() {
    useNock();

    [
        ["When we get host-meta data for a .invalid domain", "host-meta.invalid"],
        ["When we get host-meta data for a .example domain", "host-meta.example"],
        ["When we get host-meta data for example.com", "example.com"],
        ["When we get host-meta data for example.org", "example.org"],
        ["When we get host-meta data for example.net", "example.net"]
    ].forEach(function([name, domain]) {
        describe(name, function() {
            it("it works", async function() {
                await assert.rejects(wf.hostmeta(domain), {
                    message: "Invalid hostname: " + domain
                });
            });
        });
    });
});
