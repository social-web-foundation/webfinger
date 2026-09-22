// index.js
//
// main module for Webfinger
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

var dns = require("node:dns").promises,
    http = require("http"),
    https = require("https"),
    url = require("url"),
    querystring = require("querystring");

var JSONTYPE = "application/json",
    JRDTYPE = "application/jrd+json",
    XRDTYPE = "application/xrd+xml";

var jrd = async function(body) {
    return JSON.parse(body);
};

var request = async function(module, options, parsers) {
    var types = [], prop;

    for (prop in parsers) {
        if (parsers.hasOwnProperty(prop)) {
            types.push(prop);
        }
    }

    var response = await new Promise(function(resolve, reject) {
        var req = module.request(options, function(res) {
            var body = "";

            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                body = body + chunk;
            });
            res.on('error', reject);
            res.on('end', function() {
                resolve({res: res, body: body});
            });
        });

        req.on('error', reject);
        req.end();
    });

    var res = response.res,
        body = response.body,
        ct, matched, parser, newopts;

    if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
        newopts = url.parse(res.headers.location);

        if (options.httpsOnly && newopts.protocol != "https:") {
            throw new Error("Refusing to redirect to non-HTTPS url: " + res.headers.location);
        }

        newopts.httpsOnly = options.httpsOnly;
        return await request(((newopts.protocol == "https:") ? https : http), newopts, parsers);
    } else if (res.statusCode !== 200) {
        throw new Error("Bad response code: " + res.statusCode + ":" + body);
    }

    if (!res.headers["content-type"]) {
        throw new Error("No Content-Type header");
    }

    ct = res.headers["content-type"];
    matched = types.filter(function(type) { return (ct.substr(0, type.length) == type); });

    if (matched.length == 0) {
        throw new Error("Content-Type '"+ct+"' does not match any expected types: "+types.join(","));
    }

    parser = parsers[matched];
    return await parser(body);
};

var invalidHostname = function(hostname) {
    var examples = ["example.com", "example.org", "example.net"],
        tlds = ["example", "invalid"],
        parts;

    if (examples.indexOf(hostname.toLowerCase()) != -1) {
        return true;
    }

    parts = hostname.split(".");

    if (tlds.indexOf(parts[parts.length - 1]) != -1) {
        return true;
    }

    return false;
};

var httpsWebfinger = async function(hostname, resource, rel) {

    var params,
        qs,
        options;

    params = {
        resource: resource
    };

    if (rel) {
        params.rel = rel;
    }

    qs = querystring.stringify(params),

    options = {
        hostname: hostname,
        port: 443,
        path: "/.well-known/webfinger?" + qs,
        method: "GET",
        httpsOnly: true
    };

    return await request(https, options, {"application/json": jrd, [JRDTYPE]: jrd});
};

var webfinger = async function(resource, rel = null, options = {}) {

    var parsed,
        hostname;

    // Prefix it with acct: if it looks like a bare webfinger

    if (resource.indexOf(":") === -1) {
        if (resource.indexOf("@") !== -1) {
            resource = "acct:" + resource;
        }
    }

    parsed = url.parse(resource);

    hostname = parsed.hostname;

    if (invalidHostname(hostname)) {
        throw new Error("Invalid hostname: " + hostname);
    }

    return await httpsWebfinger(hostname, resource, rel);
};

exports.webfinger = webfinger;
