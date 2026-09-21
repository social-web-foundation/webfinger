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
    promisify = require("node:util").promisify,
    http = require("http"),
    https = require("https"),
    xml2js = require("xml2js"),
    url = require("url"),
    querystring = require("querystring");

var JSONTYPE = "application/json",
    JRDTYPE = "application/jrd+json",
    XRDTYPE = "application/xrd+xml";

var xrd2jrd = async function(str) {
    var
    getProperty = function(obj, Property) {
        var k, v;
        if (Property.hasOwnProperty("@")) {

            if (Property["@"].hasOwnProperty("type")) {
                k = Property["@"]["type"];
            }

            if (Property["@"].hasOwnProperty("xsi:nil") && Property["@"]["xsi:nil"] == "true") {
                obj[k] = null;
            } else if (Property.hasOwnProperty("#")) {
                obj[k] = Property["#"];
            } else {
                // TODO: log this
            }
        }
    },
    getTitle = function(obj, Title) {
        var k = "default";
        if (typeof(Title) == "string") {
            obj[k] = Title;
        } else {
            if (Title.hasOwnProperty("@")) {
                if (Title["@"].hasOwnProperty("xml:lang")) {
                    k = Title["@"]["xml:lang"];
                }
            }
            if (Title.hasOwnProperty("#")) {
                obj[k] = Title["#"];
            }
        }
    },
    getLink = function(Link) {
        var prop, i, l, k, v, Property, Title;
        l = {};
        if (Link.hasOwnProperty("@")) {
            for (prop in Link["@"]) {
                if (Link["@"].hasOwnProperty(prop)) {
                    l[prop] = Link["@"][prop];
                }
            }
        }
        if (Link.hasOwnProperty("Property")) { // groan
            l.properties = {};
            if (Array.isArray(Link.Property)) {
                for (i = 0; i < Link.Property.length; i++) {
                    getProperty(l.properties, Link.Property[i]);
                }
            } else {
                getProperty(l.properties, Link.Property);
            }
        }
        if (Link.hasOwnProperty("Title")) {
            l.titles = {};
            if (Array.isArray(Link.Title)) {
                for (i = 0; i < Link.Title.length; i++) {
                    getTitle(l.titles, Link.Title[i]);
                }
            } else {
                getTitle(l.titles, Link.Title);
            }
        }
        return l;
    };
    var parser = new xml2js.Parser();
    var doc = await promisify(parser.parseString).call(parser, str);
    var Link, jrd = {}, i, prop, l;

    // XXX: Booooooo! This is bletcherous.
    if (doc.hasOwnProperty("Subject")) {
        if (Array.isArray(doc.Subject)) {
            jrd.subject = doc.Subject[0];
        } else {
            jrd.subject = doc.Subject;
        }
    }
    if (doc.hasOwnProperty("Expires")) {
        if (Array.isArray(doc.Expires)) {
            jrd.expires = doc.Expires[0];
        } else {
            jrd.expires = doc.Expires;
        }
    }
    if (doc.hasOwnProperty("Alias")) {
        if (Array.isArray(doc.Alias)) {
            jrd.aliases = doc.Alias;
        } else {
            jrd.aliases = [doc.Alias];
        }
    }
    if (doc.hasOwnProperty("Property")) {
        jrd.properties = {};
        if (Array.isArray(doc.Property)) {
            for (i = 0; i < doc.Property.length; i++) {
                getProperty(jrd.properties, doc.Property[i]);
            }
        } else {
            getProperty(jrd.properties, doc.Property);
        }
    }
    if (doc.hasOwnProperty("Link")) {
        Link = doc.Link;
        jrd.links = [];
        if (Array.isArray(Link)) {
            for (i = 0; i < Link.length; i++) {
                jrd.links.push(getLink(Link[i]));
            }
        } else {
            jrd.links.push(getLink(Link));
        }
    }
    return jrd;
};

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

var httpHostMeta = async function(address) {

    var options = {
        hostname: address,
        port: 80,
        path: "/.well-known/host-meta",
        method: "GET",
        headers: {
            accept: "application/json, application/xrd+xml; q=0.5"
        }
    };

    return await request(http, options, {"application/json": jrd, "application/xrd+xml": xrd2jrd});
};

var httpHostMetaJSON = async function(address) {

    var options = {
        hostname: address,
        port: 80,
        path: "/.well-known/host-meta.json",
        method: "GET"
    };

    return await request(http, options, {"application/json": jrd});
};

