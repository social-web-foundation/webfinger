// index.js
//
// main module for Webfinger
//
// Copyright 2012, E14N https://e14n.com/
// Copyright 2026, Social Web Foundation https://socialwebfoundation.org/
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

var querystring = require("querystring");

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

function protocolOf(str) {
    const m = str.match(/^([A-Za-z][A-Za-z0-9+.-]*):/)
    return (m) ? m[1] : null
}

var webfinger = async function(resource, rel = null, options = {}) {

    let hostname;

    let protocol = protocolOf(resource);

    if (protocol === null) {
        if (resource.indexOf('@') !== -1) {
            resource = 'acct:' + resource;
            protocol = 'acct';
        } else {
            throw new Error(`${resource} is not an URI`)
        }
    }

    if (protocol === 'acct') {
        const parts = resource.slice(6).split('@')
        hostname = parts[1]
    } else {
        const parsed = URL.parse(resource)
        hostname = parsed.hostname
    }

    if (!hostname) {
        throw new Error(`No hostname for ${resource}`)
    }

    if (invalidHostname(hostname)) {
        throw new Error("Invalid hostname: " + hostname);
    }

    var params,
        qs;

    params = {
        resource: resource
    };

    if (rel) {
        params.rel = rel;
    }

    qs = querystring.stringify(params);

    const url = `https://${hostname}/.well-known/webfinger?${qs}`;

    const res = await fetch(url, {
        headers: {
            'Accept': 'application/jrd+json;q=1.0, application/json;q=0.5',
        }
    });

    if (res.status !== 200) {
        throw new Error(`Webfinger not supported: ${hostname}`)
    }

    let jrd = null;

    try {
        jrd = await res.json()
    } catch (err) {
        throw new Error('Invalid JSON')
    }

    return jrd;
};

exports.webfinger = webfinger;