var httpsHostMeta = async function(address, httpsOnly) {
    var options = {
        hostname: address,
        port: 443,
        path: "/.well-known/host-meta",
        method: "GET",
        headers: {
            accept: "application/json, application/xrd+xml; q=0.5"
        },
        httpsOnly: httpsOnly
    };

    return await request(https, options, {"application/json": jrd, "application/xrd+xml": xrd2jrd});
};

var httpsHostMetaJSON = async function(address, httpsOnly) {

    var options = {
        hostname: address,
        port: 443,
        path: "/.well-known/host-meta.json",
        method: "GET",
        httpsOnly: httpsOnly
    };

    return await request(https, options, {"application/json": jrd});
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

var hostmeta = async function(address, options = {}) {
    if (invalidHostname(address)) {
        throw new Error("Invalid hostname: " + address);
    }

    var resolved = await dns.lookup(address);

    try {
        try {
            return await httpsHostMetaJSON(resolved.address, options.httpsOnly);
        } catch (err) {
            if (err.code == 'ECONNREFUSED') {
                throw err;
            }
        }
        return await httpsHostMeta(address, options.httpsOnly);
    } catch (err) {
        if (options.httpsOnly) {
            throw new Error("No HTTPS endpoint worked");
        }
    }

    try {
        try {
            return await httpHostMetaJSON(address);
        } catch (err) {
            if (err.code == 'ECONNREFUSED') {
                throw err;
            }
        }
        return await httpHostMeta(address);
    } catch (err) {
        throw new Error("Unable to get host-meta or host-meta.json");
    }
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

var template = async function(tmpl, address, parsers, httpsOnly) {
    var getme, options;

    try {
        getme = tmpl.replace("{uri}", encodeURIComponent(address));
        options = url.parse(getme);
        options.httpsOnly = httpsOnly;
        return await request(((options.protocol == "https:") ? https : http), options, parsers);
    } catch (err) {
        if (address.substr(0, 5) != "acct:") {
            throw err;
        }
        getme = tmpl.replace("{uri}", encodeURIComponent(address.substr(5)));
        options = url.parse(getme);
        options.httpsOnly = httpsOnly;
        return await request(((options.protocol == "https:") ? https : http), options, parsers);
    }
};

var lrdd = async function(resource, options = {}) {
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

    var hm = await hostmeta(hostname, options);
    var lrdds, json, xrd;

    if (!hm.hasOwnProperty("links")) {
        throw new Error("No links in host-meta");
    }
    // First, get the lrdd ones
    lrdds = hm.links.filter(function(link) {
        return (link.hasOwnProperty("rel") &&
                link.rel == "lrdd" &&
                link.hasOwnProperty("template") &&
                (!options.httpsOnly || link.template.substr(0, 6) == "https:"));
    });
    if (!lrdds || lrdds.length === 0) {
        throw new Error("No lrdd links with templates in host-meta");
    }
    // Try JSON ones first
    json = lrdds.filter(function(link) {
        return (link.hasOwnProperty("type") &&
                link.type == JSONTYPE);
    });
    if (json && json.length > 0) {
        return await template(json[0].template, resource, {"application/json": jrd}, options.httpsOnly);
    }
    // Try explicitly XRD ones second
    xrd = lrdds.filter(function(link) {
        return (link.hasOwnProperty("type") &&
                link.type == XRDTYPE);
    });
    if (xrd && xrd.length > 0) {
        return await template(xrd[0].template, resource, {"application/xrd+xml": xrd2jrd}, options.httpsOnly);
    }
    // Try implicitly XRD ones third
    xrd = lrdds.filter(function(link) {
        return (!link.hasOwnProperty("type"));
    });
    if (xrd && xrd.length > 0) {
        return await template(xrd[0].template, resource, {"application/xrd+xml": xrd2jrd}, options.httpsOnly);
    }
    // Otherwise, give up
    throw new Error("No lrdd links with templates and acceptable type in host-meta");
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

    try {
        try {
            return await httpsWebfinger(hostname, resource, rel);
        } catch (err) {
            if (resource.substr(0, 5) != "acct:") {
                throw err;
            }
        }
        return await httpsWebfinger(hostname, resource.substr(5), rel);
    } catch (err) {
        if (options.webfingerOnly) {
            throw new Error("Unable to find webfinger");
        }
        return await lrdd(resource, options);
    }
};

var discover = async function(address) {
    if (address.indexOf("@") !== -1) {
        return await webfinger(address);
    } else {
        return await hostmeta(address);
    }
};

exports.xrd2jrd = xrd2jrd;
exports.webfinger = webfinger;
exports.lrdd = lrdd;
exports.hostmeta = hostmeta;
exports.discover = discover;
