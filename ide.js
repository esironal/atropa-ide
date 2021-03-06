require = function (e, t, n) {
    function i(n, s) {
        if (!t[n]) {
            if (!e[n]) {
                var o = typeof require == 'function' && require;
                if (!s && o)
                    return o(n, !0);
                if (r)
                    return r(n, !0);
                throw new Error('Cannot find module \'' + n + '\'');
            }
            var u = t[n] = { exports: {} };
            e[n][0](function (t) {
                var r = e[n][1][t];
                return i(r ? r : t);
            }, u, u.exports);
        }
        return t[n].exports;
    }
    var r = typeof require == 'function' && require;
    for (var s = 0; s < n.length; s++)
        i(n[s]);
    return i;
}({
    'url': [
        function (require, module, exports) {
            module.exports = require('CCiCNi');
        },
        {}
    ],
    'CCiCNi': [
        function (require, module, exports) {
            var punycode = {
                    encode: function (s) {
                        return s;
                    }
                };
            exports.parse = urlParse;
            exports.resolve = urlResolve;
            exports.resolveObject = urlResolveObject;
            exports.format = urlFormat;
            function arrayIndexOf(array, subject) {
                for (var i = 0, j = array.length; i < j; i++) {
                    if (array[i] == subject)
                        return i;
                }
                return -1;
            }
            var objectKeys = Object.keys || function objectKeys(object) {
                    if (object !== Object(object))
                        throw new TypeError('Invalid object');
                    var keys = [];
                    for (var key in object)
                        if (object.hasOwnProperty(key))
                            keys[keys.length] = key;
                    return keys;
                };
            // Reference: RFC 3986, RFC 1808, RFC 2396
            // define these here so at least they only have to be
            // compiled once on the first module load.
            var protocolPattern = /^([a-z0-9.+-]+:)/i, portPattern = /:[0-9]+$/,
                // RFC 2396: characters reserved for delimiting URLs.
                delims = [
                    '<',
                    '>',
                    '"',
                    '`',
                    ' ',
                    '\r',
                    '\n',
                    '\t'
                ],
                // RFC 2396: characters not allowed for various reasons.
                unwise = [
                    '{',
                    '}',
                    '|',
                    '\\',
                    '^',
                    '~',
                    '[',
                    ']',
                    '`'
                ].concat(delims),
                // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
                autoEscape = ['\''],
                // Characters that are never ever allowed in a hostname.
                // Note that any invalid chars are also handled, but these
                // are the ones that are *expected* to be seen, so we fast-path
                // them.
                nonHostChars = [
                    '%',
                    '/',
                    '?',
                    ';',
                    '#'
                ].concat(unwise).concat(autoEscape), nonAuthChars = [
                    '/',
                    '@',
                    '?',
                    '#'
                ].concat(delims), hostnameMaxLen = 255, hostnamePartPattern = /^[a-zA-Z0-9][a-z0-9A-Z_-]{0,62}$/, hostnamePartStart = /^([a-zA-Z0-9][a-z0-9A-Z_-]{0,62})(.*)$/,
                // protocols that can allow "unsafe" and "unwise" chars.
                unsafeProtocol = {
                    'javascript': true,
                    'javascript:': true
                },
                // protocols that never have a hostname.
                hostlessProtocol = {
                    'javascript': true,
                    'javascript:': true
                },
                // protocols that always have a path component.
                pathedProtocol = {
                    'http': true,
                    'https': true,
                    'ftp': true,
                    'gopher': true,
                    'file': true,
                    'http:': true,
                    'ftp:': true,
                    'gopher:': true,
                    'file:': true
                },
                // protocols that always contain a // bit.
                slashedProtocol = {
                    'http': true,
                    'https': true,
                    'ftp': true,
                    'gopher': true,
                    'file': true,
                    'http:': true,
                    'https:': true,
                    'ftp:': true,
                    'gopher:': true,
                    'file:': true
                }, querystring = require('querystring');
            function urlParse(url, parseQueryString, slashesDenoteHost) {
                if (url && typeof url === 'object' && url.href)
                    return url;
                if (typeof url !== 'string') {
                    throw new TypeError('Parameter \'url\' must be a string, not ' + typeof url);
                }
                var out = {}, rest = url;
                // cut off any delimiters.
                // This is to support parse stuff like "<http://foo.com>"
                for (var i = 0, l = rest.length; i < l; i++) {
                    if (arrayIndexOf(delims, rest.charAt(i)) === -1)
                        break;
                }
                if (i !== 0)
                    rest = rest.substr(i);
                var proto = protocolPattern.exec(rest);
                if (proto) {
                    proto = proto[0];
                    var lowerProto = proto.toLowerCase();
                    out.protocol = lowerProto;
                    rest = rest.substr(proto.length);
                }
                // figure out if it's got a host
                // user@server is *always* interpreted as a hostname, and url
                // resolution will treat //foo/bar as host=foo,path=bar because that's
                // how the browser resolves relative URLs.
                if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
                    var slashes = rest.substr(0, 2) === '//';
                    if (slashes && !(proto && hostlessProtocol[proto])) {
                        rest = rest.substr(2);
                        out.slashes = true;
                    }
                }
                if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
                    // there's a hostname.
                    // the first instance of /, ?, ;, or # ends the host.
                    // don't enforce full RFC correctness, just be unstupid about it.
                    // If there is an @ in the hostname, then non-host chars *are* allowed
                    // to the left of the first @ sign, unless some non-auth character
                    // comes *before* the @-sign.
                    // URLs are obnoxious.
                    var atSign = arrayIndexOf(rest, '@');
                    if (atSign !== -1) {
                        // there *may be* an auth
                        var hasAuth = true;
                        for (var i = 0, l = nonAuthChars.length; i < l; i++) {
                            var index = arrayIndexOf(rest, nonAuthChars[i]);
                            if (index !== -1 && index < atSign) {
                                // not a valid auth.  Something like http://foo.com/bar@baz/
                                hasAuth = false;
                                break;
                            }
                        }
                        if (hasAuth) {
                            // pluck off the auth portion.
                            out.auth = rest.substr(0, atSign);
                            rest = rest.substr(atSign + 1);
                        }
                    }
                    var firstNonHost = -1;
                    for (var i = 0, l = nonHostChars.length; i < l; i++) {
                        var index = arrayIndexOf(rest, nonHostChars[i]);
                        if (index !== -1 && (firstNonHost < 0 || index < firstNonHost))
                            firstNonHost = index;
                    }
                    if (firstNonHost !== -1) {
                        out.host = rest.substr(0, firstNonHost);
                        rest = rest.substr(firstNonHost);
                    } else {
                        out.host = rest;
                        rest = '';
                    }
                    // pull out port.
                    var p = parseHost(out.host);
                    var keys = objectKeys(p);
                    for (var i = 0, l = keys.length; i < l; i++) {
                        var key = keys[i];
                        out[key] = p[key];
                    }
                    // we've indicated that there is a hostname,
                    // so even if it's empty, it has to be present.
                    out.hostname = out.hostname || '';
                    // validate a little.
                    if (out.hostname.length > hostnameMaxLen) {
                        out.hostname = '';
                    } else {
                        var hostparts = out.hostname.split(/\./);
                        for (var i = 0, l = hostparts.length; i < l; i++) {
                            var part = hostparts[i];
                            if (!part)
                                continue;
                            if (!part.match(hostnamePartPattern)) {
                                var newpart = '';
                                for (var j = 0, k = part.length; j < k; j++) {
                                    if (part.charCodeAt(j) > 127) {
                                        // we replace non-ASCII char with a temporary placeholder
                                        // we need this to make sure size of hostname is not
                                        // broken by replacing non-ASCII by nothing
                                        newpart += 'x';
                                    } else {
                                        newpart += part[j];
                                    }
                                }
                                // we test again with ASCII char only
                                if (!newpart.match(hostnamePartPattern)) {
                                    var validParts = hostparts.slice(0, i);
                                    var notHost = hostparts.slice(i + 1);
                                    var bit = part.match(hostnamePartStart);
                                    if (bit) {
                                        validParts.push(bit[1]);
                                        notHost.unshift(bit[2]);
                                    }
                                    if (notHost.length) {
                                        rest = '/' + notHost.join('.') + rest;
                                    }
                                    out.hostname = validParts.join('.');
                                    break;
                                }
                            }
                        }
                    }
                    // hostnames are always lower case.
                    out.hostname = out.hostname.toLowerCase();
                    // IDNA Support: Returns a puny coded representation of "domain".
                    // It only converts the part of the domain name that
                    // has non ASCII characters. I.e. it dosent matter if
                    // you call it with a domain that already is in ASCII.
                    var domainArray = out.hostname.split('.');
                    var newOut = [];
                    for (var i = 0; i < domainArray.length; ++i) {
                        var s = domainArray[i];
                        newOut.push(s.match(/[^A-Za-z0-9_-]/) ? 'xn--' + punycode.encode(s) : s);
                    }
                    out.hostname = newOut.join('.');
                    out.host = (out.hostname || '') + (out.port ? ':' + out.port : '');
                    out.href += out.host;
                }
                // now rest is set to the post-host stuff.
                // chop off any delim chars.
                if (!unsafeProtocol[lowerProto]) {
                    // First, make 100% sure that any "autoEscape" chars get
                    // escaped, even if encodeURIComponent doesn't think they
                    // need to be.
                    for (var i = 0, l = autoEscape.length; i < l; i++) {
                        var ae = autoEscape[i];
                        var esc = encodeURIComponent(ae);
                        if (esc === ae) {
                            esc = escape(ae);
                        }
                        rest = rest.split(ae).join(esc);
                    }
                    // Now make sure that delims never appear in a url.
                    var chop = rest.length;
                    for (var i = 0, l = delims.length; i < l; i++) {
                        var c = arrayIndexOf(rest, delims[i]);
                        if (c !== -1) {
                            chop = Math.min(c, chop);
                        }
                    }
                    rest = rest.substr(0, chop);
                }
                // chop off from the tail first.
                var hash = arrayIndexOf(rest, '#');
                if (hash !== -1) {
                    // got a fragment string.
                    out.hash = rest.substr(hash);
                    rest = rest.slice(0, hash);
                }
                var qm = arrayIndexOf(rest, '?');
                if (qm !== -1) {
                    out.search = rest.substr(qm);
                    out.query = rest.substr(qm + 1);
                    if (parseQueryString) {
                        out.query = querystring.parse(out.query);
                    }
                    rest = rest.slice(0, qm);
                } else if (parseQueryString) {
                    // no query string, but parseQueryString still requested
                    out.search = '';
                    out.query = {};
                }
                if (rest)
                    out.pathname = rest;
                if (slashedProtocol[proto] && out.hostname && !out.pathname) {
                    out.pathname = '/';
                }
                //to support http.request
                if (out.pathname || out.search) {
                    out.path = (out.pathname ? out.pathname : '') + (out.search ? out.search : '');
                }
                // finally, reconstruct the href based on what has been validated.
                out.href = urlFormat(out);
                return out;
            }
            // format a parsed object into a url string
            function urlFormat(obj) {
                // ensure it's an object, and not a string url.
                // If it's an obj, this is a no-op.
                // this way, you can call url_format() on strings
                // to clean up potentially wonky urls.
                if (typeof obj === 'string')
                    obj = urlParse(obj);
                var auth = obj.auth || '';
                if (auth) {
                    auth = auth.split('@').join('%40');
                    for (var i = 0, l = nonAuthChars.length; i < l; i++) {
                        var nAC = nonAuthChars[i];
                        auth = auth.split(nAC).join(encodeURIComponent(nAC));
                    }
                    auth += '@';
                }
                var protocol = obj.protocol || '', host = obj.host !== undefined ? auth + obj.host : obj.hostname !== undefined ? auth + obj.hostname + (obj.port ? ':' + obj.port : '') : false, pathname = obj.pathname || '', query = obj.query && (typeof obj.query === 'object' && objectKeys(obj.query).length ? querystring.stringify(obj.query) : '') || '', search = obj.search || query && '?' + query || '', hash = obj.hash || '';
                if (protocol && protocol.substr(-1) !== ':')
                    protocol += ':';
                // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
                // unless they had them to begin with.
                if (obj.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
                    host = '//' + (host || '');
                    if (pathname && pathname.charAt(0) !== '/')
                        pathname = '/' + pathname;
                } else if (!host) {
                    host = '';
                }
                if (hash && hash.charAt(0) !== '#')
                    hash = '#' + hash;
                if (search && search.charAt(0) !== '?')
                    search = '?' + search;
                return protocol + host + pathname + search + hash;
            }
            function urlResolve(source, relative) {
                return urlFormat(urlResolveObject(source, relative));
            }
            function urlResolveObject(source, relative) {
                if (!source)
                    return relative;
                source = urlParse(urlFormat(source), false, true);
                relative = urlParse(urlFormat(relative), false, true);
                // hash is always overridden, no matter what.
                source.hash = relative.hash;
                if (relative.href === '') {
                    source.href = urlFormat(source);
                    return source;
                }
                // hrefs like //foo/bar always cut to the protocol.
                if (relative.slashes && !relative.protocol) {
                    relative.protocol = source.protocol;
                    //urlParse appends trailing / to urls like http://www.example.com
                    if (slashedProtocol[relative.protocol] && relative.hostname && !relative.pathname) {
                        relative.path = relative.pathname = '/';
                    }
                    relative.href = urlFormat(relative);
                    return relative;
                }
                if (relative.protocol && relative.protocol !== source.protocol) {
                    // if it's a known url protocol, then changing
                    // the protocol does weird things
                    // first, if it's not file:, then we MUST have a host,
                    // and if there was a path
                    // to begin with, then we MUST have a path.
                    // if it is file:, then the host is dropped,
                    // because that's known to be hostless.
                    // anything else is assumed to be absolute.
                    if (!slashedProtocol[relative.protocol]) {
                        relative.href = urlFormat(relative);
                        return relative;
                    }
                    source.protocol = relative.protocol;
                    if (!relative.host && !hostlessProtocol[relative.protocol]) {
                        var relPath = (relative.pathname || '').split('/');
                        while (relPath.length && !(relative.host = relPath.shift()));
                        if (!relative.host)
                            relative.host = '';
                        if (!relative.hostname)
                            relative.hostname = '';
                        if (relPath[0] !== '')
                            relPath.unshift('');
                        if (relPath.length < 2)
                            relPath.unshift('');
                        relative.pathname = relPath.join('/');
                    }
                    source.pathname = relative.pathname;
                    source.search = relative.search;
                    source.query = relative.query;
                    source.host = relative.host || '';
                    source.auth = relative.auth;
                    source.hostname = relative.hostname || relative.host;
                    source.port = relative.port;
                    //to support http.request
                    if (source.pathname !== undefined || source.search !== undefined) {
                        source.path = (source.pathname ? source.pathname : '') + (source.search ? source.search : '');
                    }
                    source.slashes = source.slashes || relative.slashes;
                    source.href = urlFormat(source);
                    return source;
                }
                var isSourceAbs = source.pathname && source.pathname.charAt(0) === '/', isRelAbs = relative.host !== undefined || relative.pathname && relative.pathname.charAt(0) === '/', mustEndAbs = isRelAbs || isSourceAbs || source.host && relative.pathname, removeAllDots = mustEndAbs, srcPath = source.pathname && source.pathname.split('/') || [], relPath = relative.pathname && relative.pathname.split('/') || [], psychotic = source.protocol && !slashedProtocol[source.protocol];
                // if the url is a non-slashed url, then relative
                // links like ../.. should be able
                // to crawl up to the hostname, as well.  This is strange.
                // source.protocol has already been set by now.
                // Later on, put the first path part into the host field.
                if (psychotic) {
                    delete source.hostname;
                    delete source.port;
                    if (source.host) {
                        if (srcPath[0] === '')
                            srcPath[0] = source.host;
                        else
                            srcPath.unshift(source.host);
                    }
                    delete source.host;
                    if (relative.protocol) {
                        delete relative.hostname;
                        delete relative.port;
                        if (relative.host) {
                            if (relPath[0] === '')
                                relPath[0] = relative.host;
                            else
                                relPath.unshift(relative.host);
                        }
                        delete relative.host;
                    }
                    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
                }
                if (isRelAbs) {
                    // it's absolute.
                    source.host = relative.host || relative.host === '' ? relative.host : source.host;
                    source.hostname = relative.hostname || relative.hostname === '' ? relative.hostname : source.hostname;
                    source.search = relative.search;
                    source.query = relative.query;
                    srcPath = relPath;    // fall through to the dot-handling below.
                } else if (relPath.length) {
                    // it's relative
                    // throw away the existing file, and take the new path instead.
                    if (!srcPath)
                        srcPath = [];
                    srcPath.pop();
                    srcPath = srcPath.concat(relPath);
                    source.search = relative.search;
                    source.query = relative.query;
                } else if ('search' in relative) {
                    // just pull out the search.
                    // like href='?foo'.
                    // Put this after the other two cases because it simplifies the booleans
                    if (psychotic) {
                        source.hostname = source.host = srcPath.shift();
                        //occationaly the auth can get stuck only in host
                        //this especialy happens in cases like
                        //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
                        var authInHost = source.host && arrayIndexOf(source.host, '@') > 0 ? source.host.split('@') : false;
                        if (authInHost) {
                            source.auth = authInHost.shift();
                            source.host = source.hostname = authInHost.shift();
                        }
                    }
                    source.search = relative.search;
                    source.query = relative.query;
                    //to support http.request
                    if (source.pathname !== undefined || source.search !== undefined) {
                        source.path = (source.pathname ? source.pathname : '') + (source.search ? source.search : '');
                    }
                    source.href = urlFormat(source);
                    return source;
                }
                if (!srcPath.length) {
                    // no path at all.  easy.
                    // we've already handled the other stuff above.
                    delete source.pathname;
                    //to support http.request
                    if (!source.search) {
                        source.path = '/' + source.search;
                    } else {
                        delete source.path;
                    }
                    source.href = urlFormat(source);
                    return source;
                }
                // if a url ENDs in . or .., then it must get a trailing slash.
                // however, if it ends in anything else non-slashy,
                // then it must NOT get a trailing slash.
                var last = srcPath.slice(-1)[0];
                var hasTrailingSlash = (source.host || relative.host) && (last === '.' || last === '..') || last === '';
                // strip single dots, resolve double dots to parent dir
                // if the path tries to go above the root, `up` ends up > 0
                var up = 0;
                for (var i = srcPath.length; i >= 0; i--) {
                    last = srcPath[i];
                    if (last == '.') {
                        srcPath.splice(i, 1);
                    } else if (last === '..') {
                        srcPath.splice(i, 1);
                        up++;
                    } else if (up) {
                        srcPath.splice(i, 1);
                        up--;
                    }
                }
                // if the path is allowed to go above the root, restore leading ..s
                if (!mustEndAbs && !removeAllDots) {
                    for (; up--; up) {
                        srcPath.unshift('..');
                    }
                }
                if (mustEndAbs && srcPath[0] !== '' && (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
                    srcPath.unshift('');
                }
                if (hasTrailingSlash && srcPath.join('/').substr(-1) !== '/') {
                    srcPath.push('');
                }
                var isAbsolute = srcPath[0] === '' || srcPath[0] && srcPath[0].charAt(0) === '/';
                // put the host back
                if (psychotic) {
                    source.hostname = source.host = isAbsolute ? '' : srcPath.length ? srcPath.shift() : '';
                    //occationaly the auth can get stuck only in host
                    //this especialy happens in cases like
                    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
                    var authInHost = source.host && arrayIndexOf(source.host, '@') > 0 ? source.host.split('@') : false;
                    if (authInHost) {
                        source.auth = authInHost.shift();
                        source.host = source.hostname = authInHost.shift();
                    }
                }
                mustEndAbs = mustEndAbs || source.host && srcPath.length;
                if (mustEndAbs && !isAbsolute) {
                    srcPath.unshift('');
                }
                source.pathname = srcPath.join('/');
                //to support request.http
                if (source.pathname !== undefined || source.search !== undefined) {
                    source.path = (source.pathname ? source.pathname : '') + (source.search ? source.search : '');
                }
                source.auth = relative.auth || source.auth;
                source.slashes = source.slashes || relative.slashes;
                source.href = urlFormat(source);
                return source;
            }
            function parseHost(host) {
                var out = {};
                var port = portPattern.exec(host);
                if (port) {
                    port = port[0];
                    out.port = port.substr(1);
                    host = host.substr(0, host.length - port.length);
                }
                if (host)
                    out.hostname = host;
                return out;
            }
        },
        { 'querystring': 1 }
    ],
    './browser_modules/ace editor default settings.js': [
        function (require, module, exports) {
            module.exports = require('o9QCoL');
        },
        {}
    ],
    'o9QCoL': [
        function (require, module, exports) {
            /*jslint
                indent: 4,
                maxerr: 50,
                white: true,
                browser: true,
                vars: true
            */
            /*globals
                module
            */
            module.exports = {
                'renderer': {
                    'setAnimatedScroll': false,
                    'setDisplayIndentGuides': true,
                    'setFadeFoldWidgets': false,
                    'setHighlightGutterLine': true,
                    'setHScrollBarAlwaysVisible': false,
                    'setPrintMarginColumn': 80,
                    'setShowGutter': true,
                    'setShowInvisibles': false,
                    'setShowPrintMargin': true,
                    'setTheme': 'ace/theme/twilight'
                },
                'session': {
                    'setMode': 'ace/mode/javascript',
                    'setNewLineMode': 'windows',
                    'setOverwrite': false,
                    'setTabSize': 4,
                    'setUseSoftTabs': true,
                    'setUseWorker': true,
                    'setUseWrapMode': true,
                    'setWrapLimit': 80
                },
                'editor': {
                    'setBehavioursEnabled': true,
                    'setDragDelay': 150,
                    'setFontSize': '12px',
                    'setHighlightActiveLine': true,
                    'setHighlightSelectedWord': true,
                    'setReadOnly': false,
                    'setScrollSpeed': true,
                    'setSelectionStyle': 'line',
                    'setShowFoldWidgets': true,
                    'setWrapBehavioursEnabled': true
                }
            };
        },
        {}
    ],
    './browser_modules/ckeditor aceSourceView.js': [
        function (require, module, exports) {
            module.exports = require('WEt/eN');
        },
        {}
    ],
    'WEt/eN': [
        function (require, module, exports) {
            /*jslint
                indent: 4,
                maxerr: 50,
                white: true,
                browser: true,
                vars: true
            */
            /*globals
                module
            */
            module.exports = {
                'url': 'ace editor.html?setMode=ace/mode/html',
                'hook': function (codeHighlighter) {
                    'use strict';
                    codeHighlighter.getValue = function () {
                        return codeHighlighter.frame.contentWindow.ui.session.getValue();
                    };
                    codeHighlighter.setValue = function (val) {
                        return codeHighlighter.frame.contentWindow.ui.session.setValue(val);
                    };
                    return codeHighlighter;
                }
            };
        },
        {}
    ],
    './browser_modules/editor.js': [
        function (require, module, exports) {
            module.exports = require('h+sAzN');
        },
        {}
    ],
    'h+sAzN': [
        function (require, module, exports) {
            (function () {
                /*jslint
                    indent: 4,
                    maxerr: 50,
                    white: true,
                    browser: true,
                    vars: true
                */
                /*global
                    FileReader,
                    module
                */
                module.exports = function () {
                    'use strict';
                    this.fileName = document.getElementById('fileName');
                    this.fileName.value = document.title || 'new.js';
                    this.fileMeta = {};
                };
                module.exports.prototype.setEditorValue = function (value) {
                    'use strict';
                    throw new Error('this function must be implemented on a per editor basis');
                };
                module.exports.prototype.save = function () {
                    'use strict';
                    throw new Error('this function must be implemented on a per editor basis');
                };
                module.exports.prototype.setPageTitle = function (title) {
                    'use strict';
                    document.getElementsByTagName('title')[0].textContent = title;
                    this.fileName.value = title;
                };
                module.exports.prototype.catchDroppedFiles = function (dropElement, callback) {
                    'use strict';
                    function catchAndDoNothing(e) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                    function drop(e) {
                        catchAndDoNothing(e);
                        callback(e.dataTransfer.files);
                    }
                    function dragAndDropHook() {
                        dropElement.addEventListener('dragenter', catchAndDoNothing, false);
                        dropElement.addEventListener('dragover', catchAndDoNothing, false);
                        dropElement.addEventListener('drop', drop, false);
                    }
                    dragAndDropHook();
                };
                module.exports.prototype.loadFile = function (files, callback) {
                    'use strict';
                    var my = this;
                    var file = files[0];
                    if (file) {
                        var reader = new FileReader();
                        reader.onload = function (e) {
                            var contents = e.target.result;
                            my.fileMeta = file;
                            my.setPageTitle(file.name);
                            my.setEditorValue(contents);
                            if (callback) {
                                callback();
                            }
                        };
                        reader.readAsText(file);
                    } else {
                        throw new Error('Failed to load file');
                    }
                };
                module.exports.prototype.overlayPage = function (contentElement, top, right, bottom, left) {
                    'use strict';
                    var div = document.createElement('div');
                    var contentContainer = document.createElement('div');
                    contentContainer.style.cssText = 'margin: 0px; padding: 0px; border: 0px;' + 'overflow: auto;';
                    contentElement.style.cssText = contentElement.style.cssText + 'overflow: auto;';
                    contentContainer.appendChild(contentElement);
                    var cl = document.createElement('img');
                    if (top) {
                        top = 'top: ' + top + ';';
                    } else {
                        top = '';
                    }
                    if (right) {
                        right = 'right: ' + right + ';';
                    } else {
                        right = '';
                    }
                    if (bottom) {
                        bottom = 'bottom: ' + bottom + ';';
                    } else {
                        bottom = '';
                    }
                    if (left) {
                        left = 'left: ' + left + ';';
                    } else {
                        left = '';
                    }
                    cl.src = '/famfamfam_silk_icons_v013/icons/cross.png';
                    cl.style.cssText = 'margin: 5px 5px 0 0; padding: 0; ' + 'float: right; width: 25px;';
                    div.style.cssText = 'margin:0; padding:0; position: absolute;' + top + right + bottom + left + 'z-index:9999; background-color:white; color:black; overflow: auto;';
                    div.appendChild(cl);
                    div.appendChild(contentContainer);
                    document.body.appendChild(div);
                    cl.addEventListener('click', function (e) {
                        div.parentNode.removeChild(div);
                        div = null;
                    });
                };
            }());
        },
        {}
    ],
    1: [
        function (require, module, exports) {
            var isArray = typeof Array.isArray === 'function' ? Array.isArray : function (xs) {
                    return Object.prototype.toString.call(xs) === '[object Array]';
                };
            var objectKeys = Object.keys || function objectKeys(object) {
                    if (object !== Object(object))
                        throw new TypeError('Invalid object');
                    var keys = [];
                    for (var key in object)
                        if (object.hasOwnProperty(key))
                            keys[keys.length] = key;
                    return keys;
                };
            /*!
             * querystring
             * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
             * MIT Licensed
             */
            /**
             * Library version.
             */
            exports.version = '0.3.1';
            /**
             * Object#toString() ref for stringify().
             */
            var toString = Object.prototype.toString;
            /**
             * Cache non-integer test regexp.
             */
            var notint = /[^0-9]/;
            /**
             * Parse the given query `str`, returning an object.
             *
             * @param {String} str
             * @return {Object}
             * @api public
             */
            exports.parse = function (str) {
                if (null == str || '' == str)
                    return {};
                function promote(parent, key) {
                    if (parent[key].length == 0)
                        return parent[key] = {};
                    var t = {};
                    for (var i in parent[key])
                        t[i] = parent[key][i];
                    parent[key] = t;
                    return t;
                }
                return String(str).split('&').reduce(function (ret, pair) {
                    try {
                        pair = decodeURIComponent(pair.replace(/\+/g, ' '));
                    } catch (e) {
                    }
                    var eql = pair.indexOf('='), brace = lastBraceInKey(pair), key = pair.substr(0, brace || eql), val = pair.substr(brace || eql, pair.length), val = val.substr(val.indexOf('=') + 1, val.length), parent = ret;
                    // ?foo
                    if ('' == key)
                        key = pair, val = '';
                    // nested
                    if (~key.indexOf(']')) {
                        var parts = key.split('['), len = parts.length, last = len - 1;
                        function parse(parts, parent, key) {
                            var part = parts.shift();
                            // end
                            if (!part) {
                                if (isArray(parent[key])) {
                                    parent[key].push(val);
                                } else if ('object' == typeof parent[key]) {
                                    parent[key] = val;
                                } else if ('undefined' == typeof parent[key]) {
                                    parent[key] = val;
                                } else {
                                    parent[key] = [
                                        parent[key],
                                        val
                                    ];
                                }    // array
                            } else {
                                obj = parent[key] = parent[key] || [];
                                if (']' == part) {
                                    if (isArray(obj)) {
                                        if ('' != val)
                                            obj.push(val);
                                    } else if ('object' == typeof obj) {
                                        obj[objectKeys(obj).length] = val;
                                    } else {
                                        obj = parent[key] = [
                                            parent[key],
                                            val
                                        ];
                                    }    // prop
                                } else if (~part.indexOf(']')) {
                                    part = part.substr(0, part.length - 1);
                                    if (notint.test(part) && isArray(obj))
                                        obj = promote(parent, key);
                                    parse(parts, obj, part);    // key
                                } else {
                                    if (notint.test(part) && isArray(obj))
                                        obj = promote(parent, key);
                                    parse(parts, obj, part);
                                }
                            }
                        }
                        parse(parts, parent, 'base');    // optimize
                    } else {
                        if (notint.test(key) && isArray(parent.base)) {
                            var t = {};
                            for (var k in parent.base)
                                t[k] = parent.base[k];
                            parent.base = t;
                        }
                        set(parent.base, key, val);
                    }
                    return ret;
                }, { base: {} }).base;
            };
            /**
             * Turn the given `obj` into a query string
             *
             * @param {Object} obj
             * @return {String}
             * @api public
             */
            var stringify = exports.stringify = function (obj, prefix) {
                    if (isArray(obj)) {
                        return stringifyArray(obj, prefix);
                    } else if ('[object Object]' == toString.call(obj)) {
                        return stringifyObject(obj, prefix);
                    } else if ('string' == typeof obj) {
                        return stringifyString(obj, prefix);
                    } else {
                        return prefix;
                    }
                };
            /**
             * Stringify the given `str`.
             *
             * @param {String} str
             * @param {String} prefix
             * @return {String}
             * @api private
             */
            function stringifyString(str, prefix) {
                if (!prefix)
                    throw new TypeError('stringify expects an object');
                return prefix + '=' + encodeURIComponent(str);
            }
            /**
             * Stringify the given `arr`.
             *
             * @param {Array} arr
             * @param {String} prefix
             * @return {String}
             * @api private
             */
            function stringifyArray(arr, prefix) {
                var ret = [];
                if (!prefix)
                    throw new TypeError('stringify expects an object');
                for (var i = 0; i < arr.length; i++) {
                    ret.push(stringify(arr[i], prefix + '[]'));
                }
                return ret.join('&');
            }
            /**
             * Stringify the given `obj`.
             *
             * @param {Object} obj
             * @param {String} prefix
             * @return {String}
             * @api private
             */
            function stringifyObject(obj, prefix) {
                var ret = [], keys = objectKeys(obj), key;
                for (var i = 0, len = keys.length; i < len; ++i) {
                    key = keys[i];
                    ret.push(stringify(obj[key], prefix ? prefix + '[' + encodeURIComponent(key) + ']' : encodeURIComponent(key)));
                }
                return ret.join('&');
            }
            /**
             * Set `obj`'s `key` to `val` respecting
             * the weird and wonderful syntax of a qs,
             * where "foo=bar&foo=baz" becomes an array.
             *
             * @param {Object} obj
             * @param {String} key
             * @param {String} val
             * @api private
             */
            function set(obj, key, val) {
                var v = obj[key];
                if (undefined === v) {
                    obj[key] = val;
                } else if (isArray(v)) {
                    v.push(val);
                } else {
                    obj[key] = [
                        v,
                        val
                    ];
                }
            }
            /**
             * Locate last brace in `str` within the key.
             *
             * @param {String} str
             * @return {Number}
             * @api private
             */
            function lastBraceInKey(str) {
                var len = str.length, brace, c;
                for (var i = 0; i < len; ++i) {
                    c = str[i];
                    if (']' == c)
                        brace = false;
                    if ('[' == c)
                        brace = true;
                    if ('=' == c && !brace)
                        return i;
                }
            }
        },
        {}
    ],
    'atropa-jsformatter': [
        function (require, module, exports) {
            module.exports = require('yhbTZ0');
        },
        {}
    ],
    'yhbTZ0': [
        function (require, module, exports) {
            module.exports = require('./src/atropa-jsformatter.js');
        },
        { './src/atropa-jsformatter.js': 2 }
    ],
    './browser_modules/ace editor.js': [
        function (require, module, exports) {
            module.exports = require('R8Ba+v');
        },
        {}
    ],
    'R8Ba+v': [
        function (require, module, exports) {
            (function () {
                /*jslint
                    indent: 4,
                    maxerr: 50,
                    white: true,
                    browser: true,
                    vars: true
                */
                /*global
                    ace,
                    module,
                    require,
                    getComputedStyle
                */
                module.exports = require('./editor.js');
                module.exports.prototype.initializeAce = function (options) {
                    'use strict';
                    options = options || {};
                    var my = this;
                    var defaults = require('./ace editor default settings.js');
                    function loadFile(files) {
                        my.loadFile(files, function () {
                            var modelist = ace.require('ace/ext/modelist');
                            var mode = modelist.getModeFromPath(my.fileMeta.name).mode;
                            my.editor.getSession().setMode(mode);
                        });
                    }
                    function initializeEditor() {
                        function mergeGivenOptionsWithDefaults() {
                            var out = defaults;
                            Object.keys(defaults).forEach(function (esr) {
                                Object.keys(defaults[esr]).forEach(function (setting) {
                                    if (options[setting]) {
                                        switch (typeof defaults[esr][setting]) {
                                        case 'boolean':
                                            out[esr][setting] = options[setting] === 'false' ? false : true;
                                            break;
                                        case 'number':
                                            out[esr][setting] = Number(options[setting]);
                                            break;
                                        case 'string':
                                            out[esr][setting] = String(options[setting]);
                                            break;
                                        default:
                                            break;
                                        }
                                    } else {
                                        out[esr][setting] = defaults[esr][setting];
                                    }
                                });
                            });
                            return out;
                        }
                        function setEditorSettings() {
                            var options = mergeGivenOptionsWithDefaults();
                            Object.keys(options).forEach(function (esr) {
                                Object.keys(options[esr]).forEach(function (fn) {
                                    my[esr][fn](options[esr][fn]);
                                });
                            });
                        }
                        my.textarea = document.getElementById('newFile');
                        my.editor = ace.edit('editor');
                        ace.require('ace/ext/show_settings_menu').init(my.editor);
                        ace.require('ace/ext/show_keyboard_shortcuts').init(my.editor);
                        my.session = my.editor.getSession();
                        my.renderer = my.editor.renderer;
                        my.editor.commands.addCommand({
                            name: 'save',
                            bindKey: {
                                win: 'Ctrl-S',
                                mac: 'Command-S'
                            },
                            exec: function () {
                                my.save();
                            }
                        });
                        my.session.setWrapLimit = function (limit) {
                            my.session.setWrapLimitRange(limit - 20, limit);
                        };
                        setEditorSettings();
                    }
                    this.save = function () {
                        var code = my.session.getValue();
                        my.textarea.textContent = code;
                        document.forms[0].submit();
                    };
                    this.setEditorValue = function (value) {
                        my.session.setValue(value);
                    };
                    this.getEditorValue = function () {
                        return my.session.getValue();
                    };
                    this.formatJs = function () {
                        var formatter = require('atropa-jsformatter');
                        my.setEditorValue(formatter(my.getEditorValue()));
                    };
                    this.catchDroppedFiles(document.getElementById('editor'), loadFile);
                    initializeEditor();
                };
            }());
        },
        {
            'atropa-jsformatter': 'yhbTZ0',
            './editor.js': 'h+sAzN',
            './ace editor default settings.js': 'o9QCoL'
        }
    ],
    './browser_modules/ckeditor.js': [
        function (require, module, exports) {
            module.exports = require('fLaY4S');
        },
        {}
    ],
    'fLaY4S': [
        function (require, module, exports) {
            (function () {
                /*jslint
                    indent: 4,
                    maxerr: 50,
                    white: true,
                    browser: true,
                    vars: true
                */
                /*global
                    CKEDITOR,
                    module,
                    require
                */
                module.exports = require('./editor.js');
                module.exports.prototype.initializeCk = function () {
                    'use strict';
                    var my = this;
                    var highlighter = require('./ckeditor aceSourceView.js');
                    var getCodeHighlighterDefault = function () {
                        return {
                            'highlighter': {},
                            'getValue': function () {
                                throw new Error('implement this on codeHighlighter ' + 'instantiation');
                            },
                            'setValue': function () {
                                throw new Error('implement this on codeHighlighter ' + 'instantiation');
                            }
                        };
                    };
                    function getDropElement() {
                        var dropElement;
                        try {
                            dropElement = my.editor.document.getDocumentElement().$;
                        } catch (e) {
                            dropElement = my.editor.container.$;
                        }
                        return dropElement;
                    }
                    function loadFile(files) {
                        my.loadFile(files);
                    }
                    function highlighterSetup(textarea) {
                        function l(e) {
                            textarea.value = my.codeHighlighter.getValue();
                        }
                        my.editor.on('mode', function (e) {
                            my.editor.removeListener('beforeCommandExec', l);
                        });
                        my.editor.on('beforeCommandExec', l);
                        my.codeHighlighter.setValue(textarea.value);
                    }
                    function sourceViewOverride() {
                        var frame;
                        var textarea = my.getSourceEditorTextarea();
                        textarea.style.cssText = textarea.style.cssText + ';display:none;';
                        my.codeHighlighter.frame = document.createElement('iframe');
                        my.codeHighlighter.frame.setAttribute('src', highlighter.url);
                        my.codeHighlighter.frame.setAttribute('style', 'padding: 0; margin: 0; border: none; ' + 'height: 100%; width: 100%; overflow: auto;');
                        textarea.parentNode.appendChild(my.codeHighlighter.frame);
                        function waitForHighlighter() {
                            try {
                                my.codeHighlighter = highlighter.hook(my.codeHighlighter);
                                highlighterSetup(textarea);
                            } catch (e) {
                                setTimeout(waitForHighlighter, 250);
                            }
                        }
                        waitForHighlighter();
                    }
                    function modeSwitch() {
                        if (my.editor.mode === 'wysiwyg') {
                            var dropElement = getDropElement();
                            my.catchDroppedFiles(dropElement, loadFile);
                        }
                        if (my.editor.mode === 'source') {
                            //ace editor catches files.
                            sourceViewOverride();
                        }
                    }
                    this.getSourceEditorTextarea = function () {
                        return document.getElementsByClassName('cke_source')[0];
                    };
                    this.setEditorValue = function (value) {
                        my.editor.setData(value);
                        modeSwitch();
                    };
                    this.codeHighlighter = getCodeHighlighterDefault();
                    CKEDITOR.replace('newFile', {
                        fullPage: true,
                        extraPlugins: 'wysiwygarea',
                        on: {
                            'instanceReady': function instanceReadyFn(evt) {
                                my.editor = evt.editor;
                                my.editor.execCommand('maximize');
                                my.editor.on('mode', modeSwitch);
                                modeSwitch();
                            }
                        }
                    });
                };
            }());
        },
        {
            './editor.js': 'h+sAzN',
            './ckeditor aceSourceView.js': 'WEt/eN'
        }
    ],
    3: [
        function (require, module, exports) {
            module.exports.EOL = '\n';
        },
        {}
    ],
    2: [
        function (require, module, exports) {
            'use strict';
            /*jslint
                white: true,
                node: true
            */
            /**
             * Pretty prints javaScript using esprima and escodegen. Line endings
             *  will be converted to the value stored in os.EOL
             * @param {String} source The source code to prettify.
             * @param {Object} escodegenOptions Optional. Use different settings for
             *  escodegen.
             * @param {Object} esprimaOptions Optional. Use different settings for
             *  esprima.
             * @see <a href="http://esprima.org/doc/">http://esprima.org/doc/</a>
             * @see <a href="https://github.com/Constellation/escodegen/wiki/API">
             *  https://github.com/Constellation/escodegen/wiki/API</a>
             * @requires esprima
             * @requires escodegen
             * @requires os
             * @example
             *  var formatter = require('atropa-jsformatter');
             *  var out = formatter('function wobble() { return "flam"; }');
             *  console.log(out);
             */
            function formatJs(source, escodegenOptions, esprimaOptions) {
                var esprima, escodegen, os, tree;
                esprima = require('esprima');
                escodegen = require('escodegen');
                os = require('../core wrappers/os.js');
                esprimaOptions = esprimaOptions || {
                    'loc': false,
                    'range': true,
                    'raw': false,
                    'tokens': true,
                    'comment': true,
                    'tolerant': false
                };
                escodegenOptions = escodegenOptions || {
                    'format': {
                        'indent': {
                            'style': '    ',
                            'base': 0,
                            'adjustMultilineComment': true
                        },
                        'json': false,
                        'renumber': false,
                        'hexadecimal': false,
                        'quotes': 'single',
                        'escapeless': false,
                        'compact': false,
                        'parentheses': true,
                        'semicolons': true
                    },
                    'parse': null,
                    'comment': true,
                    'sourceMap': undefined
                };
                tree = esprima.parse(source, esprimaOptions);
                tree = escodegen.attachComments(tree, tree.comments, tree.tokens);
                return escodegen.generate(tree, escodegenOptions).replace(/(\r\n|\r|\n)/g, os.EOL);
            }
            ;
            module.exports = formatJs;
        },
        {
            '../core wrappers/os.js': 3,
            'esprima': 4,
            'escodegen': 5
        }
    ],
    4: [
        function (require, module, exports) {
            (function () {
                /*
                  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
                  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
                  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
                  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
                  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
                  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
                  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>
                
                  Redistribution and use in source and binary forms, with or without
                  modification, are permitted provided that the following conditions are met:
                
                    * Redistributions of source code must retain the above copyright
                      notice, this list of conditions and the following disclaimer.
                    * Redistributions in binary form must reproduce the above copyright
                      notice, this list of conditions and the following disclaimer in the
                      documentation and/or other materials provided with the distribution.
                
                  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
                  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
                  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
                  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
                  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
                  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
                  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
                  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
                  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
                  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
                */
                /*jslint bitwise:true plusplus:true */
                /*global esprima:true, define:true, exports:true, window: true,
                throwError: true, createLiteral: true, generateStatement: true,
                parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
                parseFunctionDeclaration: true, parseFunctionExpression: true,
                parseFunctionSourceElements: true, parseVariableIdentifier: true,
                parseLeftHandSideExpression: true,
                parseStatement: true, parseSourceElement: true */
                (function (root, factory) {
                    'use strict';
                    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
                    // Rhino, and plain browser loading.
                    if (typeof define === 'function' && define.amd) {
                        define(['exports'], factory);
                    } else if (typeof exports !== 'undefined') {
                        factory(exports);
                    } else {
                        factory(root.esprima = {});
                    }
                }(this, function (exports) {
                    'use strict';
                    var Token, TokenName, Syntax, PropertyKind, Messages, Regex, source, strict, index, lineNumber, lineStart, length, buffer, state, extra;
                    Token = {
                        BooleanLiteral: 1,
                        EOF: 2,
                        Identifier: 3,
                        Keyword: 4,
                        NullLiteral: 5,
                        NumericLiteral: 6,
                        Punctuator: 7,
                        StringLiteral: 8
                    };
                    TokenName = {};
                    TokenName[Token.BooleanLiteral] = 'Boolean';
                    TokenName[Token.EOF] = '<end>';
                    TokenName[Token.Identifier] = 'Identifier';
                    TokenName[Token.Keyword] = 'Keyword';
                    TokenName[Token.NullLiteral] = 'Null';
                    TokenName[Token.NumericLiteral] = 'Numeric';
                    TokenName[Token.Punctuator] = 'Punctuator';
                    TokenName[Token.StringLiteral] = 'String';
                    Syntax = {
                        AssignmentExpression: 'AssignmentExpression',
                        ArrayExpression: 'ArrayExpression',
                        BlockStatement: 'BlockStatement',
                        BinaryExpression: 'BinaryExpression',
                        BreakStatement: 'BreakStatement',
                        CallExpression: 'CallExpression',
                        CatchClause: 'CatchClause',
                        ConditionalExpression: 'ConditionalExpression',
                        ContinueStatement: 'ContinueStatement',
                        DoWhileStatement: 'DoWhileStatement',
                        DebuggerStatement: 'DebuggerStatement',
                        EmptyStatement: 'EmptyStatement',
                        ExpressionStatement: 'ExpressionStatement',
                        ForStatement: 'ForStatement',
                        ForInStatement: 'ForInStatement',
                        FunctionDeclaration: 'FunctionDeclaration',
                        FunctionExpression: 'FunctionExpression',
                        Identifier: 'Identifier',
                        IfStatement: 'IfStatement',
                        Literal: 'Literal',
                        LabeledStatement: 'LabeledStatement',
                        LogicalExpression: 'LogicalExpression',
                        MemberExpression: 'MemberExpression',
                        NewExpression: 'NewExpression',
                        ObjectExpression: 'ObjectExpression',
                        Program: 'Program',
                        Property: 'Property',
                        ReturnStatement: 'ReturnStatement',
                        SequenceExpression: 'SequenceExpression',
                        SwitchStatement: 'SwitchStatement',
                        SwitchCase: 'SwitchCase',
                        ThisExpression: 'ThisExpression',
                        ThrowStatement: 'ThrowStatement',
                        TryStatement: 'TryStatement',
                        UnaryExpression: 'UnaryExpression',
                        UpdateExpression: 'UpdateExpression',
                        VariableDeclaration: 'VariableDeclaration',
                        VariableDeclarator: 'VariableDeclarator',
                        WhileStatement: 'WhileStatement',
                        WithStatement: 'WithStatement'
                    };
                    PropertyKind = {
                        Data: 1,
                        Get: 2,
                        Set: 4
                    };
                    // Error messages should be identical to V8.
                    Messages = {
                        UnexpectedToken: 'Unexpected token %0',
                        UnexpectedNumber: 'Unexpected number',
                        UnexpectedString: 'Unexpected string',
                        UnexpectedIdentifier: 'Unexpected identifier',
                        UnexpectedReserved: 'Unexpected reserved word',
                        UnexpectedEOS: 'Unexpected end of input',
                        NewlineAfterThrow: 'Illegal newline after throw',
                        InvalidRegExp: 'Invalid regular expression',
                        UnterminatedRegExp: 'Invalid regular expression: missing /',
                        InvalidLHSInAssignment: 'Invalid left-hand side in assignment',
                        InvalidLHSInForIn: 'Invalid left-hand side in for-in',
                        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
                        NoCatchOrFinally: 'Missing catch or finally after try',
                        UnknownLabel: 'Undefined label \'%0\'',
                        Redeclaration: '%0 \'%1\' has already been declared',
                        IllegalContinue: 'Illegal continue statement',
                        IllegalBreak: 'Illegal break statement',
                        IllegalReturn: 'Illegal return statement',
                        StrictModeWith: 'Strict mode code may not include a with statement',
                        StrictCatchVariable: 'Catch variable may not be eval or arguments in strict mode',
                        StrictVarName: 'Variable name may not be eval or arguments in strict mode',
                        StrictParamName: 'Parameter name eval or arguments is not allowed in strict mode',
                        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
                        StrictFunctionName: 'Function name may not be eval or arguments in strict mode',
                        StrictOctalLiteral: 'Octal literals are not allowed in strict mode.',
                        StrictDelete: 'Delete of an unqualified identifier in strict mode.',
                        StrictDuplicateProperty: 'Duplicate data property in object literal not allowed in strict mode',
                        AccessorDataProperty: 'Object literal may not have data and accessor property with the same name',
                        AccessorGetSet: 'Object literal may not have multiple get/set accessors with the same name',
                        StrictLHSAssignment: 'Assignment to eval or arguments is not allowed in strict mode',
                        StrictLHSPostfix: 'Postfix increment/decrement may not have eval or arguments operand in strict mode',
                        StrictLHSPrefix: 'Prefix increment/decrement may not have eval or arguments operand in strict mode',
                        StrictReservedWord: 'Use of future reserved word in strict mode'
                    };
                    // See also tools/generate-unicode-regex.py.
                    Regex = {
                        NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
                        NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
                    };
                    // Ensure the condition is true, otherwise throw an error.
                    // This is only to have a better contract semantic, i.e. another safety net
                    // to catch a logic error. The condition shall be fulfilled in normal case.
                    // Do NOT use this to enforce a certain condition on any user input.
                    function assert(condition, message) {
                        if (!condition) {
                            throw new Error('ASSERT: ' + message);
                        }
                    }
                    function sliceSource(from, to) {
                        return source.slice(from, to);
                    }
                    if (typeof 'esprima'[0] === 'undefined') {
                        sliceSource = function sliceArraySource(from, to) {
                            return source.slice(from, to).join('');
                        };
                    }
                    function isDecimalDigit(ch) {
                        return '0123456789'.indexOf(ch) >= 0;
                    }
                    function isHexDigit(ch) {
                        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
                    }
                    function isOctalDigit(ch) {
                        return '01234567'.indexOf(ch) >= 0;
                    }
                    // 7.2 White Space
                    function isWhiteSpace(ch) {
                        return ch === ' ' || ch === '\t' || ch === '\v' || ch === '\f' || ch === '\xa0' || ch.charCodeAt(0) >= 5760 && '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\ufeff'.indexOf(ch) >= 0;
                    }
                    // 7.3 Line Terminators
                    function isLineTerminator(ch) {
                        return ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029';
                    }
                    // 7.6 Identifier Names and Identifiers
                    function isIdentifierStart(ch) {
                        return ch === '$' || ch === '_' || ch === '\\' || ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch.charCodeAt(0) >= 128 && Regex.NonAsciiIdentifierStart.test(ch);
                    }
                    function isIdentifierPart(ch) {
                        return ch === '$' || ch === '_' || ch === '\\' || ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch >= '0' && ch <= '9' || ch.charCodeAt(0) >= 128 && Regex.NonAsciiIdentifierPart.test(ch);
                    }
                    // 7.6.1.2 Future Reserved Words
                    function isFutureReservedWord(id) {
                        switch (id) {
                        // Future reserved words.
                        case 'class':
                        case 'enum':
                        case 'export':
                        case 'extends':
                        case 'import':
                        case 'super':
                            return true;
                        }
                        return false;
                    }
                    function isStrictModeReservedWord(id) {
                        switch (id) {
                        // Strict Mode reserved words.
                        case 'implements':
                        case 'interface':
                        case 'package':
                        case 'private':
                        case 'protected':
                        case 'public':
                        case 'static':
                        case 'yield':
                        case 'let':
                            return true;
                        }
                        return false;
                    }
                    function isRestrictedWord(id) {
                        return id === 'eval' || id === 'arguments';
                    }
                    // 7.6.1.1 Keywords
                    function isKeyword(id) {
                        var keyword = false;
                        switch (id.length) {
                        case 2:
                            keyword = id === 'if' || id === 'in' || id === 'do';
                            break;
                        case 3:
                            keyword = id === 'var' || id === 'for' || id === 'new' || id === 'try';
                            break;
                        case 4:
                            keyword = id === 'this' || id === 'else' || id === 'case' || id === 'void' || id === 'with';
                            break;
                        case 5:
                            keyword = id === 'while' || id === 'break' || id === 'catch' || id === 'throw';
                            break;
                        case 6:
                            keyword = id === 'return' || id === 'typeof' || id === 'delete' || id === 'switch';
                            break;
                        case 7:
                            keyword = id === 'default' || id === 'finally';
                            break;
                        case 8:
                            keyword = id === 'function' || id === 'continue' || id === 'debugger';
                            break;
                        case 10:
                            keyword = id === 'instanceof';
                            break;
                        }
                        if (keyword) {
                            return true;
                        }
                        switch (id) {
                        // Future reserved words.
                        // 'const' is specialized as Keyword in V8.
                        case 'const':
                            return true;
                        // For compatiblity to SpiderMonkey and ES.next
                        case 'yield':
                        case 'let':
                            return true;
                        }
                        if (strict && isStrictModeReservedWord(id)) {
                            return true;
                        }
                        return isFutureReservedWord(id);
                    }
                    // 7.4 Comments
                    function skipComment() {
                        var ch, blockComment, lineComment;
                        blockComment = false;
                        lineComment = false;
                        while (index < length) {
                            ch = source[index];
                            if (lineComment) {
                                ch = source[index++];
                                if (isLineTerminator(ch)) {
                                    lineComment = false;
                                    if (ch === '\r' && source[index] === '\n') {
                                        ++index;
                                    }
                                    ++lineNumber;
                                    lineStart = index;
                                }
                            } else if (blockComment) {
                                if (isLineTerminator(ch)) {
                                    if (ch === '\r' && source[index + 1] === '\n') {
                                        ++index;
                                    }
                                    ++lineNumber;
                                    ++index;
                                    lineStart = index;
                                    if (index >= length) {
                                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                                    }
                                } else {
                                    ch = source[index++];
                                    if (index >= length) {
                                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                                    }
                                    if (ch === '*') {
                                        ch = source[index];
                                        if (ch === '/') {
                                            ++index;
                                            blockComment = false;
                                        }
                                    }
                                }
                            } else if (ch === '/') {
                                ch = source[index + 1];
                                if (ch === '/') {
                                    index += 2;
                                    lineComment = true;
                                } else if (ch === '*') {
                                    index += 2;
                                    blockComment = true;
                                    if (index >= length) {
                                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                                    }
                                } else {
                                    break;
                                }
                            } else if (isWhiteSpace(ch)) {
                                ++index;
                            } else if (isLineTerminator(ch)) {
                                ++index;
                                if (ch === '\r' && source[index] === '\n') {
                                    ++index;
                                }
                                ++lineNumber;
                                lineStart = index;
                            } else {
                                break;
                            }
                        }
                    }
                    function scanHexEscape(prefix) {
                        var i, len, ch, code = 0;
                        len = prefix === 'u' ? 4 : 2;
                        for (i = 0; i < len; ++i) {
                            if (index < length && isHexDigit(source[index])) {
                                ch = source[index++];
                                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
                            } else {
                                return '';
                            }
                        }
                        return String.fromCharCode(code);
                    }
                    function scanIdentifier() {
                        var ch, start, id, restore;
                        ch = source[index];
                        if (!isIdentifierStart(ch)) {
                            return;
                        }
                        start = index;
                        if (ch === '\\') {
                            ++index;
                            if (source[index] !== 'u') {
                                return;
                            }
                            ++index;
                            restore = index;
                            ch = scanHexEscape('u');
                            if (ch) {
                                if (ch === '\\' || !isIdentifierStart(ch)) {
                                    return;
                                }
                                id = ch;
                            } else {
                                index = restore;
                                id = 'u';
                            }
                        } else {
                            id = source[index++];
                        }
                        while (index < length) {
                            ch = source[index];
                            if (!isIdentifierPart(ch)) {
                                break;
                            }
                            if (ch === '\\') {
                                ++index;
                                if (source[index] !== 'u') {
                                    return;
                                }
                                ++index;
                                restore = index;
                                ch = scanHexEscape('u');
                                if (ch) {
                                    if (ch === '\\' || !isIdentifierPart(ch)) {
                                        return;
                                    }
                                    id += ch;
                                } else {
                                    index = restore;
                                    id += 'u';
                                }
                            } else {
                                id += source[index++];
                            }
                        }
                        // There is no keyword or literal with only one character.
                        // Thus, it must be an identifier.
                        if (id.length === 1) {
                            return {
                                type: Token.Identifier,
                                value: id,
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        if (isKeyword(id)) {
                            return {
                                type: Token.Keyword,
                                value: id,
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        // 7.8.1 Null Literals
                        if (id === 'null') {
                            return {
                                type: Token.NullLiteral,
                                value: id,
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        // 7.8.2 Boolean Literals
                        if (id === 'true' || id === 'false') {
                            return {
                                type: Token.BooleanLiteral,
                                value: id,
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        return {
                            type: Token.Identifier,
                            value: id,
                            lineNumber: lineNumber,
                            lineStart: lineStart,
                            range: [
                                start,
                                index
                            ]
                        };
                    }
                    // 7.7 Punctuators
                    function scanPunctuator() {
                        var start = index, ch1 = source[index], ch2, ch3, ch4;
                        // Check for most common single-character punctuators.
                        if (ch1 === ';' || ch1 === '{' || ch1 === '}') {
                            ++index;
                            return {
                                type: Token.Punctuator,
                                value: ch1,
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        if (ch1 === ',' || ch1 === '(' || ch1 === ')') {
                            ++index;
                            return {
                                type: Token.Punctuator,
                                value: ch1,
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        // Dot (.) can also start a floating-point number, hence the need
                        // to check the next character.
                        ch2 = source[index + 1];
                        if (ch1 === '.' && !isDecimalDigit(ch2)) {
                            return {
                                type: Token.Punctuator,
                                value: source[index++],
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        // Peek more characters.
                        ch3 = source[index + 2];
                        ch4 = source[index + 3];
                        // 4-character punctuator: >>>=
                        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
                            if (ch4 === '=') {
                                index += 4;
                                return {
                                    type: Token.Punctuator,
                                    value: '>>>=',
                                    lineNumber: lineNumber,
                                    lineStart: lineStart,
                                    range: [
                                        start,
                                        index
                                    ]
                                };
                            }
                        }
                        // 3-character punctuators: === !== >>> <<= >>=
                        if (ch1 === '=' && ch2 === '=' && ch3 === '=') {
                            index += 3;
                            return {
                                type: Token.Punctuator,
                                value: '===',
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        if (ch1 === '!' && ch2 === '=' && ch3 === '=') {
                            index += 3;
                            return {
                                type: Token.Punctuator,
                                value: '!==',
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
                            index += 3;
                            return {
                                type: Token.Punctuator,
                                value: '>>>',
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
                            index += 3;
                            return {
                                type: Token.Punctuator,
                                value: '<<=',
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
                            index += 3;
                            return {
                                type: Token.Punctuator,
                                value: '>>=',
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                        // 2-character punctuators: <= >= == != ++ -- << >> && ||
                        // += -= *= %= &= |= ^= /=
                        if (ch2 === '=') {
                            if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
                                index += 2;
                                return {
                                    type: Token.Punctuator,
                                    value: ch1 + ch2,
                                    lineNumber: lineNumber,
                                    lineStart: lineStart,
                                    range: [
                                        start,
                                        index
                                    ]
                                };
                            }
                        }
                        if (ch1 === ch2 && '+-<>&|'.indexOf(ch1) >= 0) {
                            if ('+-<>&|'.indexOf(ch2) >= 0) {
                                index += 2;
                                return {
                                    type: Token.Punctuator,
                                    value: ch1 + ch2,
                                    lineNumber: lineNumber,
                                    lineStart: lineStart,
                                    range: [
                                        start,
                                        index
                                    ]
                                };
                            }
                        }
                        // The remaining 1-character punctuators.
                        if ('[]<>+-*%&|^!~?:=/'.indexOf(ch1) >= 0) {
                            return {
                                type: Token.Punctuator,
                                value: source[index++],
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    start,
                                    index
                                ]
                            };
                        }
                    }
                    // 7.8.3 Numeric Literals
                    function scanNumericLiteral() {
                        var number, start, ch;
                        ch = source[index];
                        assert(isDecimalDigit(ch) || ch === '.', 'Numeric literal must start with a decimal digit or a decimal point');
                        start = index;
                        number = '';
                        if (ch !== '.') {
                            number = source[index++];
                            ch = source[index];
                            // Hex number starts with '0x'.
                            // Octal number starts with '0'.
                            if (number === '0') {
                                if (ch === 'x' || ch === 'X') {
                                    number += source[index++];
                                    while (index < length) {
                                        ch = source[index];
                                        if (!isHexDigit(ch)) {
                                            break;
                                        }
                                        number += source[index++];
                                    }
                                    if (number.length <= 2) {
                                        // only 0x
                                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                                    }
                                    if (index < length) {
                                        ch = source[index];
                                        if (isIdentifierStart(ch)) {
                                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                                        }
                                    }
                                    return {
                                        type: Token.NumericLiteral,
                                        value: parseInt(number, 16),
                                        lineNumber: lineNumber,
                                        lineStart: lineStart,
                                        range: [
                                            start,
                                            index
                                        ]
                                    };
                                } else if (isOctalDigit(ch)) {
                                    number += source[index++];
                                    while (index < length) {
                                        ch = source[index];
                                        if (!isOctalDigit(ch)) {
                                            break;
                                        }
                                        number += source[index++];
                                    }
                                    if (index < length) {
                                        ch = source[index];
                                        if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                                        }
                                    }
                                    return {
                                        type: Token.NumericLiteral,
                                        value: parseInt(number, 8),
                                        octal: true,
                                        lineNumber: lineNumber,
                                        lineStart: lineStart,
                                        range: [
                                            start,
                                            index
                                        ]
                                    };
                                }
                                // decimal number starts with '0' such as '09' is illegal.
                                if (isDecimalDigit(ch)) {
                                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                                }
                            }
                            while (index < length) {
                                ch = source[index];
                                if (!isDecimalDigit(ch)) {
                                    break;
                                }
                                number += source[index++];
                            }
                        }
                        if (ch === '.') {
                            number += source[index++];
                            while (index < length) {
                                ch = source[index];
                                if (!isDecimalDigit(ch)) {
                                    break;
                                }
                                number += source[index++];
                            }
                        }
                        if (ch === 'e' || ch === 'E') {
                            number += source[index++];
                            ch = source[index];
                            if (ch === '+' || ch === '-') {
                                number += source[index++];
                            }
                            ch = source[index];
                            if (isDecimalDigit(ch)) {
                                number += source[index++];
                                while (index < length) {
                                    ch = source[index];
                                    if (!isDecimalDigit(ch)) {
                                        break;
                                    }
                                    number += source[index++];
                                }
                            } else {
                                ch = 'character ' + ch;
                                if (index >= length) {
                                    ch = '<end>';
                                }
                                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                            }
                        }
                        if (index < length) {
                            ch = source[index];
                            if (isIdentifierStart(ch)) {
                                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                            }
                        }
                        return {
                            type: Token.NumericLiteral,
                            value: parseFloat(number),
                            lineNumber: lineNumber,
                            lineStart: lineStart,
                            range: [
                                start,
                                index
                            ]
                        };
                    }
                    // 7.8.4 String Literals
                    function scanStringLiteral() {
                        var str = '', quote, start, ch, code, unescaped, restore, octal = false;
                        quote = source[index];
                        assert(quote === '\'' || quote === '"', 'String literal must starts with a quote');
                        start = index;
                        ++index;
                        while (index < length) {
                            ch = source[index++];
                            if (ch === quote) {
                                quote = '';
                                break;
                            } else if (ch === '\\') {
                                ch = source[index++];
                                if (!isLineTerminator(ch)) {
                                    switch (ch) {
                                    case 'n':
                                        str += '\n';
                                        break;
                                    case 'r':
                                        str += '\r';
                                        break;
                                    case 't':
                                        str += '\t';
                                        break;
                                    case 'u':
                                    case 'x':
                                        restore = index;
                                        unescaped = scanHexEscape(ch);
                                        if (unescaped) {
                                            str += unescaped;
                                        } else {
                                            index = restore;
                                            str += ch;
                                        }
                                        break;
                                    case 'b':
                                        str += '\b';
                                        break;
                                    case 'f':
                                        str += '\f';
                                        break;
                                    case 'v':
                                        str += '\v';
                                        break;
                                    default:
                                        if (isOctalDigit(ch)) {
                                            code = '01234567'.indexOf(ch);
                                            // \0 is not octal escape sequence
                                            if (code !== 0) {
                                                octal = true;
                                            }
                                            if (index < length && isOctalDigit(source[index])) {
                                                octal = true;
                                                code = code * 8 + '01234567'.indexOf(source[index++]);
                                                // 3 digits are only allowed when string starts
                                                // with 0, 1, 2, 3
                                                if ('0123'.indexOf(ch) >= 0 && index < length && isOctalDigit(source[index])) {
                                                    code = code * 8 + '01234567'.indexOf(source[index++]);
                                                }
                                            }
                                            str += String.fromCharCode(code);
                                        } else {
                                            str += ch;
                                        }
                                        break;
                                    }
                                } else {
                                    ++lineNumber;
                                    if (ch === '\r' && source[index] === '\n') {
                                        ++index;
                                    }
                                }
                            } else if (isLineTerminator(ch)) {
                                break;
                            } else {
                                str += ch;
                            }
                        }
                        if (quote !== '') {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                        return {
                            type: Token.StringLiteral,
                            value: str,
                            octal: octal,
                            lineNumber: lineNumber,
                            lineStart: lineStart,
                            range: [
                                start,
                                index
                            ]
                        };
                    }
                    function scanRegExp() {
                        var str, ch, start, pattern, flags, value, classMarker = false, restore, terminated = false;
                        buffer = null;
                        skipComment();
                        start = index;
                        ch = source[index];
                        assert(ch === '/', 'Regular expression literal must start with a slash');
                        str = source[index++];
                        while (index < length) {
                            ch = source[index++];
                            str += ch;
                            if (classMarker) {
                                if (ch === ']') {
                                    classMarker = false;
                                }
                            } else {
                                if (ch === '\\') {
                                    ch = source[index++];
                                    // ECMA-262 7.8.5
                                    if (isLineTerminator(ch)) {
                                        throwError({}, Messages.UnterminatedRegExp);
                                    }
                                    str += ch;
                                } else if (ch === '/') {
                                    terminated = true;
                                    break;
                                } else if (ch === '[') {
                                    classMarker = true;
                                } else if (isLineTerminator(ch)) {
                                    throwError({}, Messages.UnterminatedRegExp);
                                }
                            }
                        }
                        if (!terminated) {
                            throwError({}, Messages.UnterminatedRegExp);
                        }
                        // Exclude leading and trailing slash.
                        pattern = str.substr(1, str.length - 2);
                        flags = '';
                        while (index < length) {
                            ch = source[index];
                            if (!isIdentifierPart(ch)) {
                                break;
                            }
                            ++index;
                            if (ch === '\\' && index < length) {
                                ch = source[index];
                                if (ch === 'u') {
                                    ++index;
                                    restore = index;
                                    ch = scanHexEscape('u');
                                    if (ch) {
                                        flags += ch;
                                        str += '\\u';
                                        for (; restore < index; ++restore) {
                                            str += source[restore];
                                        }
                                    } else {
                                        index = restore;
                                        flags += 'u';
                                        str += '\\u';
                                    }
                                } else {
                                    str += '\\';
                                }
                            } else {
                                flags += ch;
                                str += ch;
                            }
                        }
                        try {
                            value = new RegExp(pattern, flags);
                        } catch (e) {
                            throwError({}, Messages.InvalidRegExp);
                        }
                        return {
                            literal: str,
                            value: value,
                            range: [
                                start,
                                index
                            ]
                        };
                    }
                    function isIdentifierName(token) {
                        return token.type === Token.Identifier || token.type === Token.Keyword || token.type === Token.BooleanLiteral || token.type === Token.NullLiteral;
                    }
                    function advance() {
                        var ch, token;
                        skipComment();
                        if (index >= length) {
                            return {
                                type: Token.EOF,
                                lineNumber: lineNumber,
                                lineStart: lineStart,
                                range: [
                                    index,
                                    index
                                ]
                            };
                        }
                        token = scanPunctuator();
                        if (typeof token !== 'undefined') {
                            return token;
                        }
                        ch = source[index];
                        if (ch === '\'' || ch === '"') {
                            return scanStringLiteral();
                        }
                        if (ch === '.' || isDecimalDigit(ch)) {
                            return scanNumericLiteral();
                        }
                        token = scanIdentifier();
                        if (typeof token !== 'undefined') {
                            return token;
                        }
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    function lex() {
                        var token;
                        if (buffer) {
                            index = buffer.range[1];
                            lineNumber = buffer.lineNumber;
                            lineStart = buffer.lineStart;
                            token = buffer;
                            buffer = null;
                            return token;
                        }
                        buffer = null;
                        return advance();
                    }
                    function lookahead() {
                        var pos, line, start;
                        if (buffer !== null) {
                            return buffer;
                        }
                        pos = index;
                        line = lineNumber;
                        start = lineStart;
                        buffer = advance();
                        index = pos;
                        lineNumber = line;
                        lineStart = start;
                        return buffer;
                    }
                    // Return true if there is a line terminator before the next token.
                    function peekLineTerminator() {
                        var pos, line, start, found;
                        pos = index;
                        line = lineNumber;
                        start = lineStart;
                        skipComment();
                        found = lineNumber !== line;
                        index = pos;
                        lineNumber = line;
                        lineStart = start;
                        return found;
                    }
                    // Throw an exception
                    function throwError(token, messageFormat) {
                        var error, args = Array.prototype.slice.call(arguments, 2), msg = messageFormat.replace(/%(\d)/g, function (whole, index) {
                                return args[index] || '';
                            });
                        if (typeof token.lineNumber === 'number') {
                            error = new Error('Line ' + token.lineNumber + ': ' + msg);
                            error.index = token.range[0];
                            error.lineNumber = token.lineNumber;
                            error.column = token.range[0] - lineStart + 1;
                        } else {
                            error = new Error('Line ' + lineNumber + ': ' + msg);
                            error.index = index;
                            error.lineNumber = lineNumber;
                            error.column = index - lineStart + 1;
                        }
                        throw error;
                    }
                    function throwErrorTolerant() {
                        try {
                            throwError.apply(null, arguments);
                        } catch (e) {
                            if (extra.errors) {
                                extra.errors.push(e);
                            } else {
                                throw e;
                            }
                        }
                    }
                    // Throw an exception because of the token.
                    function throwUnexpected(token) {
                        if (token.type === Token.EOF) {
                            throwError(token, Messages.UnexpectedEOS);
                        }
                        if (token.type === Token.NumericLiteral) {
                            throwError(token, Messages.UnexpectedNumber);
                        }
                        if (token.type === Token.StringLiteral) {
                            throwError(token, Messages.UnexpectedString);
                        }
                        if (token.type === Token.Identifier) {
                            throwError(token, Messages.UnexpectedIdentifier);
                        }
                        if (token.type === Token.Keyword) {
                            if (isFutureReservedWord(token.value)) {
                                throwError(token, Messages.UnexpectedReserved);
                            } else if (strict && isStrictModeReservedWord(token.value)) {
                                throwErrorTolerant(token, Messages.StrictReservedWord);
                                return;
                            }
                            throwError(token, Messages.UnexpectedToken, token.value);
                        }
                        // BooleanLiteral, NullLiteral, or Punctuator.
                        throwError(token, Messages.UnexpectedToken, token.value);
                    }
                    // Expect the next token to match the specified punctuator.
                    // If not, an exception will be thrown.
                    function expect(value) {
                        var token = lex();
                        if (token.type !== Token.Punctuator || token.value !== value) {
                            throwUnexpected(token);
                        }
                    }
                    // Expect the next token to match the specified keyword.
                    // If not, an exception will be thrown.
                    function expectKeyword(keyword) {
                        var token = lex();
                        if (token.type !== Token.Keyword || token.value !== keyword) {
                            throwUnexpected(token);
                        }
                    }
                    // Return true if the next token matches the specified punctuator.
                    function match(value) {
                        var token = lookahead();
                        return token.type === Token.Punctuator && token.value === value;
                    }
                    // Return true if the next token matches the specified keyword
                    function matchKeyword(keyword) {
                        var token = lookahead();
                        return token.type === Token.Keyword && token.value === keyword;
                    }
                    // Return true if the next token is an assignment operator
                    function matchAssign() {
                        var token = lookahead(), op = token.value;
                        if (token.type !== Token.Punctuator) {
                            return false;
                        }
                        return op === '=' || op === '*=' || op === '/=' || op === '%=' || op === '+=' || op === '-=' || op === '<<=' || op === '>>=' || op === '>>>=' || op === '&=' || op === '^=' || op === '|=';
                    }
                    function consumeSemicolon() {
                        var token, line;
                        // Catch the very common case first.
                        if (source[index] === ';') {
                            lex();
                            return;
                        }
                        line = lineNumber;
                        skipComment();
                        if (lineNumber !== line) {
                            return;
                        }
                        if (match(';')) {
                            lex();
                            return;
                        }
                        token = lookahead();
                        if (token.type !== Token.EOF && !match('}')) {
                            throwUnexpected(token);
                        }
                    }
                    // Return true if provided expression is LeftHandSideExpression
                    function isLeftHandSide(expr) {
                        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
                    }
                    // 11.1.4 Array Initialiser
                    function parseArrayInitialiser() {
                        var elements = [];
                        expect('[');
                        while (!match(']')) {
                            if (match(',')) {
                                lex();
                                elements.push(null);
                            } else {
                                elements.push(parseAssignmentExpression());
                                if (!match(']')) {
                                    expect(',');
                                }
                            }
                        }
                        expect(']');
                        return {
                            type: Syntax.ArrayExpression,
                            elements: elements
                        };
                    }
                    // 11.1.5 Object Initialiser
                    function parsePropertyFunction(param, first) {
                        var previousStrict, body;
                        previousStrict = strict;
                        body = parseFunctionSourceElements();
                        if (first && strict && isRestrictedWord(param[0].name)) {
                            throwErrorTolerant(first, Messages.StrictParamName);
                        }
                        strict = previousStrict;
                        return {
                            type: Syntax.FunctionExpression,
                            id: null,
                            params: param,
                            defaults: [],
                            body: body,
                            rest: null,
                            generator: false,
                            expression: false
                        };
                    }
                    function parseObjectPropertyKey() {
                        var token = lex();
                        // Note: This function is called only from parseObjectProperty(), where
                        // EOF and Punctuator tokens are already filtered out.
                        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
                            if (strict && token.octal) {
                                throwErrorTolerant(token, Messages.StrictOctalLiteral);
                            }
                            return createLiteral(token);
                        }
                        return {
                            type: Syntax.Identifier,
                            name: token.value
                        };
                    }
                    function parseObjectProperty() {
                        var token, key, id, param;
                        token = lookahead();
                        if (token.type === Token.Identifier) {
                            id = parseObjectPropertyKey();
                            // Property Assignment: Getter and Setter.
                            if (token.value === 'get' && !match(':')) {
                                key = parseObjectPropertyKey();
                                expect('(');
                                expect(')');
                                return {
                                    type: Syntax.Property,
                                    key: key,
                                    value: parsePropertyFunction([]),
                                    kind: 'get'
                                };
                            } else if (token.value === 'set' && !match(':')) {
                                key = parseObjectPropertyKey();
                                expect('(');
                                token = lookahead();
                                if (token.type !== Token.Identifier) {
                                    throwUnexpected(lex());
                                }
                                param = [parseVariableIdentifier()];
                                expect(')');
                                return {
                                    type: Syntax.Property,
                                    key: key,
                                    value: parsePropertyFunction(param, token),
                                    kind: 'set'
                                };
                            } else {
                                expect(':');
                                return {
                                    type: Syntax.Property,
                                    key: id,
                                    value: parseAssignmentExpression(),
                                    kind: 'init'
                                };
                            }
                        } else if (token.type === Token.EOF || token.type === Token.Punctuator) {
                            throwUnexpected(token);
                        } else {
                            key = parseObjectPropertyKey();
                            expect(':');
                            return {
                                type: Syntax.Property,
                                key: key,
                                value: parseAssignmentExpression(),
                                kind: 'init'
                            };
                        }
                    }
                    function parseObjectInitialiser() {
                        var properties = [], property, name, kind, map = {}, toString = String;
                        expect('{');
                        while (!match('}')) {
                            property = parseObjectProperty();
                            if (property.key.type === Syntax.Identifier) {
                                name = property.key.name;
                            } else {
                                name = toString(property.key.value);
                            }
                            kind = property.kind === 'init' ? PropertyKind.Data : property.kind === 'get' ? PropertyKind.Get : PropertyKind.Set;
                            if (Object.prototype.hasOwnProperty.call(map, name)) {
                                if (map[name] === PropertyKind.Data) {
                                    if (strict && kind === PropertyKind.Data) {
                                        throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                                    } else if (kind !== PropertyKind.Data) {
                                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                                    }
                                } else {
                                    if (kind === PropertyKind.Data) {
                                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                                    } else if (map[name] & kind) {
                                        throwErrorTolerant({}, Messages.AccessorGetSet);
                                    }
                                }
                                map[name] |= kind;
                            } else {
                                map[name] = kind;
                            }
                            properties.push(property);
                            if (!match('}')) {
                                expect(',');
                            }
                        }
                        expect('}');
                        return {
                            type: Syntax.ObjectExpression,
                            properties: properties
                        };
                    }
                    // 11.1.6 The Grouping Operator
                    function parseGroupExpression() {
                        var expr;
                        expect('(');
                        expr = parseExpression();
                        expect(')');
                        return expr;
                    }
                    // 11.1 Primary Expressions
                    function parsePrimaryExpression() {
                        var token = lookahead(), type = token.type;
                        if (type === Token.Identifier) {
                            return {
                                type: Syntax.Identifier,
                                name: lex().value
                            };
                        }
                        if (type === Token.StringLiteral || type === Token.NumericLiteral) {
                            if (strict && token.octal) {
                                throwErrorTolerant(token, Messages.StrictOctalLiteral);
                            }
                            return createLiteral(lex());
                        }
                        if (type === Token.Keyword) {
                            if (matchKeyword('this')) {
                                lex();
                                return { type: Syntax.ThisExpression };
                            }
                            if (matchKeyword('function')) {
                                return parseFunctionExpression();
                            }
                        }
                        if (type === Token.BooleanLiteral) {
                            lex();
                            token.value = token.value === 'true';
                            return createLiteral(token);
                        }
                        if (type === Token.NullLiteral) {
                            lex();
                            token.value = null;
                            return createLiteral(token);
                        }
                        if (match('[')) {
                            return parseArrayInitialiser();
                        }
                        if (match('{')) {
                            return parseObjectInitialiser();
                        }
                        if (match('(')) {
                            return parseGroupExpression();
                        }
                        if (match('/') || match('/=')) {
                            return createLiteral(scanRegExp());
                        }
                        return throwUnexpected(lex());
                    }
                    // 11.2 Left-Hand-Side Expressions
                    function parseArguments() {
                        var args = [];
                        expect('(');
                        if (!match(')')) {
                            while (index < length) {
                                args.push(parseAssignmentExpression());
                                if (match(')')) {
                                    break;
                                }
                                expect(',');
                            }
                        }
                        expect(')');
                        return args;
                    }
                    function parseNonComputedProperty() {
                        var token = lex();
                        if (!isIdentifierName(token)) {
                            throwUnexpected(token);
                        }
                        return {
                            type: Syntax.Identifier,
                            name: token.value
                        };
                    }
                    function parseNonComputedMember() {
                        expect('.');
                        return parseNonComputedProperty();
                    }
                    function parseComputedMember() {
                        var expr;
                        expect('[');
                        expr = parseExpression();
                        expect(']');
                        return expr;
                    }
                    function parseNewExpression() {
                        var expr;
                        expectKeyword('new');
                        expr = {
                            type: Syntax.NewExpression,
                            callee: parseLeftHandSideExpression(),
                            'arguments': []
                        };
                        if (match('(')) {
                            expr['arguments'] = parseArguments();
                        }
                        return expr;
                    }
                    function parseLeftHandSideExpressionAllowCall() {
                        var expr;
                        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
                        while (match('.') || match('[') || match('(')) {
                            if (match('(')) {
                                expr = {
                                    type: Syntax.CallExpression,
                                    callee: expr,
                                    'arguments': parseArguments()
                                };
                            } else if (match('[')) {
                                expr = {
                                    type: Syntax.MemberExpression,
                                    computed: true,
                                    object: expr,
                                    property: parseComputedMember()
                                };
                            } else {
                                expr = {
                                    type: Syntax.MemberExpression,
                                    computed: false,
                                    object: expr,
                                    property: parseNonComputedMember()
                                };
                            }
                        }
                        return expr;
                    }
                    function parseLeftHandSideExpression() {
                        var expr;
                        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
                        while (match('.') || match('[')) {
                            if (match('[')) {
                                expr = {
                                    type: Syntax.MemberExpression,
                                    computed: true,
                                    object: expr,
                                    property: parseComputedMember()
                                };
                            } else {
                                expr = {
                                    type: Syntax.MemberExpression,
                                    computed: false,
                                    object: expr,
                                    property: parseNonComputedMember()
                                };
                            }
                        }
                        return expr;
                    }
                    // 11.3 Postfix Expressions
                    function parsePostfixExpression() {
                        var expr = parseLeftHandSideExpressionAllowCall(), token;
                        token = lookahead();
                        if (token.type !== Token.Punctuator) {
                            return expr;
                        }
                        if ((match('++') || match('--')) && !peekLineTerminator()) {
                            // 11.3.1, 11.3.2
                            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                                throwErrorTolerant({}, Messages.StrictLHSPostfix);
                            }
                            if (!isLeftHandSide(expr)) {
                                throwError({}, Messages.InvalidLHSInAssignment);
                            }
                            expr = {
                                type: Syntax.UpdateExpression,
                                operator: lex().value,
                                argument: expr,
                                prefix: false
                            };
                        }
                        return expr;
                    }
                    // 11.4 Unary Operators
                    function parseUnaryExpression() {
                        var token, expr;
                        token = lookahead();
                        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
                            return parsePostfixExpression();
                        }
                        if (match('++') || match('--')) {
                            token = lex();
                            expr = parseUnaryExpression();
                            // 11.4.4, 11.4.5
                            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                                throwErrorTolerant({}, Messages.StrictLHSPrefix);
                            }
                            if (!isLeftHandSide(expr)) {
                                throwError({}, Messages.InvalidLHSInAssignment);
                            }
                            expr = {
                                type: Syntax.UpdateExpression,
                                operator: token.value,
                                argument: expr,
                                prefix: true
                            };
                            return expr;
                        }
                        if (match('+') || match('-') || match('~') || match('!')) {
                            expr = {
                                type: Syntax.UnaryExpression,
                                operator: lex().value,
                                argument: parseUnaryExpression()
                            };
                            return expr;
                        }
                        if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
                            expr = {
                                type: Syntax.UnaryExpression,
                                operator: lex().value,
                                argument: parseUnaryExpression()
                            };
                            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                                throwErrorTolerant({}, Messages.StrictDelete);
                            }
                            return expr;
                        }
                        return parsePostfixExpression();
                    }
                    // 11.5 Multiplicative Operators
                    function parseMultiplicativeExpression() {
                        var expr = parseUnaryExpression();
                        while (match('*') || match('/') || match('%')) {
                            expr = {
                                type: Syntax.BinaryExpression,
                                operator: lex().value,
                                left: expr,
                                right: parseUnaryExpression()
                            };
                        }
                        return expr;
                    }
                    // 11.6 Additive Operators
                    function parseAdditiveExpression() {
                        var expr = parseMultiplicativeExpression();
                        while (match('+') || match('-')) {
                            expr = {
                                type: Syntax.BinaryExpression,
                                operator: lex().value,
                                left: expr,
                                right: parseMultiplicativeExpression()
                            };
                        }
                        return expr;
                    }
                    // 11.7 Bitwise Shift Operators
                    function parseShiftExpression() {
                        var expr = parseAdditiveExpression();
                        while (match('<<') || match('>>') || match('>>>')) {
                            expr = {
                                type: Syntax.BinaryExpression,
                                operator: lex().value,
                                left: expr,
                                right: parseAdditiveExpression()
                            };
                        }
                        return expr;
                    }
                    // 11.8 Relational Operators
                    function parseRelationalExpression() {
                        var expr, previousAllowIn;
                        previousAllowIn = state.allowIn;
                        state.allowIn = true;
                        expr = parseShiftExpression();
                        while (match('<') || match('>') || match('<=') || match('>=') || previousAllowIn && matchKeyword('in') || matchKeyword('instanceof')) {
                            expr = {
                                type: Syntax.BinaryExpression,
                                operator: lex().value,
                                left: expr,
                                right: parseShiftExpression()
                            };
                        }
                        state.allowIn = previousAllowIn;
                        return expr;
                    }
                    // 11.9 Equality Operators
                    function parseEqualityExpression() {
                        var expr = parseRelationalExpression();
                        while (match('==') || match('!=') || match('===') || match('!==')) {
                            expr = {
                                type: Syntax.BinaryExpression,
                                operator: lex().value,
                                left: expr,
                                right: parseRelationalExpression()
                            };
                        }
                        return expr;
                    }
                    // 11.10 Binary Bitwise Operators
                    function parseBitwiseANDExpression() {
                        var expr = parseEqualityExpression();
                        while (match('&')) {
                            lex();
                            expr = {
                                type: Syntax.BinaryExpression,
                                operator: '&',
                                left: expr,
                                right: parseEqualityExpression()
                            };
                        }
                        return expr;
                    }
                    function parseBitwiseXORExpression() {
                        var expr = parseBitwiseANDExpression();
                        while (match('^')) {
                            lex();
                            expr = {
                                type: Syntax.BinaryExpression,
                                operator: '^',
                                left: expr,
                                right: parseBitwiseANDExpression()
                            };
                        }
                        return expr;
                    }
                    function parseBitwiseORExpression() {
                        var expr = parseBitwiseXORExpression();
                        while (match('|')) {
                            lex();
                            expr = {
                                type: Syntax.BinaryExpression,
                                operator: '|',
                                left: expr,
                                right: parseBitwiseXORExpression()
                            };
                        }
                        return expr;
                    }
                    // 11.11 Binary Logical Operators
                    function parseLogicalANDExpression() {
                        var expr = parseBitwiseORExpression();
                        while (match('&&')) {
                            lex();
                            expr = {
                                type: Syntax.LogicalExpression,
                                operator: '&&',
                                left: expr,
                                right: parseBitwiseORExpression()
                            };
                        }
                        return expr;
                    }
                    function parseLogicalORExpression() {
                        var expr = parseLogicalANDExpression();
                        while (match('||')) {
                            lex();
                            expr = {
                                type: Syntax.LogicalExpression,
                                operator: '||',
                                left: expr,
                                right: parseLogicalANDExpression()
                            };
                        }
                        return expr;
                    }
                    // 11.12 Conditional Operator
                    function parseConditionalExpression() {
                        var expr, previousAllowIn, consequent;
                        expr = parseLogicalORExpression();
                        if (match('?')) {
                            lex();
                            previousAllowIn = state.allowIn;
                            state.allowIn = true;
                            consequent = parseAssignmentExpression();
                            state.allowIn = previousAllowIn;
                            expect(':');
                            expr = {
                                type: Syntax.ConditionalExpression,
                                test: expr,
                                consequent: consequent,
                                alternate: parseAssignmentExpression()
                            };
                        }
                        return expr;
                    }
                    // 11.13 Assignment Operators
                    function parseAssignmentExpression() {
                        var token, expr;
                        token = lookahead();
                        expr = parseConditionalExpression();
                        if (matchAssign()) {
                            // LeftHandSideExpression
                            if (!isLeftHandSide(expr)) {
                                throwError({}, Messages.InvalidLHSInAssignment);
                            }
                            // 11.13.1
                            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                                throwErrorTolerant(token, Messages.StrictLHSAssignment);
                            }
                            expr = {
                                type: Syntax.AssignmentExpression,
                                operator: lex().value,
                                left: expr,
                                right: parseAssignmentExpression()
                            };
                        }
                        return expr;
                    }
                    // 11.14 Comma Operator
                    function parseExpression() {
                        var expr = parseAssignmentExpression();
                        if (match(',')) {
                            expr = {
                                type: Syntax.SequenceExpression,
                                expressions: [expr]
                            };
                            while (index < length) {
                                if (!match(',')) {
                                    break;
                                }
                                lex();
                                expr.expressions.push(parseAssignmentExpression());
                            }
                        }
                        return expr;
                    }
                    // 12.1 Block
                    function parseStatementList() {
                        var list = [], statement;
                        while (index < length) {
                            if (match('}')) {
                                break;
                            }
                            statement = parseSourceElement();
                            if (typeof statement === 'undefined') {
                                break;
                            }
                            list.push(statement);
                        }
                        return list;
                    }
                    function parseBlock() {
                        var block;
                        expect('{');
                        block = parseStatementList();
                        expect('}');
                        return {
                            type: Syntax.BlockStatement,
                            body: block
                        };
                    }
                    // 12.2 Variable Statement
                    function parseVariableIdentifier() {
                        var token = lex();
                        if (token.type !== Token.Identifier) {
                            throwUnexpected(token);
                        }
                        return {
                            type: Syntax.Identifier,
                            name: token.value
                        };
                    }
                    function parseVariableDeclaration(kind) {
                        var id = parseVariableIdentifier(), init = null;
                        // 12.2.1
                        if (strict && isRestrictedWord(id.name)) {
                            throwErrorTolerant({}, Messages.StrictVarName);
                        }
                        if (kind === 'const') {
                            expect('=');
                            init = parseAssignmentExpression();
                        } else if (match('=')) {
                            lex();
                            init = parseAssignmentExpression();
                        }
                        return {
                            type: Syntax.VariableDeclarator,
                            id: id,
                            init: init
                        };
                    }
                    function parseVariableDeclarationList(kind) {
                        var list = [];
                        while (index < length) {
                            list.push(parseVariableDeclaration(kind));
                            if (!match(',')) {
                                break;
                            }
                            lex();
                        }
                        return list;
                    }
                    function parseVariableStatement() {
                        var declarations;
                        expectKeyword('var');
                        declarations = parseVariableDeclarationList();
                        consumeSemicolon();
                        return {
                            type: Syntax.VariableDeclaration,
                            declarations: declarations,
                            kind: 'var'
                        };
                    }
                    // kind may be `const` or `let`
                    // Both are experimental and not in the specification yet.
                    // see http://wiki.ecmascript.org/doku.php?id=harmony:const
                    // and http://wiki.ecmascript.org/doku.php?id=harmony:let
                    function parseConstLetDeclaration(kind) {
                        var declarations;
                        expectKeyword(kind);
                        declarations = parseVariableDeclarationList(kind);
                        consumeSemicolon();
                        return {
                            type: Syntax.VariableDeclaration,
                            declarations: declarations,
                            kind: kind
                        };
                    }
                    // 12.3 Empty Statement
                    function parseEmptyStatement() {
                        expect(';');
                        return { type: Syntax.EmptyStatement };
                    }
                    // 12.4 Expression Statement
                    function parseExpressionStatement() {
                        var expr = parseExpression();
                        consumeSemicolon();
                        return {
                            type: Syntax.ExpressionStatement,
                            expression: expr
                        };
                    }
                    // 12.5 If statement
                    function parseIfStatement() {
                        var test, consequent, alternate;
                        expectKeyword('if');
                        expect('(');
                        test = parseExpression();
                        expect(')');
                        consequent = parseStatement();
                        if (matchKeyword('else')) {
                            lex();
                            alternate = parseStatement();
                        } else {
                            alternate = null;
                        }
                        return {
                            type: Syntax.IfStatement,
                            test: test,
                            consequent: consequent,
                            alternate: alternate
                        };
                    }
                    // 12.6 Iteration Statements
                    function parseDoWhileStatement() {
                        var body, test, oldInIteration;
                        expectKeyword('do');
                        oldInIteration = state.inIteration;
                        state.inIteration = true;
                        body = parseStatement();
                        state.inIteration = oldInIteration;
                        expectKeyword('while');
                        expect('(');
                        test = parseExpression();
                        expect(')');
                        if (match(';')) {
                            lex();
                        }
                        return {
                            type: Syntax.DoWhileStatement,
                            body: body,
                            test: test
                        };
                    }
                    function parseWhileStatement() {
                        var test, body, oldInIteration;
                        expectKeyword('while');
                        expect('(');
                        test = parseExpression();
                        expect(')');
                        oldInIteration = state.inIteration;
                        state.inIteration = true;
                        body = parseStatement();
                        state.inIteration = oldInIteration;
                        return {
                            type: Syntax.WhileStatement,
                            test: test,
                            body: body
                        };
                    }
                    function parseForVariableDeclaration() {
                        var token = lex();
                        return {
                            type: Syntax.VariableDeclaration,
                            declarations: parseVariableDeclarationList(),
                            kind: token.value
                        };
                    }
                    function parseForStatement() {
                        var init, test, update, left, right, body, oldInIteration;
                        init = test = update = null;
                        expectKeyword('for');
                        expect('(');
                        if (match(';')) {
                            lex();
                        } else {
                            if (matchKeyword('var') || matchKeyword('let')) {
                                state.allowIn = false;
                                init = parseForVariableDeclaration();
                                state.allowIn = true;
                                if (init.declarations.length === 1 && matchKeyword('in')) {
                                    lex();
                                    left = init;
                                    right = parseExpression();
                                    init = null;
                                }
                            } else {
                                state.allowIn = false;
                                init = parseExpression();
                                state.allowIn = true;
                                if (matchKeyword('in')) {
                                    // LeftHandSideExpression
                                    if (!isLeftHandSide(init)) {
                                        throwError({}, Messages.InvalidLHSInForIn);
                                    }
                                    lex();
                                    left = init;
                                    right = parseExpression();
                                    init = null;
                                }
                            }
                            if (typeof left === 'undefined') {
                                expect(';');
                            }
                        }
                        if (typeof left === 'undefined') {
                            if (!match(';')) {
                                test = parseExpression();
                            }
                            expect(';');
                            if (!match(')')) {
                                update = parseExpression();
                            }
                        }
                        expect(')');
                        oldInIteration = state.inIteration;
                        state.inIteration = true;
                        body = parseStatement();
                        state.inIteration = oldInIteration;
                        if (typeof left === 'undefined') {
                            return {
                                type: Syntax.ForStatement,
                                init: init,
                                test: test,
                                update: update,
                                body: body
                            };
                        }
                        return {
                            type: Syntax.ForInStatement,
                            left: left,
                            right: right,
                            body: body,
                            each: false
                        };
                    }
                    // 12.7 The continue statement
                    function parseContinueStatement() {
                        var token, label = null;
                        expectKeyword('continue');
                        // Optimize the most common form: 'continue;'.
                        if (source[index] === ';') {
                            lex();
                            if (!state.inIteration) {
                                throwError({}, Messages.IllegalContinue);
                            }
                            return {
                                type: Syntax.ContinueStatement,
                                label: null
                            };
                        }
                        if (peekLineTerminator()) {
                            if (!state.inIteration) {
                                throwError({}, Messages.IllegalContinue);
                            }
                            return {
                                type: Syntax.ContinueStatement,
                                label: null
                            };
                        }
                        token = lookahead();
                        if (token.type === Token.Identifier) {
                            label = parseVariableIdentifier();
                            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                                throwError({}, Messages.UnknownLabel, label.name);
                            }
                        }
                        consumeSemicolon();
                        if (label === null && !state.inIteration) {
                            throwError({}, Messages.IllegalContinue);
                        }
                        return {
                            type: Syntax.ContinueStatement,
                            label: label
                        };
                    }
                    // 12.8 The break statement
                    function parseBreakStatement() {
                        var token, label = null;
                        expectKeyword('break');
                        // Optimize the most common form: 'break;'.
                        if (source[index] === ';') {
                            lex();
                            if (!(state.inIteration || state.inSwitch)) {
                                throwError({}, Messages.IllegalBreak);
                            }
                            return {
                                type: Syntax.BreakStatement,
                                label: null
                            };
                        }
                        if (peekLineTerminator()) {
                            if (!(state.inIteration || state.inSwitch)) {
                                throwError({}, Messages.IllegalBreak);
                            }
                            return {
                                type: Syntax.BreakStatement,
                                label: null
                            };
                        }
                        token = lookahead();
                        if (token.type === Token.Identifier) {
                            label = parseVariableIdentifier();
                            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                                throwError({}, Messages.UnknownLabel, label.name);
                            }
                        }
                        consumeSemicolon();
                        if (label === null && !(state.inIteration || state.inSwitch)) {
                            throwError({}, Messages.IllegalBreak);
                        }
                        return {
                            type: Syntax.BreakStatement,
                            label: label
                        };
                    }
                    // 12.9 The return statement
                    function parseReturnStatement() {
                        var token, argument = null;
                        expectKeyword('return');
                        if (!state.inFunctionBody) {
                            throwErrorTolerant({}, Messages.IllegalReturn);
                        }
                        // 'return' followed by a space and an identifier is very common.
                        if (source[index] === ' ') {
                            if (isIdentifierStart(source[index + 1])) {
                                argument = parseExpression();
                                consumeSemicolon();
                                return {
                                    type: Syntax.ReturnStatement,
                                    argument: argument
                                };
                            }
                        }
                        if (peekLineTerminator()) {
                            return {
                                type: Syntax.ReturnStatement,
                                argument: null
                            };
                        }
                        if (!match(';')) {
                            token = lookahead();
                            if (!match('}') && token.type !== Token.EOF) {
                                argument = parseExpression();
                            }
                        }
                        consumeSemicolon();
                        return {
                            type: Syntax.ReturnStatement,
                            argument: argument
                        };
                    }
                    // 12.10 The with statement
                    function parseWithStatement() {
                        var object, body;
                        if (strict) {
                            throwErrorTolerant({}, Messages.StrictModeWith);
                        }
                        expectKeyword('with');
                        expect('(');
                        object = parseExpression();
                        expect(')');
                        body = parseStatement();
                        return {
                            type: Syntax.WithStatement,
                            object: object,
                            body: body
                        };
                    }
                    // 12.10 The swith statement
                    function parseSwitchCase() {
                        var test, consequent = [], statement;
                        if (matchKeyword('default')) {
                            lex();
                            test = null;
                        } else {
                            expectKeyword('case');
                            test = parseExpression();
                        }
                        expect(':');
                        while (index < length) {
                            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                                break;
                            }
                            statement = parseStatement();
                            if (typeof statement === 'undefined') {
                                break;
                            }
                            consequent.push(statement);
                        }
                        return {
                            type: Syntax.SwitchCase,
                            test: test,
                            consequent: consequent
                        };
                    }
                    function parseSwitchStatement() {
                        var discriminant, cases, clause, oldInSwitch, defaultFound;
                        expectKeyword('switch');
                        expect('(');
                        discriminant = parseExpression();
                        expect(')');
                        expect('{');
                        if (match('}')) {
                            lex();
                            return {
                                type: Syntax.SwitchStatement,
                                discriminant: discriminant
                            };
                        }
                        cases = [];
                        oldInSwitch = state.inSwitch;
                        state.inSwitch = true;
                        defaultFound = false;
                        while (index < length) {
                            if (match('}')) {
                                break;
                            }
                            clause = parseSwitchCase();
                            if (clause.test === null) {
                                if (defaultFound) {
                                    throwError({}, Messages.MultipleDefaultsInSwitch);
                                }
                                defaultFound = true;
                            }
                            cases.push(clause);
                        }
                        state.inSwitch = oldInSwitch;
                        expect('}');
                        return {
                            type: Syntax.SwitchStatement,
                            discriminant: discriminant,
                            cases: cases
                        };
                    }
                    // 12.13 The throw statement
                    function parseThrowStatement() {
                        var argument;
                        expectKeyword('throw');
                        if (peekLineTerminator()) {
                            throwError({}, Messages.NewlineAfterThrow);
                        }
                        argument = parseExpression();
                        consumeSemicolon();
                        return {
                            type: Syntax.ThrowStatement,
                            argument: argument
                        };
                    }
                    // 12.14 The try statement
                    function parseCatchClause() {
                        var param;
                        expectKeyword('catch');
                        expect('(');
                        if (!match(')')) {
                            param = parseExpression();
                            // 12.14.1
                            if (strict && param.type === Syntax.Identifier && isRestrictedWord(param.name)) {
                                throwErrorTolerant({}, Messages.StrictCatchVariable);
                            }
                        }
                        expect(')');
                        return {
                            type: Syntax.CatchClause,
                            param: param,
                            body: parseBlock()
                        };
                    }
                    function parseTryStatement() {
                        var block, handlers = [], finalizer = null;
                        expectKeyword('try');
                        block = parseBlock();
                        if (matchKeyword('catch')) {
                            handlers.push(parseCatchClause());
                        }
                        if (matchKeyword('finally')) {
                            lex();
                            finalizer = parseBlock();
                        }
                        if (handlers.length === 0 && !finalizer) {
                            throwError({}, Messages.NoCatchOrFinally);
                        }
                        return {
                            type: Syntax.TryStatement,
                            block: block,
                            guardedHandlers: [],
                            handlers: handlers,
                            finalizer: finalizer
                        };
                    }
                    // 12.15 The debugger statement
                    function parseDebuggerStatement() {
                        expectKeyword('debugger');
                        consumeSemicolon();
                        return { type: Syntax.DebuggerStatement };
                    }
                    // 12 Statements
                    function parseStatement() {
                        var token = lookahead(), expr, labeledBody;
                        if (token.type === Token.EOF) {
                            throwUnexpected(token);
                        }
                        if (token.type === Token.Punctuator) {
                            switch (token.value) {
                            case ';':
                                return parseEmptyStatement();
                            case '{':
                                return parseBlock();
                            case '(':
                                return parseExpressionStatement();
                            default:
                                break;
                            }
                        }
                        if (token.type === Token.Keyword) {
                            switch (token.value) {
                            case 'break':
                                return parseBreakStatement();
                            case 'continue':
                                return parseContinueStatement();
                            case 'debugger':
                                return parseDebuggerStatement();
                            case 'do':
                                return parseDoWhileStatement();
                            case 'for':
                                return parseForStatement();
                            case 'function':
                                return parseFunctionDeclaration();
                            case 'if':
                                return parseIfStatement();
                            case 'return':
                                return parseReturnStatement();
                            case 'switch':
                                return parseSwitchStatement();
                            case 'throw':
                                return parseThrowStatement();
                            case 'try':
                                return parseTryStatement();
                            case 'var':
                                return parseVariableStatement();
                            case 'while':
                                return parseWhileStatement();
                            case 'with':
                                return parseWithStatement();
                            default:
                                break;
                            }
                        }
                        expr = parseExpression();
                        // 12.12 Labelled Statements
                        if (expr.type === Syntax.Identifier && match(':')) {
                            lex();
                            if (Object.prototype.hasOwnProperty.call(state.labelSet, expr.name)) {
                                throwError({}, Messages.Redeclaration, 'Label', expr.name);
                            }
                            state.labelSet[expr.name] = true;
                            labeledBody = parseStatement();
                            delete state.labelSet[expr.name];
                            return {
                                type: Syntax.LabeledStatement,
                                label: expr,
                                body: labeledBody
                            };
                        }
                        consumeSemicolon();
                        return {
                            type: Syntax.ExpressionStatement,
                            expression: expr
                        };
                    }
                    // 13 Function Definition
                    function parseFunctionSourceElements() {
                        var sourceElement, sourceElements = [], token, directive, firstRestricted, oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody;
                        expect('{');
                        while (index < length) {
                            token = lookahead();
                            if (token.type !== Token.StringLiteral) {
                                break;
                            }
                            sourceElement = parseSourceElement();
                            sourceElements.push(sourceElement);
                            if (sourceElement.expression.type !== Syntax.Literal) {
                                // this is not directive
                                break;
                            }
                            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
                            if (directive === 'use strict') {
                                strict = true;
                                if (firstRestricted) {
                                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                                }
                            } else {
                                if (!firstRestricted && token.octal) {
                                    firstRestricted = token;
                                }
                            }
                        }
                        oldLabelSet = state.labelSet;
                        oldInIteration = state.inIteration;
                        oldInSwitch = state.inSwitch;
                        oldInFunctionBody = state.inFunctionBody;
                        state.labelSet = {};
                        state.inIteration = false;
                        state.inSwitch = false;
                        state.inFunctionBody = true;
                        while (index < length) {
                            if (match('}')) {
                                break;
                            }
                            sourceElement = parseSourceElement();
                            if (typeof sourceElement === 'undefined') {
                                break;
                            }
                            sourceElements.push(sourceElement);
                        }
                        expect('}');
                        state.labelSet = oldLabelSet;
                        state.inIteration = oldInIteration;
                        state.inSwitch = oldInSwitch;
                        state.inFunctionBody = oldInFunctionBody;
                        return {
                            type: Syntax.BlockStatement,
                            body: sourceElements
                        };
                    }
                    function parseFunctionDeclaration() {
                        var id, param, params = [], body, token, stricted, firstRestricted, message, previousStrict, paramSet;
                        expectKeyword('function');
                        token = lookahead();
                        id = parseVariableIdentifier();
                        if (strict) {
                            if (isRestrictedWord(token.value)) {
                                throwErrorTolerant(token, Messages.StrictFunctionName);
                            }
                        } else {
                            if (isRestrictedWord(token.value)) {
                                firstRestricted = token;
                                message = Messages.StrictFunctionName;
                            } else if (isStrictModeReservedWord(token.value)) {
                                firstRestricted = token;
                                message = Messages.StrictReservedWord;
                            }
                        }
                        expect('(');
                        if (!match(')')) {
                            paramSet = {};
                            while (index < length) {
                                token = lookahead();
                                param = parseVariableIdentifier();
                                if (strict) {
                                    if (isRestrictedWord(token.value)) {
                                        stricted = token;
                                        message = Messages.StrictParamName;
                                    }
                                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                                        stricted = token;
                                        message = Messages.StrictParamDupe;
                                    }
                                } else if (!firstRestricted) {
                                    if (isRestrictedWord(token.value)) {
                                        firstRestricted = token;
                                        message = Messages.StrictParamName;
                                    } else if (isStrictModeReservedWord(token.value)) {
                                        firstRestricted = token;
                                        message = Messages.StrictReservedWord;
                                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                                        firstRestricted = token;
                                        message = Messages.StrictParamDupe;
                                    }
                                }
                                params.push(param);
                                paramSet[param.name] = true;
                                if (match(')')) {
                                    break;
                                }
                                expect(',');
                            }
                        }
                        expect(')');
                        previousStrict = strict;
                        body = parseFunctionSourceElements();
                        if (strict && firstRestricted) {
                            throwError(firstRestricted, message);
                        }
                        if (strict && stricted) {
                            throwErrorTolerant(stricted, message);
                        }
                        strict = previousStrict;
                        return {
                            type: Syntax.FunctionDeclaration,
                            id: id,
                            params: params,
                            defaults: [],
                            body: body,
                            rest: null,
                            generator: false,
                            expression: false
                        };
                    }
                    function parseFunctionExpression() {
                        var token, id = null, stricted, firstRestricted, message, param, params = [], body, previousStrict, paramSet;
                        expectKeyword('function');
                        if (!match('(')) {
                            token = lookahead();
                            id = parseVariableIdentifier();
                            if (strict) {
                                if (isRestrictedWord(token.value)) {
                                    throwErrorTolerant(token, Messages.StrictFunctionName);
                                }
                            } else {
                                if (isRestrictedWord(token.value)) {
                                    firstRestricted = token;
                                    message = Messages.StrictFunctionName;
                                } else if (isStrictModeReservedWord(token.value)) {
                                    firstRestricted = token;
                                    message = Messages.StrictReservedWord;
                                }
                            }
                        }
                        expect('(');
                        if (!match(')')) {
                            paramSet = {};
                            while (index < length) {
                                token = lookahead();
                                param = parseVariableIdentifier();
                                if (strict) {
                                    if (isRestrictedWord(token.value)) {
                                        stricted = token;
                                        message = Messages.StrictParamName;
                                    }
                                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                                        stricted = token;
                                        message = Messages.StrictParamDupe;
                                    }
                                } else if (!firstRestricted) {
                                    if (isRestrictedWord(token.value)) {
                                        firstRestricted = token;
                                        message = Messages.StrictParamName;
                                    } else if (isStrictModeReservedWord(token.value)) {
                                        firstRestricted = token;
                                        message = Messages.StrictReservedWord;
                                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                                        firstRestricted = token;
                                        message = Messages.StrictParamDupe;
                                    }
                                }
                                params.push(param);
                                paramSet[param.name] = true;
                                if (match(')')) {
                                    break;
                                }
                                expect(',');
                            }
                        }
                        expect(')');
                        previousStrict = strict;
                        body = parseFunctionSourceElements();
                        if (strict && firstRestricted) {
                            throwError(firstRestricted, message);
                        }
                        if (strict && stricted) {
                            throwErrorTolerant(stricted, message);
                        }
                        strict = previousStrict;
                        return {
                            type: Syntax.FunctionExpression,
                            id: id,
                            params: params,
                            defaults: [],
                            body: body,
                            rest: null,
                            generator: false,
                            expression: false
                        };
                    }
                    // 14 Program
                    function parseSourceElement() {
                        var token = lookahead();
                        if (token.type === Token.Keyword) {
                            switch (token.value) {
                            case 'const':
                            case 'let':
                                return parseConstLetDeclaration(token.value);
                            case 'function':
                                return parseFunctionDeclaration();
                            default:
                                return parseStatement();
                            }
                        }
                        if (token.type !== Token.EOF) {
                            return parseStatement();
                        }
                    }
                    function parseSourceElements() {
                        var sourceElement, sourceElements = [], token, directive, firstRestricted;
                        while (index < length) {
                            token = lookahead();
                            if (token.type !== Token.StringLiteral) {
                                break;
                            }
                            sourceElement = parseSourceElement();
                            sourceElements.push(sourceElement);
                            if (sourceElement.expression.type !== Syntax.Literal) {
                                // this is not directive
                                break;
                            }
                            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
                            if (directive === 'use strict') {
                                strict = true;
                                if (firstRestricted) {
                                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                                }
                            } else {
                                if (!firstRestricted && token.octal) {
                                    firstRestricted = token;
                                }
                            }
                        }
                        while (index < length) {
                            sourceElement = parseSourceElement();
                            if (typeof sourceElement === 'undefined') {
                                break;
                            }
                            sourceElements.push(sourceElement);
                        }
                        return sourceElements;
                    }
                    function parseProgram() {
                        var program;
                        strict = false;
                        program = {
                            type: Syntax.Program,
                            body: parseSourceElements()
                        };
                        return program;
                    }
                    // The following functions are needed only when the option to preserve
                    // the comments is active.
                    function addComment(type, value, start, end, loc) {
                        assert(typeof start === 'number', 'Comment must have valid position');
                        // Because the way the actual token is scanned, often the comments
                        // (if any) are skipped twice during the lexical analysis.
                        // Thus, we need to skip adding a comment if the comment array already
                        // handled it.
                        if (extra.comments.length > 0) {
                            if (extra.comments[extra.comments.length - 1].range[1] > start) {
                                return;
                            }
                        }
                        extra.comments.push({
                            type: type,
                            value: value,
                            range: [
                                start,
                                end
                            ],
                            loc: loc
                        });
                    }
                    function scanComment() {
                        var comment, ch, loc, start, blockComment, lineComment;
                        comment = '';
                        blockComment = false;
                        lineComment = false;
                        while (index < length) {
                            ch = source[index];
                            if (lineComment) {
                                ch = source[index++];
                                if (isLineTerminator(ch)) {
                                    loc.end = {
                                        line: lineNumber,
                                        column: index - lineStart - 1
                                    };
                                    lineComment = false;
                                    addComment('Line', comment, start, index - 1, loc);
                                    if (ch === '\r' && source[index] === '\n') {
                                        ++index;
                                    }
                                    ++lineNumber;
                                    lineStart = index;
                                    comment = '';
                                } else if (index >= length) {
                                    lineComment = false;
                                    comment += ch;
                                    loc.end = {
                                        line: lineNumber,
                                        column: length - lineStart
                                    };
                                    addComment('Line', comment, start, length, loc);
                                } else {
                                    comment += ch;
                                }
                            } else if (blockComment) {
                                if (isLineTerminator(ch)) {
                                    if (ch === '\r' && source[index + 1] === '\n') {
                                        ++index;
                                        comment += '\r\n';
                                    } else {
                                        comment += ch;
                                    }
                                    ++lineNumber;
                                    ++index;
                                    lineStart = index;
                                    if (index >= length) {
                                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                                    }
                                } else {
                                    ch = source[index++];
                                    if (index >= length) {
                                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                                    }
                                    comment += ch;
                                    if (ch === '*') {
                                        ch = source[index];
                                        if (ch === '/') {
                                            comment = comment.substr(0, comment.length - 1);
                                            blockComment = false;
                                            ++index;
                                            loc.end = {
                                                line: lineNumber,
                                                column: index - lineStart
                                            };
                                            addComment('Block', comment, start, index, loc);
                                            comment = '';
                                        }
                                    }
                                }
                            } else if (ch === '/') {
                                ch = source[index + 1];
                                if (ch === '/') {
                                    loc = {
                                        start: {
                                            line: lineNumber,
                                            column: index - lineStart
                                        }
                                    };
                                    start = index;
                                    index += 2;
                                    lineComment = true;
                                    if (index >= length) {
                                        loc.end = {
                                            line: lineNumber,
                                            column: index - lineStart
                                        };
                                        lineComment = false;
                                        addComment('Line', comment, start, index, loc);
                                    }
                                } else if (ch === '*') {
                                    start = index;
                                    index += 2;
                                    blockComment = true;
                                    loc = {
                                        start: {
                                            line: lineNumber,
                                            column: index - lineStart - 2
                                        }
                                    };
                                    if (index >= length) {
                                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                                    }
                                } else {
                                    break;
                                }
                            } else if (isWhiteSpace(ch)) {
                                ++index;
                            } else if (isLineTerminator(ch)) {
                                ++index;
                                if (ch === '\r' && source[index] === '\n') {
                                    ++index;
                                }
                                ++lineNumber;
                                lineStart = index;
                            } else {
                                break;
                            }
                        }
                    }
                    function filterCommentLocation() {
                        var i, entry, comment, comments = [];
                        for (i = 0; i < extra.comments.length; ++i) {
                            entry = extra.comments[i];
                            comment = {
                                type: entry.type,
                                value: entry.value
                            };
                            if (extra.range) {
                                comment.range = entry.range;
                            }
                            if (extra.loc) {
                                comment.loc = entry.loc;
                            }
                            comments.push(comment);
                        }
                        extra.comments = comments;
                    }
                    function collectToken() {
                        var start, loc, token, range, value;
                        skipComment();
                        start = index;
                        loc = {
                            start: {
                                line: lineNumber,
                                column: index - lineStart
                            }
                        };
                        token = extra.advance();
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        if (token.type !== Token.EOF) {
                            range = [
                                token.range[0],
                                token.range[1]
                            ];
                            value = sliceSource(token.range[0], token.range[1]);
                            extra.tokens.push({
                                type: TokenName[token.type],
                                value: value,
                                range: range,
                                loc: loc
                            });
                        }
                        return token;
                    }
                    function collectRegex() {
                        var pos, loc, regex, token;
                        skipComment();
                        pos = index;
                        loc = {
                            start: {
                                line: lineNumber,
                                column: index - lineStart
                            }
                        };
                        regex = extra.scanRegExp();
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        // Pop the previous token, which is likely '/' or '/='
                        if (extra.tokens.length > 0) {
                            token = extra.tokens[extra.tokens.length - 1];
                            if (token.range[0] === pos && token.type === 'Punctuator') {
                                if (token.value === '/' || token.value === '/=') {
                                    extra.tokens.pop();
                                }
                            }
                        }
                        extra.tokens.push({
                            type: 'RegularExpression',
                            value: regex.literal,
                            range: [
                                pos,
                                index
                            ],
                            loc: loc
                        });
                        return regex;
                    }
                    function filterTokenLocation() {
                        var i, entry, token, tokens = [];
                        for (i = 0; i < extra.tokens.length; ++i) {
                            entry = extra.tokens[i];
                            token = {
                                type: entry.type,
                                value: entry.value
                            };
                            if (extra.range) {
                                token.range = entry.range;
                            }
                            if (extra.loc) {
                                token.loc = entry.loc;
                            }
                            tokens.push(token);
                        }
                        extra.tokens = tokens;
                    }
                    function createLiteral(token) {
                        return {
                            type: Syntax.Literal,
                            value: token.value
                        };
                    }
                    function createRawLiteral(token) {
                        return {
                            type: Syntax.Literal,
                            value: token.value,
                            raw: sliceSource(token.range[0], token.range[1])
                        };
                    }
                    function createLocationMarker() {
                        var marker = {};
                        marker.range = [
                            index,
                            index
                        ];
                        marker.loc = {
                            start: {
                                line: lineNumber,
                                column: index - lineStart
                            },
                            end: {
                                line: lineNumber,
                                column: index - lineStart
                            }
                        };
                        marker.end = function () {
                            this.range[1] = index;
                            this.loc.end.line = lineNumber;
                            this.loc.end.column = index - lineStart;
                        };
                        marker.applyGroup = function (node) {
                            if (extra.range) {
                                node.groupRange = [
                                    this.range[0],
                                    this.range[1]
                                ];
                            }
                            if (extra.loc) {
                                node.groupLoc = {
                                    start: {
                                        line: this.loc.start.line,
                                        column: this.loc.start.column
                                    },
                                    end: {
                                        line: this.loc.end.line,
                                        column: this.loc.end.column
                                    }
                                };
                            }
                        };
                        marker.apply = function (node) {
                            if (extra.range) {
                                node.range = [
                                    this.range[0],
                                    this.range[1]
                                ];
                            }
                            if (extra.loc) {
                                node.loc = {
                                    start: {
                                        line: this.loc.start.line,
                                        column: this.loc.start.column
                                    },
                                    end: {
                                        line: this.loc.end.line,
                                        column: this.loc.end.column
                                    }
                                };
                            }
                        };
                        return marker;
                    }
                    function trackGroupExpression() {
                        var marker, expr;
                        skipComment();
                        marker = createLocationMarker();
                        expect('(');
                        expr = parseExpression();
                        expect(')');
                        marker.end();
                        marker.applyGroup(expr);
                        return expr;
                    }
                    function trackLeftHandSideExpression() {
                        var marker, expr;
                        skipComment();
                        marker = createLocationMarker();
                        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
                        while (match('.') || match('[')) {
                            if (match('[')) {
                                expr = {
                                    type: Syntax.MemberExpression,
                                    computed: true,
                                    object: expr,
                                    property: parseComputedMember()
                                };
                                marker.end();
                                marker.apply(expr);
                            } else {
                                expr = {
                                    type: Syntax.MemberExpression,
                                    computed: false,
                                    object: expr,
                                    property: parseNonComputedMember()
                                };
                                marker.end();
                                marker.apply(expr);
                            }
                        }
                        return expr;
                    }
                    function trackLeftHandSideExpressionAllowCall() {
                        var marker, expr;
                        skipComment();
                        marker = createLocationMarker();
                        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
                        while (match('.') || match('[') || match('(')) {
                            if (match('(')) {
                                expr = {
                                    type: Syntax.CallExpression,
                                    callee: expr,
                                    'arguments': parseArguments()
                                };
                                marker.end();
                                marker.apply(expr);
                            } else if (match('[')) {
                                expr = {
                                    type: Syntax.MemberExpression,
                                    computed: true,
                                    object: expr,
                                    property: parseComputedMember()
                                };
                                marker.end();
                                marker.apply(expr);
                            } else {
                                expr = {
                                    type: Syntax.MemberExpression,
                                    computed: false,
                                    object: expr,
                                    property: parseNonComputedMember()
                                };
                                marker.end();
                                marker.apply(expr);
                            }
                        }
                        return expr;
                    }
                    function filterGroup(node) {
                        var n, i, entry;
                        n = Object.prototype.toString.apply(node) === '[object Array]' ? [] : {};
                        for (i in node) {
                            if (node.hasOwnProperty(i) && i !== 'groupRange' && i !== 'groupLoc') {
                                entry = node[i];
                                if (entry === null || typeof entry !== 'object' || entry instanceof RegExp) {
                                    n[i] = entry;
                                } else {
                                    n[i] = filterGroup(entry);
                                }
                            }
                        }
                        return n;
                    }
                    function wrapTrackingFunction(range, loc) {
                        return function (parseFunction) {
                            function isBinary(node) {
                                return node.type === Syntax.LogicalExpression || node.type === Syntax.BinaryExpression;
                            }
                            function visit(node) {
                                var start, end;
                                if (isBinary(node.left)) {
                                    visit(node.left);
                                }
                                if (isBinary(node.right)) {
                                    visit(node.right);
                                }
                                if (range) {
                                    if (node.left.groupRange || node.right.groupRange) {
                                        start = node.left.groupRange ? node.left.groupRange[0] : node.left.range[0];
                                        end = node.right.groupRange ? node.right.groupRange[1] : node.right.range[1];
                                        node.range = [
                                            start,
                                            end
                                        ];
                                    } else if (typeof node.range === 'undefined') {
                                        start = node.left.range[0];
                                        end = node.right.range[1];
                                        node.range = [
                                            start,
                                            end
                                        ];
                                    }
                                }
                                if (loc) {
                                    if (node.left.groupLoc || node.right.groupLoc) {
                                        start = node.left.groupLoc ? node.left.groupLoc.start : node.left.loc.start;
                                        end = node.right.groupLoc ? node.right.groupLoc.end : node.right.loc.end;
                                        node.loc = {
                                            start: start,
                                            end: end
                                        };
                                    } else if (typeof node.loc === 'undefined') {
                                        node.loc = {
                                            start: node.left.loc.start,
                                            end: node.right.loc.end
                                        };
                                    }
                                }
                            }
                            return function () {
                                var marker, node;
                                skipComment();
                                marker = createLocationMarker();
                                node = parseFunction.apply(null, arguments);
                                marker.end();
                                if (range && typeof node.range === 'undefined') {
                                    marker.apply(node);
                                }
                                if (loc && typeof node.loc === 'undefined') {
                                    marker.apply(node);
                                }
                                if (isBinary(node)) {
                                    visit(node);
                                }
                                return node;
                            };
                        };
                    }
                    function patch() {
                        var wrapTracking;
                        if (extra.comments) {
                            extra.skipComment = skipComment;
                            skipComment = scanComment;
                        }
                        if (extra.raw) {
                            extra.createLiteral = createLiteral;
                            createLiteral = createRawLiteral;
                        }
                        if (extra.range || extra.loc) {
                            extra.parseGroupExpression = parseGroupExpression;
                            extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
                            extra.parseLeftHandSideExpressionAllowCall = parseLeftHandSideExpressionAllowCall;
                            parseGroupExpression = trackGroupExpression;
                            parseLeftHandSideExpression = trackLeftHandSideExpression;
                            parseLeftHandSideExpressionAllowCall = trackLeftHandSideExpressionAllowCall;
                            wrapTracking = wrapTrackingFunction(extra.range, extra.loc);
                            extra.parseAdditiveExpression = parseAdditiveExpression;
                            extra.parseAssignmentExpression = parseAssignmentExpression;
                            extra.parseBitwiseANDExpression = parseBitwiseANDExpression;
                            extra.parseBitwiseORExpression = parseBitwiseORExpression;
                            extra.parseBitwiseXORExpression = parseBitwiseXORExpression;
                            extra.parseBlock = parseBlock;
                            extra.parseFunctionSourceElements = parseFunctionSourceElements;
                            extra.parseCatchClause = parseCatchClause;
                            extra.parseComputedMember = parseComputedMember;
                            extra.parseConditionalExpression = parseConditionalExpression;
                            extra.parseConstLetDeclaration = parseConstLetDeclaration;
                            extra.parseEqualityExpression = parseEqualityExpression;
                            extra.parseExpression = parseExpression;
                            extra.parseForVariableDeclaration = parseForVariableDeclaration;
                            extra.parseFunctionDeclaration = parseFunctionDeclaration;
                            extra.parseFunctionExpression = parseFunctionExpression;
                            extra.parseLogicalANDExpression = parseLogicalANDExpression;
                            extra.parseLogicalORExpression = parseLogicalORExpression;
                            extra.parseMultiplicativeExpression = parseMultiplicativeExpression;
                            extra.parseNewExpression = parseNewExpression;
                            extra.parseNonComputedProperty = parseNonComputedProperty;
                            extra.parseObjectProperty = parseObjectProperty;
                            extra.parseObjectPropertyKey = parseObjectPropertyKey;
                            extra.parsePostfixExpression = parsePostfixExpression;
                            extra.parsePrimaryExpression = parsePrimaryExpression;
                            extra.parseProgram = parseProgram;
                            extra.parsePropertyFunction = parsePropertyFunction;
                            extra.parseRelationalExpression = parseRelationalExpression;
                            extra.parseStatement = parseStatement;
                            extra.parseShiftExpression = parseShiftExpression;
                            extra.parseSwitchCase = parseSwitchCase;
                            extra.parseUnaryExpression = parseUnaryExpression;
                            extra.parseVariableDeclaration = parseVariableDeclaration;
                            extra.parseVariableIdentifier = parseVariableIdentifier;
                            parseAdditiveExpression = wrapTracking(extra.parseAdditiveExpression);
                            parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
                            parseBitwiseANDExpression = wrapTracking(extra.parseBitwiseANDExpression);
                            parseBitwiseORExpression = wrapTracking(extra.parseBitwiseORExpression);
                            parseBitwiseXORExpression = wrapTracking(extra.parseBitwiseXORExpression);
                            parseBlock = wrapTracking(extra.parseBlock);
                            parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
                            parseCatchClause = wrapTracking(extra.parseCatchClause);
                            parseComputedMember = wrapTracking(extra.parseComputedMember);
                            parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
                            parseConstLetDeclaration = wrapTracking(extra.parseConstLetDeclaration);
                            parseEqualityExpression = wrapTracking(extra.parseEqualityExpression);
                            parseExpression = wrapTracking(extra.parseExpression);
                            parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
                            parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
                            parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
                            parseLeftHandSideExpression = wrapTracking(parseLeftHandSideExpression);
                            parseLogicalANDExpression = wrapTracking(extra.parseLogicalANDExpression);
                            parseLogicalORExpression = wrapTracking(extra.parseLogicalORExpression);
                            parseMultiplicativeExpression = wrapTracking(extra.parseMultiplicativeExpression);
                            parseNewExpression = wrapTracking(extra.parseNewExpression);
                            parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
                            parseObjectProperty = wrapTracking(extra.parseObjectProperty);
                            parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
                            parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
                            parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
                            parseProgram = wrapTracking(extra.parseProgram);
                            parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
                            parseRelationalExpression = wrapTracking(extra.parseRelationalExpression);
                            parseStatement = wrapTracking(extra.parseStatement);
                            parseShiftExpression = wrapTracking(extra.parseShiftExpression);
                            parseSwitchCase = wrapTracking(extra.parseSwitchCase);
                            parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
                            parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
                            parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);
                        }
                        if (typeof extra.tokens !== 'undefined') {
                            extra.advance = advance;
                            extra.scanRegExp = scanRegExp;
                            advance = collectToken;
                            scanRegExp = collectRegex;
                        }
                    }
                    function unpatch() {
                        if (typeof extra.skipComment === 'function') {
                            skipComment = extra.skipComment;
                        }
                        if (extra.raw) {
                            createLiteral = extra.createLiteral;
                        }
                        if (extra.range || extra.loc) {
                            parseAdditiveExpression = extra.parseAdditiveExpression;
                            parseAssignmentExpression = extra.parseAssignmentExpression;
                            parseBitwiseANDExpression = extra.parseBitwiseANDExpression;
                            parseBitwiseORExpression = extra.parseBitwiseORExpression;
                            parseBitwiseXORExpression = extra.parseBitwiseXORExpression;
                            parseBlock = extra.parseBlock;
                            parseFunctionSourceElements = extra.parseFunctionSourceElements;
                            parseCatchClause = extra.parseCatchClause;
                            parseComputedMember = extra.parseComputedMember;
                            parseConditionalExpression = extra.parseConditionalExpression;
                            parseConstLetDeclaration = extra.parseConstLetDeclaration;
                            parseEqualityExpression = extra.parseEqualityExpression;
                            parseExpression = extra.parseExpression;
                            parseForVariableDeclaration = extra.parseForVariableDeclaration;
                            parseFunctionDeclaration = extra.parseFunctionDeclaration;
                            parseFunctionExpression = extra.parseFunctionExpression;
                            parseGroupExpression = extra.parseGroupExpression;
                            parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
                            parseLeftHandSideExpressionAllowCall = extra.parseLeftHandSideExpressionAllowCall;
                            parseLogicalANDExpression = extra.parseLogicalANDExpression;
                            parseLogicalORExpression = extra.parseLogicalORExpression;
                            parseMultiplicativeExpression = extra.parseMultiplicativeExpression;
                            parseNewExpression = extra.parseNewExpression;
                            parseNonComputedProperty = extra.parseNonComputedProperty;
                            parseObjectProperty = extra.parseObjectProperty;
                            parseObjectPropertyKey = extra.parseObjectPropertyKey;
                            parsePrimaryExpression = extra.parsePrimaryExpression;
                            parsePostfixExpression = extra.parsePostfixExpression;
                            parseProgram = extra.parseProgram;
                            parsePropertyFunction = extra.parsePropertyFunction;
                            parseRelationalExpression = extra.parseRelationalExpression;
                            parseStatement = extra.parseStatement;
                            parseShiftExpression = extra.parseShiftExpression;
                            parseSwitchCase = extra.parseSwitchCase;
                            parseUnaryExpression = extra.parseUnaryExpression;
                            parseVariableDeclaration = extra.parseVariableDeclaration;
                            parseVariableIdentifier = extra.parseVariableIdentifier;
                        }
                        if (typeof extra.scanRegExp === 'function') {
                            advance = extra.advance;
                            scanRegExp = extra.scanRegExp;
                        }
                    }
                    function stringToArray(str) {
                        var length = str.length, result = [], i;
                        for (i = 0; i < length; ++i) {
                            result[i] = str.charAt(i);
                        }
                        return result;
                    }
                    function parse(code, options) {
                        var program, toString;
                        toString = String;
                        if (typeof code !== 'string' && !(code instanceof String)) {
                            code = toString(code);
                        }
                        source = code;
                        index = 0;
                        lineNumber = source.length > 0 ? 1 : 0;
                        lineStart = 0;
                        length = source.length;
                        buffer = null;
                        state = {
                            allowIn: true,
                            labelSet: {},
                            inFunctionBody: false,
                            inIteration: false,
                            inSwitch: false
                        };
                        extra = {};
                        if (typeof options !== 'undefined') {
                            extra.range = typeof options.range === 'boolean' && options.range;
                            extra.loc = typeof options.loc === 'boolean' && options.loc;
                            extra.raw = typeof options.raw === 'boolean' && options.raw;
                            if (typeof options.tokens === 'boolean' && options.tokens) {
                                extra.tokens = [];
                            }
                            if (typeof options.comment === 'boolean' && options.comment) {
                                extra.comments = [];
                            }
                            if (typeof options.tolerant === 'boolean' && options.tolerant) {
                                extra.errors = [];
                            }
                        }
                        if (length > 0) {
                            if (typeof source[0] === 'undefined') {
                                // Try first to convert to a string. This is good as fast path
                                // for old IE which understands string indexing for string
                                // literals only and not for string object.
                                if (code instanceof String) {
                                    source = code.valueOf();
                                }
                                // Force accessing the characters via an array.
                                if (typeof source[0] === 'undefined') {
                                    source = stringToArray(code);
                                }
                            }
                        }
                        patch();
                        try {
                            program = parseProgram();
                            if (typeof extra.comments !== 'undefined') {
                                filterCommentLocation();
                                program.comments = extra.comments;
                            }
                            if (typeof extra.tokens !== 'undefined') {
                                filterTokenLocation();
                                program.tokens = extra.tokens;
                            }
                            if (typeof extra.errors !== 'undefined') {
                                program.errors = extra.errors;
                            }
                            if (extra.range || extra.loc) {
                                program.body = filterGroup(program.body);
                            }
                        } catch (e) {
                            throw e;
                        } finally {
                            unpatch();
                            extra = {};
                        }
                        return program;
                    }
                    // Sync with package.json.
                    exports.version = '1.0.2';
                    exports.parse = parse;
                    // Deep copy.
                    exports.Syntax = function () {
                        var name, types = {};
                        if (typeof Object.create === 'function') {
                            types = Object.create(null);
                        }
                        for (name in Syntax) {
                            if (Syntax.hasOwnProperty(name)) {
                                types[name] = Syntax[name];
                            }
                        }
                        if (typeof Object.freeze === 'function') {
                            Object.freeze(types);
                        }
                        return types;
                    }();
                }));    /* vim: set sw=4 ts=4 et tw=80 : */
            }());
        },
        {}
    ],
    6: [
        function (require, module, exports) {
            module.exports = {
                'name': 'escodegen',
                'description': 'ECMAScript code generator',
                'homepage': 'http://github.com/Constellation/escodegen.html',
                'main': 'escodegen.js',
                'bin': {
                    'esgenerate': './bin/esgenerate.js',
                    'escodegen': './bin/escodegen.js'
                },
                'version': '0.0.19',
                'engines': { 'node': '>=0.4.0' },
                'maintainers': [{
                        'name': 'Yusuke Suzuki',
                        'email': 'utatane.tea@gmail.com',
                        'url': 'http://github.com/Constellation'
                    }],
                'repository': {
                    'type': 'git',
                    'url': 'http://github.com/Constellation/escodegen.git'
                },
                'dependencies': {
                    'esprima': '~1.0.2',
                    'estraverse': '~0.0.4',
                    'source-map': '>= 0.1.2'
                },
                'optionalDependencies': { 'source-map': '>= 0.1.2' },
                'devDependencies': {
                    'esprima-moz': '*',
                    'browserify': '*',
                    'q': '*',
                    'bower': '*',
                    'semver': '*'
                },
                'licenses': [{
                        'type': 'BSD',
                        'url': 'http://github.com/Constellation/escodegen/raw/master/LICENSE.BSD'
                    }],
                'scripts': {
                    'test': 'node test/run.js',
                    'release': 'node tools/release.js',
                    'build': '(echo \'// Generated by browserify\'; ./node_modules/.bin/browserify -i source-map tools/entry-point.js) > escodegen.browser.js'
                },
                'readme': 'Escodegen ([escodegen](http://github.com/Constellation/escodegen)) is\n[ECMAScript](http://www.ecma-international.org/publications/standards/Ecma-262.htm)\n(also popularly known as [JavaScript](http://en.wikipedia.org/wiki/JavaScript>JavaScript))\ncode generator from [Parser API](https://developer.mozilla.org/en/SpiderMonkey/Parser_API) AST.\nSee [online generator demo](http://constellation.github.com/escodegen/demo/index.html).\n\n\n### Install\n\nEscodegen can be used in a web browser:\n\n    <script src="escodegen.browser.js"></script>\n\nor in a Node.js application via the package manager:\n\n    npm install escodegen\n\n\n### Usage\n\nA simple example: the program\n\n    escodegen.generate({\n        type: \'BinaryExpression\',\n        operator: \'+\',\n        left: { type: \'Literal\', value: 40 },\n        right: { type: \'Literal\', value: 2 }\n    });\n\nproduces the string `\'40 + 2\'`\n\nSee the [API page](https://github.com/Constellation/escodegen/wiki/API) for\noptions. To run the tests, execute `npm test` in the root directory.\n\n\n### License\n\n#### Escodegen\n\nCopyright (C) 2012 [Yusuke Suzuki](http://github.com/Constellation)\n (twitter: [@Constellation](http://twitter.com/Constellation)) and other contributors.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\n  * Redistributions of source code must retain the above copyright\n    notice, this list of conditions and the following disclaimer.\n\n  * Redistributions in binary form must reproduce the above copyright\n    notice, this list of conditions and the following disclaimer in the\n    documentation and/or other materials provided with the distribution.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"\nAND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\nIMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE\nARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY\nDIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\nLOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\nON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\nTHIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n\n#### source-map\n\nSourceNodeMocks has a limited interface of mozilla/source-map SourceNode implementations.\n\nCopyright (c) 2009-2011, Mozilla Foundation and contributors\nAll rights reserved.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\n* Redistributions of source code must retain the above copyright notice, this\n  list of conditions and the following disclaimer.\n\n* Redistributions in binary form must reproduce the above copyright notice,\n  this list of conditions and the following disclaimer in the documentation\n  and/or other materials provided with the distribution.\n\n* Neither the names of the Mozilla Foundation nor the names of project\n  contributors may be used to endorse or promote products derived from this\n  software without specific prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND\nANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\nWARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\nDISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE\nFOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\nDAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\nSERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\nCAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\nOR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n\n\n### Status\n\n[![Build Status](https://secure.travis-ci.org/Constellation/escodegen.png)](http://travis-ci.org/Constellation/escodegen)\n',
                'readmeFilename': 'README.md',
                '_id': 'escodegen@0.0.19',
                '_from': 'escodegen@*'
            };
        },
        {}
    ],
    5: [
        function (require, module, exports) {
            (function (global) {
                /*
                  Copyright (C) 2012 Michael Ficarra <escodegen.copyright@michael.ficarra.me>
                  Copyright (C) 2012 Robert Gust-Bardon <donate@robert.gust-bardon.org>
                  Copyright (C) 2012 John Freeman <jfreeman08@gmail.com>
                  Copyright (C) 2011-2012 Ariya Hidayat <ariya.hidayat@gmail.com>
                  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
                  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
                  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
                  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
                  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
                
                  Redistribution and use in source and binary forms, with or without
                  modification, are permitted provided that the following conditions are met:
                
                    * Redistributions of source code must retain the above copyright
                      notice, this list of conditions and the following disclaimer.
                    * Redistributions in binary form must reproduce the above copyright
                      notice, this list of conditions and the following disclaimer in the
                      documentation and/or other materials provided with the distribution.
                
                  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
                  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
                  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
                  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
                  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
                  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
                  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
                  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
                  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
                  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
                */
                /*jslint bitwise:true */
                /*global escodegen:true, exports:true, generateStatement:true, generateExpression:true, generateFunctionBody:true, process:true, require:true, define:true, global:true*/
                (function () {
                    'use strict';
                    var Syntax, Precedence, BinaryPrecedence, Regex, VisitorKeys, VisitorOption, SourceNode, isArray, base, indent, json, renumber, hexadecimal, quotes, escapeless, newline, space, parentheses, semicolons, safeConcatenation, directive, extra, parse, sourceMap, traverse;
                    traverse = require('estraverse').traverse;
                    Syntax = {
                        AssignmentExpression: 'AssignmentExpression',
                        ArrayExpression: 'ArrayExpression',
                        ArrayPattern: 'ArrayPattern',
                        BlockStatement: 'BlockStatement',
                        BinaryExpression: 'BinaryExpression',
                        BreakStatement: 'BreakStatement',
                        CallExpression: 'CallExpression',
                        CatchClause: 'CatchClause',
                        ComprehensionBlock: 'ComprehensionBlock',
                        ComprehensionExpression: 'ComprehensionExpression',
                        ConditionalExpression: 'ConditionalExpression',
                        ContinueStatement: 'ContinueStatement',
                        DirectiveStatement: 'DirectiveStatement',
                        DoWhileStatement: 'DoWhileStatement',
                        DebuggerStatement: 'DebuggerStatement',
                        EmptyStatement: 'EmptyStatement',
                        ExpressionStatement: 'ExpressionStatement',
                        ForStatement: 'ForStatement',
                        ForInStatement: 'ForInStatement',
                        FunctionDeclaration: 'FunctionDeclaration',
                        FunctionExpression: 'FunctionExpression',
                        Identifier: 'Identifier',
                        IfStatement: 'IfStatement',
                        Literal: 'Literal',
                        LabeledStatement: 'LabeledStatement',
                        LogicalExpression: 'LogicalExpression',
                        MemberExpression: 'MemberExpression',
                        NewExpression: 'NewExpression',
                        ObjectExpression: 'ObjectExpression',
                        ObjectPattern: 'ObjectPattern',
                        Program: 'Program',
                        Property: 'Property',
                        ReturnStatement: 'ReturnStatement',
                        SequenceExpression: 'SequenceExpression',
                        SwitchStatement: 'SwitchStatement',
                        SwitchCase: 'SwitchCase',
                        ThisExpression: 'ThisExpression',
                        ThrowStatement: 'ThrowStatement',
                        TryStatement: 'TryStatement',
                        UnaryExpression: 'UnaryExpression',
                        UpdateExpression: 'UpdateExpression',
                        VariableDeclaration: 'VariableDeclaration',
                        VariableDeclarator: 'VariableDeclarator',
                        WhileStatement: 'WhileStatement',
                        WithStatement: 'WithStatement',
                        YieldExpression: 'YieldExpression'
                    };
                    Precedence = {
                        Sequence: 0,
                        Assignment: 1,
                        Conditional: 2,
                        LogicalOR: 3,
                        LogicalAND: 4,
                        BitwiseOR: 5,
                        BitwiseXOR: 6,
                        BitwiseAND: 7,
                        Equality: 8,
                        Relational: 9,
                        BitwiseSHIFT: 10,
                        Additive: 11,
                        Multiplicative: 12,
                        Unary: 13,
                        Postfix: 14,
                        Call: 15,
                        New: 16,
                        Member: 17,
                        Primary: 18
                    };
                    BinaryPrecedence = {
                        '||': Precedence.LogicalOR,
                        '&&': Precedence.LogicalAND,
                        '|': Precedence.BitwiseOR,
                        '^': Precedence.BitwiseXOR,
                        '&': Precedence.BitwiseAND,
                        '==': Precedence.Equality,
                        '!=': Precedence.Equality,
                        '===': Precedence.Equality,
                        '!==': Precedence.Equality,
                        'is': Precedence.Equality,
                        'isnt': Precedence.Equality,
                        '<': Precedence.Relational,
                        '>': Precedence.Relational,
                        '<=': Precedence.Relational,
                        '>=': Precedence.Relational,
                        'in': Precedence.Relational,
                        'instanceof': Precedence.Relational,
                        '<<': Precedence.BitwiseSHIFT,
                        '>>': Precedence.BitwiseSHIFT,
                        '>>>': Precedence.BitwiseSHIFT,
                        '+': Precedence.Additive,
                        '-': Precedence.Additive,
                        '*': Precedence.Multiplicative,
                        '%': Precedence.Multiplicative,
                        '/': Precedence.Multiplicative
                    };
                    Regex = { NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]') };
                    function getDefaultOptions() {
                        // default options
                        return {
                            indent: null,
                            base: null,
                            parse: null,
                            comment: false,
                            format: {
                                indent: {
                                    style: '    ',
                                    base: 0,
                                    adjustMultilineComment: false
                                },
                                json: false,
                                renumber: false,
                                hexadecimal: false,
                                quotes: 'single',
                                escapeless: false,
                                compact: false,
                                parentheses: true,
                                semicolons: true,
                                safeConcatenation: false
                            },
                            moz: {
                                starlessGenerator: false,
                                parenthesizedComprehensionBlock: false
                            },
                            sourceMap: null,
                            sourceMapRoot: null,
                            sourceMapWithCode: false,
                            directive: false,
                            verbatim: null
                        };
                    }
                    function stringToArray(str) {
                        var length = str.length, result = [], i;
                        for (i = 0; i < length; i += 1) {
                            result[i] = str.charAt(i);
                        }
                        return result;
                    }
                    function stringRepeat(str, num) {
                        var result = '';
                        for (num |= 0; num > 0; num >>>= 1, str += str) {
                            if (num & 1) {
                                result += str;
                            }
                        }
                        return result;
                    }
                    isArray = Array.isArray;
                    if (!isArray) {
                        isArray = function isArray(array) {
                            return Object.prototype.toString.call(array) === '[object Array]';
                        };
                    }
                    // Fallback for the non SourceMap environment
                    function SourceNodeMock(line, column, filename, chunk) {
                        var result = [];
                        function flatten(input) {
                            var i, iz;
                            if (isArray(input)) {
                                for (i = 0, iz = input.length; i < iz; ++i) {
                                    flatten(input[i]);
                                }
                            } else if (input instanceof SourceNodeMock) {
                                result.push(input);
                            } else if (typeof input === 'string' && input) {
                                result.push(input);
                            }
                        }
                        flatten(chunk);
                        this.children = result;
                    }
                    SourceNodeMock.prototype.toString = function toString() {
                        var res = '', i, iz, node;
                        for (i = 0, iz = this.children.length; i < iz; ++i) {
                            node = this.children[i];
                            if (node instanceof SourceNodeMock) {
                                res += node.toString();
                            } else {
                                res += node;
                            }
                        }
                        return res;
                    };
                    SourceNodeMock.prototype.replaceRight = function replaceRight(pattern, replacement) {
                        var last = this.children[this.children.length - 1];
                        if (last instanceof SourceNodeMock) {
                            last.replaceRight(pattern, replacement);
                        } else if (typeof last === 'string') {
                            this.children[this.children.length - 1] = last.replace(pattern, replacement);
                        } else {
                            this.children.push(''.replace(pattern, replacement));
                        }
                        return this;
                    };
                    SourceNodeMock.prototype.join = function join(sep) {
                        var i, iz, result;
                        result = [];
                        iz = this.children.length;
                        if (iz > 0) {
                            for (i = 0, iz -= 1; i < iz; ++i) {
                                result.push(this.children[i], sep);
                            }
                            result.push(this.children[iz]);
                            this.children = result;
                        }
                        return this;
                    };
                    function hasLineTerminator(str) {
                        return /[\r\n]/g.test(str);
                    }
                    function endsWithLineTerminator(str) {
                        var ch = str.charAt(str.length - 1);
                        return ch === '\r' || ch === '\n';
                    }
                    function shallowCopy(obj) {
                        var ret = {}, key;
                        for (key in obj) {
                            if (obj.hasOwnProperty(key)) {
                                ret[key] = obj[key];
                            }
                        }
                        return ret;
                    }
                    function deepCopy(obj) {
                        var ret = {}, key, val;
                        for (key in obj) {
                            if (obj.hasOwnProperty(key)) {
                                val = obj[key];
                                if (typeof val === 'object' && val !== null) {
                                    ret[key] = deepCopy(val);
                                } else {
                                    ret[key] = val;
                                }
                            }
                        }
                        return ret;
                    }
                    function updateDeeply(target, override) {
                        var key, val;
                        function isHashObject(target) {
                            return typeof target === 'object' && target instanceof Object && !(target instanceof RegExp);
                        }
                        for (key in override) {
                            if (override.hasOwnProperty(key)) {
                                val = override[key];
                                if (isHashObject(val)) {
                                    if (isHashObject(target[key])) {
                                        updateDeeply(target[key], val);
                                    } else {
                                        target[key] = updateDeeply({}, val);
                                    }
                                } else {
                                    target[key] = val;
                                }
                            }
                        }
                        return target;
                    }
                    function generateNumber(value) {
                        var result, point, temp, exponent, pos;
                        if (value !== value) {
                            throw new Error('Numeric literal whose value is NaN');
                        }
                        if (value < 0 || value === 0 && 1 / value < 0) {
                            throw new Error('Numeric literal whose value is negative');
                        }
                        if (value === 1 / 0) {
                            return json ? 'null' : renumber ? '1e400' : '1e+400';
                        }
                        result = '' + value;
                        if (!renumber || result.length < 3) {
                            return result;
                        }
                        point = result.indexOf('.');
                        if (!json && result.charAt(0) === '0' && point === 1) {
                            point = 0;
                            result = result.slice(1);
                        }
                        temp = result;
                        result = result.replace('e+', 'e');
                        exponent = 0;
                        if ((pos = temp.indexOf('e')) > 0) {
                            exponent = +temp.slice(pos + 1);
                            temp = temp.slice(0, pos);
                        }
                        if (point >= 0) {
                            exponent -= temp.length - point - 1;
                            temp = +(temp.slice(0, point) + temp.slice(point + 1)) + '';
                        }
                        pos = 0;
                        while (temp.charAt(temp.length + pos - 1) === '0') {
                            pos -= 1;
                        }
                        if (pos !== 0) {
                            exponent -= pos;
                            temp = temp.slice(0, pos);
                        }
                        if (exponent !== 0) {
                            temp += 'e' + exponent;
                        }
                        if ((temp.length < result.length || hexadecimal && value > 1000000000000 && Math.floor(value) === value && (temp = '0x' + value.toString(16)).length < result.length) && +temp === value) {
                            result = temp;
                        }
                        return result;
                    }
                    function escapeAllowedCharacter(ch, next) {
                        var code = ch.charCodeAt(0), hex = code.toString(16), result = '\\';
                        switch (ch) {
                        case '\b':
                            result += 'b';
                            break;
                        case '\f':
                            result += 'f';
                            break;
                        case '\t':
                            result += 't';
                            break;
                        default:
                            if (json || code > 255) {
                                result += 'u' + '0000'.slice(hex.length) + hex;
                            } else if (ch === '\0' && '0123456789'.indexOf(next) < 0) {
                                result += '0';
                            } else if (ch === '\v') {
                                result += 'v';
                            } else {
                                result += 'x' + '00'.slice(hex.length) + hex;
                            }
                            break;
                        }
                        return result;
                    }
                    function escapeDisallowedCharacter(ch) {
                        var result = '\\';
                        switch (ch) {
                        case '\\':
                            result += '\\';
                            break;
                        case '\n':
                            result += 'n';
                            break;
                        case '\r':
                            result += 'r';
                            break;
                        case '\u2028':
                            result += 'u2028';
                            break;
                        case '\u2029':
                            result += 'u2029';
                            break;
                        default:
                            throw new Error('Incorrectly classified character');
                        }
                        return result;
                    }
                    function escapeDirective(str) {
                        var i, iz, ch, single, buf, quote;
                        buf = str;
                        if (typeof buf[0] === 'undefined') {
                            buf = stringToArray(buf);
                        }
                        quote = quotes === 'double' ? '"' : '\'';
                        for (i = 0, iz = buf.length; i < iz; i += 1) {
                            ch = buf[i];
                            if (ch === '\'') {
                                quote = '"';
                                break;
                            } else if (ch === '"') {
                                quote = '\'';
                                break;
                            } else if (ch === '\\') {
                                i += 1;
                            }
                        }
                        return quote + str + quote;
                    }
                    function escapeString(str) {
                        var result = '', i, len, ch, next, singleQuotes = 0, doubleQuotes = 0, single;
                        if (typeof str[0] === 'undefined') {
                            str = stringToArray(str);
                        }
                        for (i = 0, len = str.length; i < len; i += 1) {
                            ch = str[i];
                            if (ch === '\'') {
                                singleQuotes += 1;
                            } else if (ch === '"') {
                                doubleQuotes += 1;
                            } else if (ch === '/' && json) {
                                result += '\\';
                            } else if ('\\\n\r\u2028\u2029'.indexOf(ch) >= 0) {
                                result += escapeDisallowedCharacter(ch);
                                continue;
                            } else if (json && ch < ' ' || !(json || escapeless || ch >= ' ' && ch <= '~')) {
                                result += escapeAllowedCharacter(ch, str[i + 1]);
                                continue;
                            }
                            result += ch;
                        }
                        single = !(quotes === 'double' || quotes === 'auto' && doubleQuotes < singleQuotes);
                        str = result;
                        result = single ? '\'' : '"';
                        if (typeof str[0] === 'undefined') {
                            str = stringToArray(str);
                        }
                        for (i = 0, len = str.length; i < len; i += 1) {
                            ch = str[i];
                            if (ch === '\'' && single || ch === '"' && !single) {
                                result += '\\';
                            }
                            result += ch;
                        }
                        return result + (single ? '\'' : '"');
                    }
                    function isWhiteSpace(ch) {
                        return '\t\v\f \xa0'.indexOf(ch) >= 0 || ch.charCodeAt(0) >= 5760 && '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\ufeff'.indexOf(ch) >= 0;
                    }
                    function isLineTerminator(ch) {
                        return '\n\r\u2028\u2029'.indexOf(ch) >= 0;
                    }
                    function isIdentifierPart(ch) {
                        return ch === '$' || ch === '_' || ch === '\\' || ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch >= '0' && ch <= '9' || ch.charCodeAt(0) >= 128 && Regex.NonAsciiIdentifierPart.test(ch);
                    }
                    function toSourceNode(generated, node) {
                        if (node == null) {
                            if (generated instanceof SourceNode) {
                                return generated;
                            } else {
                                node = {};
                            }
                        }
                        if (node.loc == null) {
                            return new SourceNode(null, null, sourceMap, generated);
                        }
                        return new SourceNode(node.loc.start.line, node.loc.start.column, sourceMap === true ? node.loc.source || null : sourceMap, generated);
                    }
                    function join(left, right) {
                        var leftSource = toSourceNode(left).toString(), rightSource = toSourceNode(right).toString(), leftChar = leftSource.charAt(leftSource.length - 1), rightChar = rightSource.charAt(0);
                        if ((leftChar === '+' || leftChar === '-') && leftChar === rightChar || isIdentifierPart(leftChar) && isIdentifierPart(rightChar)) {
                            return [
                                left,
                                ' ',
                                right
                            ];
                        } else if (isWhiteSpace(leftChar) || isLineTerminator(leftChar) || isWhiteSpace(rightChar) || isLineTerminator(rightChar)) {
                            return [
                                left,
                                right
                            ];
                        }
                        return [
                            left,
                            space,
                            right
                        ];
                    }
                    function addIndent(stmt) {
                        return [
                            base,
                            stmt
                        ];
                    }
                    function withIndent(fn) {
                        var previousBase, result;
                        previousBase = base;
                        base += indent;
                        result = fn.call(this, base);
                        base = previousBase;
                        return result;
                    }
                    function calculateSpaces(str) {
                        var i;
                        for (i = str.length - 1; i >= 0; i -= 1) {
                            if (isLineTerminator(str.charAt(i))) {
                                break;
                            }
                        }
                        return str.length - 1 - i;
                    }
                    function adjustMultilineComment(value, specialBase) {
                        var array, i, len, line, j, ch, spaces, previousBase;
                        array = value.split(/\r\n|[\r\n]/);
                        spaces = Number.MAX_VALUE;
                        // first line doesn't have indentation
                        for (i = 1, len = array.length; i < len; i += 1) {
                            line = array[i];
                            j = 0;
                            while (j < line.length && isWhiteSpace(line[j])) {
                                j += 1;
                            }
                            if (spaces > j) {
                                spaces = j;
                            }
                        }
                        if (typeof specialBase !== 'undefined') {
                            // pattern like
                            // {
                            //   var t = 20;  /*
                            //                 * this is comment
                            //                 */
                            // }
                            previousBase = base;
                            if (array[1][spaces] === '*') {
                                specialBase += ' ';
                            }
                            base = specialBase;
                        } else {
                            if (spaces & 1) {
                                // /*
                                //  *
                                //  */
                                // If spaces are odd number, above pattern is considered.
                                // We waste 1 space.
                                spaces -= 1;
                            }
                            previousBase = base;
                        }
                        for (i = 1, len = array.length; i < len; i += 1) {
                            array[i] = toSourceNode(addIndent(array[i].slice(spaces))).join('');
                        }
                        base = previousBase;
                        return array.join('\n');
                    }
                    function generateComment(comment, specialBase) {
                        if (comment.type === 'Line') {
                            if (endsWithLineTerminator(comment.value)) {
                                return '//' + comment.value;
                            } else {
                                // Always use LineTerminator
                                return '//' + comment.value + '\n';
                            }
                        }
                        if (extra.format.indent.adjustMultilineComment && /[\n\r]/.test(comment.value)) {
                            return adjustMultilineComment('/*' + comment.value + '*/', specialBase);
                        }
                        return '/*' + comment.value + '*/';
                    }
                    function addCommentsToStatement(stmt, result) {
                        var i, len, comment, save, node, tailingToStatement, specialBase, fragment;
                        if (stmt.leadingComments && stmt.leadingComments.length > 0) {
                            save = result;
                            comment = stmt.leadingComments[0];
                            result = [];
                            if (safeConcatenation && stmt.type === Syntax.Program && stmt.body.length === 0) {
                                result.push('\n');
                            }
                            result.push(generateComment(comment));
                            if (!endsWithLineTerminator(toSourceNode(result).toString())) {
                                result.push('\n');
                            }
                            for (i = 1, len = stmt.leadingComments.length; i < len; i += 1) {
                                comment = stmt.leadingComments[i];
                                fragment = [generateComment(comment)];
                                if (!endsWithLineTerminator(toSourceNode(fragment).toString())) {
                                    fragment.push('\n');
                                }
                                result.push(addIndent(fragment));
                            }
                            result.push(addIndent(save));
                        }
                        if (stmt.trailingComments) {
                            tailingToStatement = !endsWithLineTerminator(toSourceNode(result).toString());
                            specialBase = stringRepeat(' ', calculateSpaces(toSourceNode([
                                base,
                                result,
                                indent
                            ]).toString()));
                            for (i = 0, len = stmt.trailingComments.length; i < len; i += 1) {
                                comment = stmt.trailingComments[i];
                                if (tailingToStatement) {
                                    // We assume target like following script
                                    //
                                    // var t = 20;  /**
                                    //               * This is comment of t
                                    //               */
                                    if (i === 0) {
                                        // first case
                                        result = [
                                            result,
                                            indent
                                        ];
                                    } else {
                                        result = [
                                            result,
                                            specialBase
                                        ];
                                    }
                                    result.push(generateComment(comment, specialBase));
                                } else {
                                    result = [
                                        result,
                                        addIndent(generateComment(comment))
                                    ];
                                }
                                if (i !== len - 1 && !endsWithLineTerminator(toSourceNode(result).toString())) {
                                    result = [
                                        result,
                                        '\n'
                                    ];
                                }
                            }
                        }
                        return result;
                    }
                    function parenthesize(text, current, should) {
                        if (current < should) {
                            return [
                                '(',
                                text,
                                ')'
                            ];
                        }
                        return text;
                    }
                    function maybeBlock(stmt, semicolonOptional, functionBody) {
                        var result, noLeadingComment;
                        noLeadingComment = !extra.comment || !stmt.leadingComments;
                        if (stmt.type === Syntax.BlockStatement && noLeadingComment) {
                            return [
                                space,
                                generateStatement(stmt, { functionBody: functionBody })
                            ];
                        }
                        if (stmt.type === Syntax.EmptyStatement && noLeadingComment) {
                            return ';';
                        }
                        withIndent(function () {
                            result = [
                                newline,
                                addIndent(generateStatement(stmt, {
                                    semicolonOptional: semicolonOptional,
                                    functionBody: functionBody
                                }))
                            ];
                        });
                        return result;
                    }
                    function maybeBlockSuffix(stmt, result) {
                        var ends = endsWithLineTerminator(toSourceNode(result).toString());
                        if (stmt.type === Syntax.BlockStatement && (!extra.comment || !stmt.leadingComments) && !ends) {
                            return [
                                result,
                                space
                            ];
                        }
                        if (ends) {
                            return [
                                result,
                                base
                            ];
                        }
                        return [
                            result,
                            newline,
                            base
                        ];
                    }
                    function generateVerbatim(expr, option) {
                        var i, result;
                        result = expr[extra.verbatim].split(/\r\n|\n/);
                        for (i = 1; i < result.length; i++) {
                            result[i] = newline + base + result[i];
                        }
                        result = parenthesize(result, Precedence.Sequence, option.precedence);
                        return toSourceNode(result, expr);
                    }
                    function generateFunctionBody(node) {
                        var result, i, len, expr;
                        result = ['('];
                        for (i = 0, len = node.params.length; i < len; i += 1) {
                            result.push(node.params[i].name);
                            if (i + 1 < len) {
                                result.push(',' + space);
                            }
                        }
                        result.push(')');
                        if (node.expression) {
                            result.push(space);
                            expr = generateExpression(node.body, {
                                precedence: Precedence.Assignment,
                                allowIn: true,
                                allowCall: true
                            });
                            if (expr.toString().charAt(0) === '{') {
                                expr = [
                                    '(',
                                    expr,
                                    ')'
                                ];
                            }
                            result.push(expr);
                        } else {
                            result.push(maybeBlock(node.body, false, true));
                        }
                        return result;
                    }
                    function generateExpression(expr, option) {
                        var result, precedence, type, currentPrecedence, i, len, raw, fragment, multiline, leftChar, leftSource, rightChar, rightSource, allowIn, allowCall, allowUnparenthesizedNew, property, key, value;
                        precedence = option.precedence;
                        allowIn = option.allowIn;
                        allowCall = option.allowCall;
                        type = expr.type || option.type;
                        if (extra.verbatim && expr.hasOwnProperty(extra.verbatim)) {
                            return generateVerbatim(expr, option);
                        }
                        switch (type) {
                        case Syntax.SequenceExpression:
                            result = [];
                            allowIn |= Precedence.Sequence < precedence;
                            for (i = 0, len = expr.expressions.length; i < len; i += 1) {
                                result.push(generateExpression(expr.expressions[i], {
                                    precedence: Precedence.Assignment,
                                    allowIn: allowIn,
                                    allowCall: true
                                }));
                                if (i + 1 < len) {
                                    result.push(',' + space);
                                }
                            }
                            result = parenthesize(result, Precedence.Sequence, precedence);
                            break;
                        case Syntax.AssignmentExpression:
                            allowIn |= Precedence.Assignment < precedence;
                            result = parenthesize([
                                generateExpression(expr.left, {
                                    precedence: Precedence.Call,
                                    allowIn: allowIn,
                                    allowCall: true
                                }),
                                space + expr.operator + space,
                                generateExpression(expr.right, {
                                    precedence: Precedence.Assignment,
                                    allowIn: allowIn,
                                    allowCall: true
                                })
                            ], Precedence.Assignment, precedence);
                            break;
                        case Syntax.ConditionalExpression:
                            allowIn |= Precedence.Conditional < precedence;
                            result = parenthesize([
                                generateExpression(expr.test, {
                                    precedence: Precedence.LogicalOR,
                                    allowIn: allowIn,
                                    allowCall: true
                                }),
                                space + '?' + space,
                                generateExpression(expr.consequent, {
                                    precedence: Precedence.Assignment,
                                    allowIn: allowIn,
                                    allowCall: true
                                }),
                                space + ':' + space,
                                generateExpression(expr.alternate, {
                                    precedence: Precedence.Assignment,
                                    allowIn: allowIn,
                                    allowCall: true
                                })
                            ], Precedence.Conditional, precedence);
                            break;
                        case Syntax.LogicalExpression:
                        case Syntax.BinaryExpression:
                            currentPrecedence = BinaryPrecedence[expr.operator];
                            allowIn |= currentPrecedence < precedence;
                            fragment = generateExpression(expr.left, {
                                precedence: currentPrecedence,
                                allowIn: allowIn,
                                allowCall: true
                            });
                            leftSource = fragment.toString();
                            if (leftSource.charAt(leftSource.length - 1) === '/' && isIdentifierPart(expr.operator.charAt(0))) {
                                result = [
                                    fragment,
                                    ' ',
                                    expr.operator
                                ];
                            } else {
                                result = join(fragment, expr.operator);
                            }
                            fragment = generateExpression(expr.right, {
                                precedence: currentPrecedence + 1,
                                allowIn: allowIn,
                                allowCall: true
                            });
                            if (expr.operator === '/' && fragment.toString().charAt(0) === '/') {
                                // If '/' concats with '/', it is interpreted as comment start
                                result.push(' ', fragment);
                            } else {
                                result = join(result, fragment);
                            }
                            if (expr.operator === 'in' && !allowIn) {
                                result = [
                                    '(',
                                    result,
                                    ')'
                                ];
                            } else {
                                result = parenthesize(result, currentPrecedence, precedence);
                            }
                            break;
                        case Syntax.CallExpression:
                            result = [generateExpression(expr.callee, {
                                    precedence: Precedence.Call,
                                    allowIn: true,
                                    allowCall: true,
                                    allowUnparenthesizedNew: false
                                })];
                            result.push('(');
                            for (i = 0, len = expr['arguments'].length; i < len; i += 1) {
                                result.push(generateExpression(expr['arguments'][i], {
                                    precedence: Precedence.Assignment,
                                    allowIn: true,
                                    allowCall: true
                                }));
                                if (i + 1 < len) {
                                    result.push(',' + space);
                                }
                            }
                            result.push(')');
                            if (!allowCall) {
                                result = [
                                    '(',
                                    result,
                                    ')'
                                ];
                            } else {
                                result = parenthesize(result, Precedence.Call, precedence);
                            }
                            break;
                        case Syntax.NewExpression:
                            len = expr['arguments'].length;
                            allowUnparenthesizedNew = option.allowUnparenthesizedNew === undefined || option.allowUnparenthesizedNew;
                            result = join('new', generateExpression(expr.callee, {
                                precedence: Precedence.New,
                                allowIn: true,
                                allowCall: false,
                                allowUnparenthesizedNew: allowUnparenthesizedNew && !parentheses && len === 0
                            }));
                            if (!allowUnparenthesizedNew || parentheses || len > 0) {
                                result.push('(');
                                for (i = 0; i < len; i += 1) {
                                    result.push(generateExpression(expr['arguments'][i], {
                                        precedence: Precedence.Assignment,
                                        allowIn: true,
                                        allowCall: true
                                    }));
                                    if (i + 1 < len) {
                                        result.push(',' + space);
                                    }
                                }
                                result.push(')');
                            }
                            result = parenthesize(result, Precedence.New, precedence);
                            break;
                        case Syntax.MemberExpression:
                            result = [generateExpression(expr.object, {
                                    precedence: Precedence.Call,
                                    allowIn: true,
                                    allowCall: allowCall,
                                    allowUnparenthesizedNew: false
                                })];
                            if (expr.computed) {
                                result.push('[', generateExpression(expr.property, {
                                    precedence: Precedence.Sequence,
                                    allowIn: true,
                                    allowCall: allowCall
                                }), ']');
                            } else {
                                if (expr.object.type === Syntax.Literal && typeof expr.object.value === 'number') {
                                    if (result.indexOf('.') < 0) {
                                        if (!/[eExX]/.test(result) && !(result.length >= 2 && result[0] === '0')) {
                                            result.push('.');
                                        }
                                    }
                                }
                                result.push('.' + expr.property.name);
                            }
                            result = parenthesize(result, Precedence.Member, precedence);
                            break;
                        case Syntax.UnaryExpression:
                            fragment = generateExpression(expr.argument, {
                                precedence: Precedence.Unary,
                                allowIn: true,
                                allowCall: true
                            });
                            if (space === '') {
                                result = join(expr.operator, fragment);
                            } else {
                                result = [expr.operator];
                                if (expr.operator.length > 2) {
                                    // delete, void, typeof
                                    // get `typeof []`, not `typeof[]`
                                    result = join(result, fragment);
                                } else {
                                    // Prevent inserting spaces between operator and argument if it is unnecessary
                                    // like, `!cond`
                                    leftSource = toSourceNode(result).toString();
                                    leftChar = leftSource.charAt(leftSource.length - 1);
                                    rightChar = fragment.toString().charAt(0);
                                    if ((leftChar === '+' || leftChar === '-') && leftChar === rightChar || isIdentifierPart(leftChar) && isIdentifierPart(rightChar)) {
                                        result.push(' ', fragment);
                                    } else {
                                        result.push(fragment);
                                    }
                                }
                            }
                            result = parenthesize(result, Precedence.Unary, precedence);
                            break;
                        case Syntax.YieldExpression:
                            if (expr.delegate) {
                                result = 'yield*';
                            } else {
                                result = 'yield';
                            }
                            if (expr.argument) {
                                result = join(result, generateExpression(expr.argument, {
                                    precedence: Precedence.Assignment,
                                    allowIn: true,
                                    allowCall: true
                                }));
                            }
                            break;
                        case Syntax.UpdateExpression:
                            if (expr.prefix) {
                                result = parenthesize([
                                    expr.operator,
                                    generateExpression(expr.argument, {
                                        precedence: Precedence.Unary,
                                        allowIn: true,
                                        allowCall: true
                                    })
                                ], Precedence.Unary, precedence);
                            } else {
                                result = parenthesize([
                                    generateExpression(expr.argument, {
                                        precedence: Precedence.Postfix,
                                        allowIn: true,
                                        allowCall: true
                                    }),
                                    expr.operator
                                ], Precedence.Postfix, precedence);
                            }
                            break;
                        case Syntax.FunctionExpression:
                            result = 'function';
                            if (expr.id) {
                                result += ' ' + expr.id.name;
                            } else {
                                result += space;
                            }
                            result = [
                                result,
                                generateFunctionBody(expr)
                            ];
                            break;
                        case Syntax.ArrayPattern:
                        case Syntax.ArrayExpression:
                            if (!expr.elements.length) {
                                result = '[]';
                                break;
                            }
                            multiline = expr.elements.length > 1;
                            result = [
                                '[',
                                multiline ? newline : ''
                            ];
                            withIndent(function (indent) {
                                for (i = 0, len = expr.elements.length; i < len; i += 1) {
                                    if (!expr.elements[i]) {
                                        if (multiline) {
                                            result.push(indent);
                                        }
                                        if (i + 1 === len) {
                                            result.push(',');
                                        }
                                    } else {
                                        result.push(multiline ? indent : '', generateExpression(expr.elements[i], {
                                            precedence: Precedence.Assignment,
                                            allowIn: true,
                                            allowCall: true
                                        }));
                                    }
                                    if (i + 1 < len) {
                                        result.push(',' + (multiline ? newline : space));
                                    }
                                }
                            });
                            if (multiline && !endsWithLineTerminator(toSourceNode(result).toString())) {
                                result.push(newline);
                            }
                            result.push(multiline ? base : '', ']');
                            break;
                        case Syntax.Property:
                            if (expr.kind === 'get' || expr.kind === 'set') {
                                result = [
                                    expr.kind + ' ',
                                    generateExpression(expr.key, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    }),
                                    generateFunctionBody(expr.value)
                                ];
                            } else {
                                if (expr.shorthand) {
                                    result = generateExpression(expr.key, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    });
                                } else if (expr.method) {
                                    result = [];
                                    if (expr.value.generator) {
                                        result.push('*');
                                    }
                                    result.push(generateExpression(expr.key, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    }), generateFunctionBody(expr.value));
                                } else {
                                    result = [
                                        generateExpression(expr.key, {
                                            precedence: Precedence.Sequence,
                                            allowIn: true,
                                            allowCall: true
                                        }),
                                        ':' + space,
                                        generateExpression(expr.value, {
                                            precedence: Precedence.Assignment,
                                            allowIn: true,
                                            allowCall: true
                                        })
                                    ];
                                }
                            }
                            break;
                        case Syntax.ObjectExpression:
                            if (!expr.properties.length) {
                                result = '{}';
                                break;
                            }
                            multiline = expr.properties.length > 1;
                            withIndent(function (indent) {
                                fragment = generateExpression(expr.properties[0], {
                                    precedence: Precedence.Sequence,
                                    allowIn: true,
                                    allowCall: true,
                                    type: Syntax.Property
                                });
                            });
                            if (!multiline) {
                                // issues 4
                                // Do not transform from
                                //   dejavu.Class.declare({
                                //       method2: function () {}
                                //   });
                                // to
                                //   dejavu.Class.declare({method2: function () {
                                //       }});
                                if (!hasLineTerminator(toSourceNode(fragment).toString())) {
                                    result = [
                                        '{',
                                        space,
                                        fragment,
                                        space,
                                        '}'
                                    ];
                                    break;
                                }
                            }
                            withIndent(function (indent) {
                                result = [
                                    '{',
                                    newline,
                                    indent,
                                    fragment
                                ];
                                if (multiline) {
                                    result.push(',' + newline);
                                    for (i = 1, len = expr.properties.length; i < len; i += 1) {
                                        result.push(indent, generateExpression(expr.properties[i], {
                                            precedence: Precedence.Sequence,
                                            allowIn: true,
                                            allowCall: true,
                                            type: Syntax.Property
                                        }));
                                        if (i + 1 < len) {
                                            result.push(',' + newline);
                                        }
                                    }
                                }
                            });
                            if (!endsWithLineTerminator(toSourceNode(result).toString())) {
                                result.push(newline);
                            }
                            result.push(base, '}');
                            break;
                        case Syntax.ObjectPattern:
                            if (!expr.properties.length) {
                                result = '{}';
                                break;
                            }
                            multiline = false;
                            if (expr.properties.length === 1) {
                                property = expr.properties[0];
                                if (property.value.type !== Syntax.Identifier) {
                                    multiline = true;
                                }
                            } else {
                                for (i = 0, len = expr.properties.length; i < len; i += 1) {
                                    property = expr.properties[i];
                                    if (!property.shorthand) {
                                        multiline = true;
                                        break;
                                    }
                                }
                            }
                            result = [
                                '{',
                                multiline ? newline : ''
                            ];
                            withIndent(function (indent) {
                                for (i = 0, len = expr.properties.length; i < len; i += 1) {
                                    result.push(multiline ? indent : '', generateExpression(expr.properties[i], {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    }));
                                    if (i + 1 < len) {
                                        result.push(',' + (multiline ? newline : space));
                                    }
                                }
                            });
                            if (multiline && !endsWithLineTerminator(toSourceNode(result).toString())) {
                                result.push(newline);
                            }
                            result.push(multiline ? base : '', '}');
                            break;
                        case Syntax.ThisExpression:
                            result = 'this';
                            break;
                        case Syntax.Identifier:
                            result = expr.name;
                            break;
                        case Syntax.Literal:
                            if (expr.hasOwnProperty('raw') && parse) {
                                try {
                                    raw = parse(expr.raw).body[0].expression;
                                    if (raw.type === Syntax.Literal) {
                                        if (raw.value === expr.value) {
                                            result = expr.raw;
                                            break;
                                        }
                                    }
                                } catch (e) {
                                }
                            }
                            if (expr.value === null) {
                                result = 'null';
                                break;
                            }
                            if (typeof expr.value === 'string') {
                                result = escapeString(expr.value);
                                break;
                            }
                            if (typeof expr.value === 'number') {
                                result = generateNumber(expr.value);
                                break;
                            }
                            result = expr.value.toString();
                            break;
                        case Syntax.ComprehensionExpression:
                            result = [
                                '[',
                                generateExpression(expr.body, {
                                    precedence: Precedence.Assignment,
                                    allowIn: true,
                                    allowCall: true
                                })
                            ];
                            if (expr.blocks) {
                                for (i = 0, len = expr.blocks.length; i < len; i += 1) {
                                    fragment = generateExpression(expr.blocks[i], {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    });
                                    result = join(result, fragment);
                                }
                            }
                            if (expr.filter) {
                                result = join(result, 'if' + space);
                                fragment = generateExpression(expr.filter, {
                                    precedence: Precedence.Sequence,
                                    allowIn: true,
                                    allowCall: true
                                });
                                if (extra.moz.parenthesizedComprehensionBlock) {
                                    result = join(result, [
                                        '(',
                                        fragment,
                                        ')'
                                    ]);
                                } else {
                                    result = join(result, fragment);
                                }
                            }
                            result.push(']');
                            break;
                        case Syntax.ComprehensionBlock:
                            if (expr.left.type === Syntax.VariableDeclaration) {
                                fragment = [
                                    expr.left.kind + ' ',
                                    generateStatement(expr.left.declarations[0], { allowIn: false })
                                ];
                            } else {
                                fragment = generateExpression(expr.left, {
                                    precedence: Precedence.Call,
                                    allowIn: true,
                                    allowCall: true
                                });
                            }
                            fragment = join(fragment, expr.of ? 'of' : 'in');
                            fragment = join(fragment, generateExpression(expr.right, {
                                precedence: Precedence.Sequence,
                                allowIn: true,
                                allowCall: true
                            }));
                            if (extra.moz.parenthesizedComprehensionBlock) {
                                result = [
                                    'for' + space + '(',
                                    fragment,
                                    ')'
                                ];
                            } else {
                                result = join('for' + space, fragment);
                            }
                            break;
                        default:
                            throw new Error('Unknown expression type: ' + expr.type);
                        }
                        return toSourceNode(result, expr);
                    }
                    function generateStatement(stmt, option) {
                        var i, len, result, node, allowIn, functionBody, directiveContext, fragment, semicolon;
                        allowIn = true;
                        semicolon = ';';
                        functionBody = false;
                        directiveContext = false;
                        if (option) {
                            allowIn = option.allowIn === undefined || option.allowIn;
                            if (!semicolons && option.semicolonOptional === true) {
                                semicolon = '';
                            }
                            functionBody = option.functionBody;
                            directiveContext = option.directiveContext;
                        }
                        switch (stmt.type) {
                        case Syntax.BlockStatement:
                            result = [
                                '{',
                                newline
                            ];
                            withIndent(function () {
                                for (i = 0, len = stmt.body.length; i < len; i += 1) {
                                    fragment = addIndent(generateStatement(stmt.body[i], {
                                        semicolonOptional: i === len - 1,
                                        directiveContext: functionBody
                                    }));
                                    result.push(fragment);
                                    if (!endsWithLineTerminator(toSourceNode(fragment).toString())) {
                                        result.push(newline);
                                    }
                                }
                            });
                            result.push(addIndent('}'));
                            break;
                        case Syntax.BreakStatement:
                            if (stmt.label) {
                                result = 'break ' + stmt.label.name + semicolon;
                            } else {
                                result = 'break' + semicolon;
                            }
                            break;
                        case Syntax.ContinueStatement:
                            if (stmt.label) {
                                result = 'continue ' + stmt.label.name + semicolon;
                            } else {
                                result = 'continue' + semicolon;
                            }
                            break;
                        case Syntax.DirectiveStatement:
                            if (stmt.raw) {
                                result = stmt.raw + semicolon;
                            } else {
                                result = escapeDirective(stmt.directive) + semicolon;
                            }
                            break;
                        case Syntax.DoWhileStatement:
                            // Because `do 42 while (cond)` is Syntax Error. We need semicolon.
                            result = join('do', maybeBlock(stmt.body));
                            result = maybeBlockSuffix(stmt.body, result);
                            result = join(result, [
                                'while' + space + '(',
                                generateExpression(stmt.test, {
                                    precedence: Precedence.Sequence,
                                    allowIn: true,
                                    allowCall: true
                                }),
                                ')' + semicolon
                            ]);
                            break;
                        case Syntax.CatchClause:
                            withIndent(function () {
                                result = [
                                    'catch' + space + '(',
                                    generateExpression(stmt.param, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    }),
                                    ')'
                                ];
                            });
                            result.push(maybeBlock(stmt.body));
                            break;
                        case Syntax.DebuggerStatement:
                            result = 'debugger' + semicolon;
                            break;
                        case Syntax.EmptyStatement:
                            result = ';';
                            break;
                        case Syntax.ExpressionStatement:
                            result = [generateExpression(stmt.expression, {
                                    precedence: Precedence.Sequence,
                                    allowIn: true,
                                    allowCall: true
                                })];
                            // 12.4 '{', 'function' is not allowed in this position.
                            // wrap expression with parentheses
                            if (result.toString().charAt(0) === '{' || result.toString().slice(0, 8) === 'function' && ' ('.indexOf(result.toString().charAt(8)) >= 0 || directive && directiveContext && stmt.expression.type === Syntax.Literal && typeof stmt.expression.value === 'string') {
                                result = [
                                    '(',
                                    result,
                                    ')' + semicolon
                                ];
                            } else {
                                result.push(semicolon);
                            }
                            break;
                        case Syntax.VariableDeclarator:
                            if (stmt.init) {
                                result = [
                                    generateExpression(stmt.id, {
                                        precedence: Precedence.Assignment,
                                        allowIn: allowIn,
                                        allowCall: true
                                    }) + space + '=' + space,
                                    generateExpression(stmt.init, {
                                        precedence: Precedence.Assignment,
                                        allowIn: allowIn,
                                        allowCall: true
                                    })
                                ];
                            } else {
                                result = stmt.id.name;
                            }
                            break;
                        case Syntax.VariableDeclaration:
                            result = [stmt.kind];
                            // special path for
                            // var x = function () {
                            // };
                            if (stmt.declarations.length === 1 && stmt.declarations[0].init && stmt.declarations[0].init.type === Syntax.FunctionExpression) {
                                result.push(' ', generateStatement(stmt.declarations[0], { allowIn: allowIn }));
                            } else {
                                // VariableDeclarator is typed as Statement,
                                // but joined with comma (not LineTerminator).
                                // So if comment is attached to target node, we should specialize.
                                withIndent(function () {
                                    node = stmt.declarations[0];
                                    if (extra.comment && node.leadingComments) {
                                        result.push('\n', addIndent(generateStatement(node, { allowIn: allowIn })));
                                    } else {
                                        result.push(' ', generateStatement(node, { allowIn: allowIn }));
                                    }
                                    for (i = 1, len = stmt.declarations.length; i < len; i += 1) {
                                        node = stmt.declarations[i];
                                        if (extra.comment && node.leadingComments) {
                                            result.push(',' + newline, addIndent(generateStatement(node, { allowIn: allowIn })));
                                        } else {
                                            result.push(',' + space, generateStatement(node, { allowIn: allowIn }));
                                        }
                                    }
                                });
                            }
                            result.push(semicolon);
                            break;
                        case Syntax.ThrowStatement:
                            result = [
                                join('throw', generateExpression(stmt.argument, {
                                    precedence: Precedence.Sequence,
                                    allowIn: true,
                                    allowCall: true
                                })),
                                semicolon
                            ];
                            break;
                        case Syntax.TryStatement:
                            result = [
                                'try',
                                maybeBlock(stmt.block)
                            ];
                            result = maybeBlockSuffix(stmt.block, result);
                            for (i = 0, len = stmt.handlers.length; i < len; i += 1) {
                                result = join(result, generateStatement(stmt.handlers[i]));
                                if (stmt.finalizer || i + 1 !== len) {
                                    result = maybeBlockSuffix(stmt.handlers[i].body, result);
                                }
                            }
                            if (stmt.finalizer) {
                                result = join(result, [
                                    'finally',
                                    maybeBlock(stmt.finalizer)
                                ]);
                            }
                            break;
                        case Syntax.SwitchStatement:
                            withIndent(function () {
                                result = [
                                    'switch' + space + '(',
                                    generateExpression(stmt.discriminant, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    }),
                                    ')' + space + '{' + newline
                                ];
                            });
                            if (stmt.cases) {
                                for (i = 0, len = stmt.cases.length; i < len; i += 1) {
                                    fragment = addIndent(generateStatement(stmt.cases[i], { semicolonOptional: i === len - 1 }));
                                    result.push(fragment);
                                    if (!endsWithLineTerminator(toSourceNode(fragment).toString())) {
                                        result.push(newline);
                                    }
                                }
                            }
                            result.push(addIndent('}'));
                            break;
                        case Syntax.SwitchCase:
                            withIndent(function () {
                                if (stmt.test) {
                                    result = [
                                        join('case', generateExpression(stmt.test, {
                                            precedence: Precedence.Sequence,
                                            allowIn: true,
                                            allowCall: true
                                        })),
                                        ':'
                                    ];
                                } else {
                                    result = ['default:'];
                                }
                                i = 0;
                                len = stmt.consequent.length;
                                if (len && stmt.consequent[0].type === Syntax.BlockStatement) {
                                    fragment = maybeBlock(stmt.consequent[0]);
                                    result.push(fragment);
                                    i = 1;
                                }
                                if (i !== len && !endsWithLineTerminator(toSourceNode(result).toString())) {
                                    result.push(newline);
                                }
                                for (; i < len; i += 1) {
                                    fragment = addIndent(generateStatement(stmt.consequent[i], { semicolonOptional: i === len - 1 && semicolon === '' }));
                                    result.push(fragment);
                                    if (i + 1 !== len && !endsWithLineTerminator(toSourceNode(fragment).toString())) {
                                        result.push(newline);
                                    }
                                }
                            });
                            break;
                        case Syntax.IfStatement:
                            withIndent(function () {
                                result = [
                                    'if' + space + '(',
                                    generateExpression(stmt.test, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    }),
                                    ')'
                                ];
                            });
                            if (stmt.alternate) {
                                result.push(maybeBlock(stmt.consequent));
                                result = maybeBlockSuffix(stmt.consequent, result);
                                if (stmt.alternate.type === Syntax.IfStatement) {
                                    result = join(result, [
                                        'else ',
                                        generateStatement(stmt.alternate, { semicolonOptional: semicolon === '' })
                                    ]);
                                } else {
                                    result = join(result, join('else', maybeBlock(stmt.alternate, semicolon === '')));
                                }
                            } else {
                                result.push(maybeBlock(stmt.consequent, semicolon === ''));
                            }
                            break;
                        case Syntax.ForStatement:
                            withIndent(function () {
                                result = ['for' + space + '('];
                                if (stmt.init) {
                                    if (stmt.init.type === Syntax.VariableDeclaration) {
                                        result.push(generateStatement(stmt.init, { allowIn: false }));
                                    } else {
                                        result.push(generateExpression(stmt.init, {
                                            precedence: Precedence.Sequence,
                                            allowIn: false,
                                            allowCall: true
                                        }), ';');
                                    }
                                } else {
                                    result.push(';');
                                }
                                if (stmt.test) {
                                    result.push(space, generateExpression(stmt.test, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    }), ';');
                                } else {
                                    result.push(';');
                                }
                                if (stmt.update) {
                                    result.push(space, generateExpression(stmt.update, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    }), ')');
                                } else {
                                    result.push(')');
                                }
                            });
                            result.push(maybeBlock(stmt.body, semicolon === ''));
                            break;
                        case Syntax.ForInStatement:
                            result = ['for' + space + '('];
                            withIndent(function () {
                                if (stmt.left.type === Syntax.VariableDeclaration) {
                                    withIndent(function () {
                                        result.push(stmt.left.kind + ' ', generateStatement(stmt.left.declarations[0], { allowIn: false }));
                                    });
                                } else {
                                    result.push(generateExpression(stmt.left, {
                                        precedence: Precedence.Call,
                                        allowIn: true,
                                        allowCall: true
                                    }));
                                }
                                result = join(result, 'in');
                                result = [
                                    join(result, generateExpression(stmt.right, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    })),
                                    ')'
                                ];
                            });
                            result.push(maybeBlock(stmt.body, semicolon === ''));
                            break;
                        case Syntax.LabeledStatement:
                            result = [
                                stmt.label.name + ':',
                                maybeBlock(stmt.body, semicolon === '')
                            ];
                            break;
                        case Syntax.Program:
                            len = stmt.body.length;
                            result = [safeConcatenation && len > 0 ? '\n' : ''];
                            for (i = 0; i < len; i += 1) {
                                fragment = addIndent(generateStatement(stmt.body[i], {
                                    semicolonOptional: !safeConcatenation && i === len - 1,
                                    directiveContext: true
                                }));
                                result.push(fragment);
                                if (i + 1 < len && !endsWithLineTerminator(toSourceNode(fragment).toString())) {
                                    result.push(newline);
                                }
                            }
                            break;
                        case Syntax.FunctionDeclaration:
                            result = [
                                (stmt.generator && !extra.moz.starlessGenerator ? 'function* ' : 'function ') + stmt.id.name,
                                generateFunctionBody(stmt)
                            ];
                            break;
                        case Syntax.ReturnStatement:
                            if (stmt.argument) {
                                result = [
                                    join('return', generateExpression(stmt.argument, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    })),
                                    semicolon
                                ];
                            } else {
                                result = ['return' + semicolon];
                            }
                            break;
                        case Syntax.WhileStatement:
                            withIndent(function () {
                                result = [
                                    'while' + space + '(',
                                    generateExpression(stmt.test, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    }),
                                    ')'
                                ];
                            });
                            result.push(maybeBlock(stmt.body, semicolon === ''));
                            break;
                        case Syntax.WithStatement:
                            withIndent(function () {
                                result = [
                                    'with' + space + '(',
                                    generateExpression(stmt.object, {
                                        precedence: Precedence.Sequence,
                                        allowIn: true,
                                        allowCall: true
                                    }),
                                    ')'
                                ];
                            });
                            result.push(maybeBlock(stmt.body, semicolon === ''));
                            break;
                        default:
                            throw new Error('Unknown statement type: ' + stmt.type);
                        }
                        // Attach comments
                        if (extra.comment) {
                            result = addCommentsToStatement(stmt, result);
                        }
                        fragment = toSourceNode(result).toString();
                        if (stmt.type === Syntax.Program && !safeConcatenation && newline === '' && fragment.charAt(fragment.length - 1) === '\n') {
                            result = toSourceNode(result).replaceRight(/\s+$/, '');
                        }
                        return toSourceNode(result, stmt);
                    }
                    function generate(node, options) {
                        var defaultOptions = getDefaultOptions(), result, pair;
                        if (options != null) {
                            // Obsolete options
                            //
                            //   `options.indent`
                            //   `options.base`
                            //
                            // Instead of them, we can use `option.format.indent`.
                            if (typeof options.indent === 'string') {
                                defaultOptions.format.indent.style = options.indent;
                            }
                            if (typeof options.base === 'number') {
                                defaultOptions.format.indent.base = options.base;
                            }
                            options = updateDeeply(defaultOptions, options);
                            indent = options.format.indent.style;
                            if (typeof options.base === 'string') {
                                base = options.base;
                            } else {
                                base = stringRepeat(indent, options.format.indent.base);
                            }
                        } else {
                            options = defaultOptions;
                            indent = options.format.indent.style;
                            base = stringRepeat(indent, options.format.indent.base);
                        }
                        json = options.format.json;
                        renumber = options.format.renumber;
                        hexadecimal = json ? false : options.format.hexadecimal;
                        quotes = json ? 'double' : options.format.quotes;
                        escapeless = options.format.escapeless;
                        if (options.format.compact) {
                            newline = space = indent = base = '';
                        } else {
                            newline = '\n';
                            space = ' ';
                        }
                        parentheses = options.format.parentheses;
                        semicolons = options.format.semicolons;
                        safeConcatenation = options.format.safeConcatenation;
                        directive = options.directive;
                        parse = json ? null : options.parse;
                        sourceMap = options.sourceMap;
                        extra = options;
                        if (sourceMap) {
                            if (!exports.browser) {
                                // We assume environment is node.js
                                // And prevent from including source-map by browserify
                                SourceNode = require('source-map').SourceNode;
                            } else {
                                SourceNode = global.sourceMap.SourceNode;
                            }
                        } else {
                            SourceNode = SourceNodeMock;
                        }
                        switch (node.type) {
                        case Syntax.BlockStatement:
                        case Syntax.BreakStatement:
                        case Syntax.CatchClause:
                        case Syntax.ContinueStatement:
                        case Syntax.DirectiveStatement:
                        case Syntax.DoWhileStatement:
                        case Syntax.DebuggerStatement:
                        case Syntax.EmptyStatement:
                        case Syntax.ExpressionStatement:
                        case Syntax.ForStatement:
                        case Syntax.ForInStatement:
                        case Syntax.FunctionDeclaration:
                        case Syntax.IfStatement:
                        case Syntax.LabeledStatement:
                        case Syntax.Program:
                        case Syntax.ReturnStatement:
                        case Syntax.SwitchStatement:
                        case Syntax.SwitchCase:
                        case Syntax.ThrowStatement:
                        case Syntax.TryStatement:
                        case Syntax.VariableDeclaration:
                        case Syntax.VariableDeclarator:
                        case Syntax.WhileStatement:
                        case Syntax.WithStatement:
                            result = generateStatement(node);
                            break;
                        case Syntax.AssignmentExpression:
                        case Syntax.ArrayExpression:
                        case Syntax.ArrayPattern:
                        case Syntax.BinaryExpression:
                        case Syntax.CallExpression:
                        case Syntax.ConditionalExpression:
                        case Syntax.FunctionExpression:
                        case Syntax.Identifier:
                        case Syntax.Literal:
                        case Syntax.LogicalExpression:
                        case Syntax.MemberExpression:
                        case Syntax.NewExpression:
                        case Syntax.ObjectExpression:
                        case Syntax.ObjectPattern:
                        case Syntax.Property:
                        case Syntax.SequenceExpression:
                        case Syntax.ThisExpression:
                        case Syntax.UnaryExpression:
                        case Syntax.UpdateExpression:
                        case Syntax.YieldExpression:
                            result = generateExpression(node, {
                                precedence: Precedence.Sequence,
                                allowIn: true,
                                allowCall: true
                            });
                            break;
                        default:
                            throw new Error('Unknown node type: ' + node.type);
                        }
                        if (!sourceMap) {
                            return result.toString();
                        }
                        pair = result.toStringWithSourceMap({
                            file: options.sourceMap,
                            sourceRoot: options.sourceMapRoot
                        });
                        if (options.sourceMapWithCode) {
                            return pair;
                        }
                        return pair.map.toString();
                    }
                    // simple visitor implementation
                    VisitorKeys = {
                        AssignmentExpression: [
                            'left',
                            'right'
                        ],
                        ArrayExpression: ['elements'],
                        ArrayPattern: ['elements'],
                        BlockStatement: ['body'],
                        BinaryExpression: [
                            'left',
                            'right'
                        ],
                        BreakStatement: ['label'],
                        CallExpression: [
                            'callee',
                            'arguments'
                        ],
                        CatchClause: [
                            'param',
                            'body'
                        ],
                        ConditionalExpression: [
                            'test',
                            'consequent',
                            'alternate'
                        ],
                        ContinueStatement: ['label'],
                        DirectiveStatement: [],
                        DoWhileStatement: [
                            'body',
                            'test'
                        ],
                        DebuggerStatement: [],
                        EmptyStatement: [],
                        ExpressionStatement: ['expression'],
                        ForStatement: [
                            'init',
                            'test',
                            'update',
                            'body'
                        ],
                        ForInStatement: [
                            'left',
                            'right',
                            'body'
                        ],
                        FunctionDeclaration: [
                            'id',
                            'params',
                            'body'
                        ],
                        FunctionExpression: [
                            'id',
                            'params',
                            'body'
                        ],
                        Identifier: [],
                        IfStatement: [
                            'test',
                            'consequent',
                            'alternate'
                        ],
                        Literal: [],
                        LabeledStatement: [
                            'label',
                            'body'
                        ],
                        LogicalExpression: [
                            'left',
                            'right'
                        ],
                        MemberExpression: [
                            'object',
                            'property'
                        ],
                        NewExpression: [
                            'callee',
                            'arguments'
                        ],
                        ObjectExpression: ['properties'],
                        ObjectPattern: ['properties'],
                        Program: ['body'],
                        Property: [
                            'key',
                            'value'
                        ],
                        ReturnStatement: ['argument'],
                        SequenceExpression: ['expressions'],
                        SwitchStatement: [
                            'discriminant',
                            'cases'
                        ],
                        SwitchCase: [
                            'test',
                            'consequent'
                        ],
                        ThisExpression: [],
                        ThrowStatement: ['argument'],
                        TryStatement: [
                            'block',
                            'handlers',
                            'finalizer'
                        ],
                        UnaryExpression: ['argument'],
                        UpdateExpression: ['argument'],
                        VariableDeclaration: ['declarations'],
                        VariableDeclarator: [
                            'id',
                            'init'
                        ],
                        WhileStatement: [
                            'test',
                            'body'
                        ],
                        WithStatement: [
                            'object',
                            'body'
                        ],
                        YieldExpression: ['argument']
                    };
                    VisitorOption = {
                        Break: 1,
                        Skip: 2
                    };
                    // based on LLVM libc++ upper_bound / lower_bound
                    // MIT License
                    function upperBound(array, func) {
                        var diff, len, i, current;
                        len = array.length;
                        i = 0;
                        while (len) {
                            diff = len >>> 1;
                            current = i + diff;
                            if (func(array[current])) {
                                len = diff;
                            } else {
                                i = current + 1;
                                len -= diff + 1;
                            }
                        }
                        return i;
                    }
                    function lowerBound(array, func) {
                        var diff, len, i, current;
                        len = array.length;
                        i = 0;
                        while (len) {
                            diff = len >>> 1;
                            current = i + diff;
                            if (func(array[current])) {
                                i = current + 1;
                                len -= diff + 1;
                            } else {
                                len = diff;
                            }
                        }
                        return i;
                    }
                    function extendCommentRange(comment, tokens) {
                        var target, token;
                        target = upperBound(tokens, function search(token) {
                            return token.range[0] > comment.range[0];
                        });
                        comment.extendedRange = [
                            comment.range[0],
                            comment.range[1]
                        ];
                        if (target !== tokens.length) {
                            comment.extendedRange[1] = tokens[target].range[0];
                        }
                        target -= 1;
                        if (target >= 0) {
                            if (target < tokens.length) {
                                comment.extendedRange[0] = tokens[target].range[1];
                            } else if (token.length) {
                                comment.extendedRange[1] = tokens[tokens.length - 1].range[0];
                            }
                        }
                        return comment;
                    }
                    function attachComments(tree, providedComments, tokens) {
                        // At first, we should calculate extended comment ranges.
                        var comments = [], comment, len, i;
                        if (!tree.range) {
                            throw new Error('attachComments needs range information');
                        }
                        // tokens array is empty, we attach comments to tree as 'leadingComments'
                        if (!tokens.length) {
                            if (providedComments.length) {
                                for (i = 0, len = providedComments.length; i < len; i += 1) {
                                    comment = deepCopy(providedComments[i]);
                                    comment.extendedRange = [
                                        0,
                                        tree.range[0]
                                    ];
                                    comments.push(comment);
                                }
                                tree.leadingComments = comments;
                            }
                            return tree;
                        }
                        for (i = 0, len = providedComments.length; i < len; i += 1) {
                            comments.push(extendCommentRange(deepCopy(providedComments[i]), tokens));
                        }
                        // This is based on John Freeman's implementation.
                        traverse(tree, {
                            cursor: 0,
                            enter: function (node) {
                                var comment;
                                while (this.cursor < comments.length) {
                                    comment = comments[this.cursor];
                                    if (comment.extendedRange[1] > node.range[0]) {
                                        break;
                                    }
                                    if (comment.extendedRange[1] === node.range[0]) {
                                        if (!node.leadingComments) {
                                            node.leadingComments = [];
                                        }
                                        node.leadingComments.push(comment);
                                        comments.splice(this.cursor, 1);
                                    } else {
                                        this.cursor += 1;
                                    }
                                }
                                // already out of owned node
                                if (this.cursor === comments.length) {
                                    return VisitorOption.Break;
                                }
                                if (comments[this.cursor].extendedRange[0] > node.range[1]) {
                                    return VisitorOption.Skip;
                                }
                            }
                        });
                        traverse(tree, {
                            cursor: 0,
                            leave: function (node) {
                                var comment;
                                while (this.cursor < comments.length) {
                                    comment = comments[this.cursor];
                                    if (node.range[1] < comment.extendedRange[0]) {
                                        break;
                                    }
                                    if (node.range[1] === comment.extendedRange[0]) {
                                        if (!node.trailingComments) {
                                            node.trailingComments = [];
                                        }
                                        node.trailingComments.push(comment);
                                        comments.splice(this.cursor, 1);
                                    } else {
                                        this.cursor += 1;
                                    }
                                }
                                // already out of owned node
                                if (this.cursor === comments.length) {
                                    return VisitorOption.Break;
                                }
                                if (comments[this.cursor].extendedRange[0] > node.range[1]) {
                                    return VisitorOption.Skip;
                                }
                            }
                        });
                        return tree;
                    }
                    exports.version = require('./package.json').version;
                    exports.generate = generate;
                    exports.attachComments = attachComments;
                    exports.browser = false;
                }());    /* vim: set sw=4 ts=4 et tw=80 : */
            }(window));
        },
        {
            './package.json': 6,
            'estraverse': 7,
            'source-map': 8
        }
    ],
    7: [
        function (require, module, exports) {
            (function () {
                /*
                  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
                  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
                
                  Redistribution and use in source and binary forms, with or without
                  modification, are permitted provided that the following conditions are met:
                
                    * Redistributions of source code must retain the above copyright
                      notice, this list of conditions and the following disclaimer.
                    * Redistributions in binary form must reproduce the above copyright
                      notice, this list of conditions and the following disclaimer in the
                      documentation and/or other materials provided with the distribution.
                
                  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
                  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
                  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
                  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
                  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
                  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
                  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
                  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
                  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
                  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
                */
                /*jslint bitwise:true */
                /*global exports:true, define:true, window:true */
                (function (factory) {
                    'use strict';
                    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
                    // and plain browser loading,
                    if (typeof define === 'function' && define.amd) {
                        define(['exports'], factory);
                    } else if (typeof exports !== 'undefined') {
                        factory(exports);
                    } else {
                        factory(window.estraverse = {});
                    }
                }(function (exports) {
                    'use strict';
                    var Syntax, isArray, VisitorOption, VisitorKeys, wrappers;
                    Syntax = {
                        AssignmentExpression: 'AssignmentExpression',
                        ArrayExpression: 'ArrayExpression',
                        BlockStatement: 'BlockStatement',
                        BinaryExpression: 'BinaryExpression',
                        BreakStatement: 'BreakStatement',
                        CallExpression: 'CallExpression',
                        CatchClause: 'CatchClause',
                        ConditionalExpression: 'ConditionalExpression',
                        ContinueStatement: 'ContinueStatement',
                        DebuggerStatement: 'DebuggerStatement',
                        DirectiveStatement: 'DirectiveStatement',
                        DoWhileStatement: 'DoWhileStatement',
                        EmptyStatement: 'EmptyStatement',
                        ExpressionStatement: 'ExpressionStatement',
                        ForStatement: 'ForStatement',
                        ForInStatement: 'ForInStatement',
                        FunctionDeclaration: 'FunctionDeclaration',
                        FunctionExpression: 'FunctionExpression',
                        Identifier: 'Identifier',
                        IfStatement: 'IfStatement',
                        Literal: 'Literal',
                        LabeledStatement: 'LabeledStatement',
                        LogicalExpression: 'LogicalExpression',
                        MemberExpression: 'MemberExpression',
                        NewExpression: 'NewExpression',
                        ObjectExpression: 'ObjectExpression',
                        Program: 'Program',
                        Property: 'Property',
                        ReturnStatement: 'ReturnStatement',
                        SequenceExpression: 'SequenceExpression',
                        SwitchStatement: 'SwitchStatement',
                        SwitchCase: 'SwitchCase',
                        ThisExpression: 'ThisExpression',
                        ThrowStatement: 'ThrowStatement',
                        TryStatement: 'TryStatement',
                        UnaryExpression: 'UnaryExpression',
                        UpdateExpression: 'UpdateExpression',
                        VariableDeclaration: 'VariableDeclaration',
                        VariableDeclarator: 'VariableDeclarator',
                        WhileStatement: 'WhileStatement',
                        WithStatement: 'WithStatement'
                    };
                    isArray = Array.isArray;
                    if (!isArray) {
                        isArray = function isArray(array) {
                            return Object.prototype.toString.call(array) === '[object Array]';
                        };
                    }
                    VisitorKeys = {
                        AssignmentExpression: [
                            'left',
                            'right'
                        ],
                        ArrayExpression: ['elements'],
                        BlockStatement: ['body'],
                        BinaryExpression: [
                            'left',
                            'right'
                        ],
                        BreakStatement: ['label'],
                        CallExpression: [
                            'callee',
                            'arguments'
                        ],
                        CatchClause: [
                            'param',
                            'body'
                        ],
                        ConditionalExpression: [
                            'test',
                            'consequent',
                            'alternate'
                        ],
                        ContinueStatement: ['label'],
                        DebuggerStatement: [],
                        DirectiveStatement: [],
                        DoWhileStatement: [
                            'body',
                            'test'
                        ],
                        EmptyStatement: [],
                        ExpressionStatement: ['expression'],
                        ForStatement: [
                            'init',
                            'test',
                            'update',
                            'body'
                        ],
                        ForInStatement: [
                            'left',
                            'right',
                            'body'
                        ],
                        FunctionDeclaration: [
                            'id',
                            'params',
                            'body'
                        ],
                        FunctionExpression: [
                            'id',
                            'params',
                            'body'
                        ],
                        Identifier: [],
                        IfStatement: [
                            'test',
                            'consequent',
                            'alternate'
                        ],
                        Literal: [],
                        LabeledStatement: [
                            'label',
                            'body'
                        ],
                        LogicalExpression: [
                            'left',
                            'right'
                        ],
                        MemberExpression: [
                            'object',
                            'property'
                        ],
                        NewExpression: [
                            'callee',
                            'arguments'
                        ],
                        ObjectExpression: ['properties'],
                        Program: ['body'],
                        Property: [
                            'key',
                            'value'
                        ],
                        ReturnStatement: ['argument'],
                        SequenceExpression: ['expressions'],
                        SwitchStatement: [
                            'discriminant',
                            'cases'
                        ],
                        SwitchCase: [
                            'test',
                            'consequent'
                        ],
                        ThisExpression: [],
                        ThrowStatement: ['argument'],
                        TryStatement: [
                            'block',
                            'handlers',
                            'finalizer'
                        ],
                        UnaryExpression: ['argument'],
                        UpdateExpression: ['argument'],
                        VariableDeclaration: ['declarations'],
                        VariableDeclarator: [
                            'id',
                            'init'
                        ],
                        WhileStatement: [
                            'test',
                            'body'
                        ],
                        WithStatement: [
                            'object',
                            'body'
                        ]
                    };
                    VisitorOption = {
                        Break: 1,
                        Skip: 2
                    };
                    wrappers = { PropertyWrapper: 'Property' };
                    function traverse(top, visitor) {
                        var worklist, leavelist, node, nodeType, ret, current, current2, candidates, candidate, marker = {};
                        worklist = [top];
                        leavelist = [null];
                        while (worklist.length) {
                            node = worklist.pop();
                            nodeType = node.type;
                            if (node === marker) {
                                node = leavelist.pop();
                                if (visitor.leave) {
                                    ret = visitor.leave(node, leavelist[leavelist.length - 1]);
                                } else {
                                    ret = undefined;
                                }
                                if (ret === VisitorOption.Break) {
                                    return;
                                }
                            } else if (node) {
                                if (wrappers.hasOwnProperty(nodeType)) {
                                    node = node.node;
                                    nodeType = wrappers[nodeType];
                                }
                                if (visitor.enter) {
                                    ret = visitor.enter(node, leavelist[leavelist.length - 1]);
                                } else {
                                    ret = undefined;
                                }
                                if (ret === VisitorOption.Break) {
                                    return;
                                }
                                worklist.push(marker);
                                leavelist.push(node);
                                if (ret !== VisitorOption.Skip) {
                                    candidates = VisitorKeys[nodeType];
                                    current = candidates.length;
                                    while ((current -= 1) >= 0) {
                                        candidate = node[candidates[current]];
                                        if (candidate) {
                                            if (isArray(candidate)) {
                                                current2 = candidate.length;
                                                while ((current2 -= 1) >= 0) {
                                                    if (candidate[current2]) {
                                                        if (nodeType === Syntax.ObjectExpression && 'properties' === candidates[current] && null == candidates[current].type) {
                                                            worklist.push({
                                                                type: 'PropertyWrapper',
                                                                node: candidate[current2]
                                                            });
                                                        } else {
                                                            worklist.push(candidate[current2]);
                                                        }
                                                    }
                                                }
                                            } else {
                                                worklist.push(candidate);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    function replace(top, visitor) {
                        var worklist, leavelist, node, nodeType, target, tuple, ret, current, current2, candidates, candidate, marker = {}, result;
                        result = { top: top };
                        tuple = [
                            top,
                            result,
                            'top'
                        ];
                        worklist = [tuple];
                        leavelist = [tuple];
                        function notify(v) {
                            ret = v;
                        }
                        while (worklist.length) {
                            tuple = worklist.pop();
                            if (tuple === marker) {
                                tuple = leavelist.pop();
                                ret = undefined;
                                if (visitor.leave) {
                                    node = tuple[0];
                                    target = visitor.leave(tuple[0], leavelist[leavelist.length - 1][0], notify);
                                    if (target !== undefined) {
                                        node = target;
                                    }
                                    tuple[1][tuple[2]] = node;
                                }
                                if (ret === VisitorOption.Break) {
                                    return result.top;
                                }
                            } else if (tuple[0]) {
                                ret = undefined;
                                node = tuple[0];
                                nodeType = node.type;
                                if (wrappers.hasOwnProperty(nodeType)) {
                                    tuple[0] = node = node.node;
                                    nodeType = wrappers[nodeType];
                                }
                                if (visitor.enter) {
                                    target = visitor.enter(tuple[0], leavelist[leavelist.length - 1][0], notify);
                                    if (target !== undefined) {
                                        node = target;
                                    }
                                    tuple[1][tuple[2]] = node;
                                    tuple[0] = node;
                                }
                                if (ret === VisitorOption.Break) {
                                    return result.top;
                                }
                                if (tuple[0]) {
                                    worklist.push(marker);
                                    leavelist.push(tuple);
                                    if (ret !== VisitorOption.Skip) {
                                        candidates = VisitorKeys[nodeType];
                                        current = candidates.length;
                                        while ((current -= 1) >= 0) {
                                            candidate = node[candidates[current]];
                                            if (candidate) {
                                                if (isArray(candidate)) {
                                                    current2 = candidate.length;
                                                    while ((current2 -= 1) >= 0) {
                                                        if (candidate[current2]) {
                                                            if (nodeType === Syntax.ObjectExpression && 'properties' === candidates[current] && null == candidates[current].type) {
                                                                worklist.push([
                                                                    {
                                                                        type: 'PropertyWrapper',
                                                                        node: candidate[current2]
                                                                    },
                                                                    candidate,
                                                                    current2
                                                                ]);
                                                            } else {
                                                                worklist.push([
                                                                    candidate[current2],
                                                                    candidate,
                                                                    current2
                                                                ]);
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    worklist.push([
                                                        candidate,
                                                        node,
                                                        candidates[current]
                                                    ]);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        return result.top;
                    }
                    exports.version = '0.0.4';
                    exports.Syntax = Syntax;
                    exports.traverse = traverse;
                    exports.replace = replace;
                    exports.VisitorKeys = VisitorKeys;
                    exports.VisitorOption = VisitorOption;
                }));    /* vim: set sw=4 ts=4 et tw=80 : */
            }());
        },
        {}
    ],
    8: [
        function (require, module, exports) {
            /*
             * Copyright 2009-2011 Mozilla Foundation and contributors
             * Licensed under the New BSD license. See LICENSE.txt or:
             * http://opensource.org/licenses/BSD-3-Clause
             */
            exports.SourceMapGenerator = require('./source-map/source-map-generator').SourceMapGenerator;
            exports.SourceMapConsumer = require('./source-map/source-map-consumer').SourceMapConsumer;
            exports.SourceNode = require('./source-map/source-node').SourceNode;
        },
        {
            './source-map/source-map-generator': 9,
            './source-map/source-map-consumer': 10,
            './source-map/source-node': 11
        }
    ],
    10: [
        function (require, module, exports) {
            /* -*- Mode: js; js-indent-level: 2; -*- */
            /*
             * Copyright 2011 Mozilla Foundation and contributors
             * Licensed under the New BSD license. See LICENSE or:
             * http://opensource.org/licenses/BSD-3-Clause
             */
            if (typeof define !== 'function') {
                var define = require('amdefine')(module);
            }
            define(function (require, exports, module) {
                var util = require('./util');
                var binarySearch = require('./binary-search');
                var ArraySet = require('./array-set').ArraySet;
                var base64VLQ = require('./base64-vlq');
                /**
                 * A SourceMapConsumer instance represents a parsed source map which we can
                 * query for information about the original file positions by giving it a file
                 * position in the generated source.
                 *
                 * The only parameter is the raw source map (either as a JSON string, or
                 * already parsed to an object). According to the spec, source maps have the
                 * following attributes:
                 *
                 *   - version: Which version of the source map spec this map is following.
                 *   - sources: An array of URLs to the original source files.
                 *   - names: An array of identifiers which can be referrenced by individual mappings.
                 *   - sourceRoot: Optional. The URL root from which all sources are relative.
                 *   - sourcesContent: Optional. An array of contents of the original source files.
                 *   - mappings: A string of base64 VLQs which contain the actual mappings.
                 *   - file: The generated file this source map is associated with.
                 *
                 * Here is an example source map, taken from the source map spec[0]:
                 *
                 *     {
                 *       version : 3,
                 *       file: "out.js",
                 *       sourceRoot : "",
                 *       sources: ["foo.js", "bar.js"],
                 *       names: ["src", "maps", "are", "fun"],
                 *       mappings: "AA,AB;;ABCDE;"
                 *     }
                 *
                 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
                 */
                function SourceMapConsumer(aSourceMap) {
                    var sourceMap = aSourceMap;
                    if (typeof aSourceMap === 'string') {
                        sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
                    }
                    var version = util.getArg(sourceMap, 'version');
                    var sources = util.getArg(sourceMap, 'sources');
                    var names = util.getArg(sourceMap, 'names');
                    var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
                    var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
                    var mappings = util.getArg(sourceMap, 'mappings');
                    var file = util.getArg(sourceMap, 'file');
                    if (version !== this._version) {
                        throw new Error('Unsupported version: ' + version);
                    }
                    this._names = ArraySet.fromArray(names);
                    this._sources = ArraySet.fromArray(sources);
                    this.sourceRoot = sourceRoot;
                    this.sourcesContent = sourcesContent;
                    this.file = file;
                    // `this._generatedMappings` and `this._originalMappings` hold the parsed
                    // mapping coordinates from the source map's "mappings" attribute. Each
                    // object in the array is of the form
                    //
                    //     {
                    //       generatedLine: The line number in the generated code,
                    //       generatedColumn: The column number in the generated code,
                    //       source: The path to the original source file that generated this
                    //               chunk of code,
                    //       originalLine: The line number in the original source that
                    //                     corresponds to this chunk of generated code,
                    //       originalColumn: The column number in the original source that
                    //                       corresponds to this chunk of generated code,
                    //       name: The name of the original symbol which generated this chunk of
                    //             code.
                    //     }
                    //
                    // All properties except for `generatedLine` and `generatedColumn` can be
                    // `null`.
                    //
                    // `this._generatedMappings` is ordered by the generated positions.
                    //
                    // `this._originalMappings` is ordered by the original positions.
                    this._generatedMappings = [];
                    this._originalMappings = [];
                    this._parseMappings(mappings, sourceRoot);
                }
                /**
                 * The version of the source mapping spec that we are consuming.
                 */
                SourceMapConsumer.prototype._version = 3;
                /**
                 * The list of original sources.
                 */
                Object.defineProperty(SourceMapConsumer.prototype, 'sources', {
                    get: function () {
                        return this._sources.toArray().map(function (s) {
                            return this.sourceRoot ? util.join(this.sourceRoot, s) : s;
                        }, this);
                    }
                });
                /**
                 * Parse the mappings in a string in to a data structure which we can easily
                 * query (an ordered list in this._generatedMappings).
                 */
                SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
                    var generatedLine = 1;
                    var previousGeneratedColumn = 0;
                    var previousOriginalLine = 0;
                    var previousOriginalColumn = 0;
                    var previousSource = 0;
                    var previousName = 0;
                    var mappingSeparator = /^[,;]/;
                    var str = aStr;
                    var mapping;
                    var temp;
                    while (str.length > 0) {
                        if (str.charAt(0) === ';') {
                            generatedLine++;
                            str = str.slice(1);
                            previousGeneratedColumn = 0;
                        } else if (str.charAt(0) === ',') {
                            str = str.slice(1);
                        } else {
                            mapping = {};
                            mapping.generatedLine = generatedLine;
                            // Generated column.
                            temp = base64VLQ.decode(str);
                            mapping.generatedColumn = previousGeneratedColumn + temp.value;
                            previousGeneratedColumn = mapping.generatedColumn;
                            str = temp.rest;
                            if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
                                // Original source.
                                temp = base64VLQ.decode(str);
                                mapping.source = this._sources.at(previousSource + temp.value);
                                previousSource += temp.value;
                                str = temp.rest;
                                if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
                                    throw new Error('Found a source, but no line and column');
                                }
                                // Original line.
                                temp = base64VLQ.decode(str);
                                mapping.originalLine = previousOriginalLine + temp.value;
                                previousOriginalLine = mapping.originalLine;
                                // Lines are stored 0-based
                                mapping.originalLine += 1;
                                str = temp.rest;
                                if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
                                    throw new Error('Found a source and line, but no column');
                                }
                                // Original column.
                                temp = base64VLQ.decode(str);
                                mapping.originalColumn = previousOriginalColumn + temp.value;
                                previousOriginalColumn = mapping.originalColumn;
                                str = temp.rest;
                                if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
                                    // Original name.
                                    temp = base64VLQ.decode(str);
                                    mapping.name = this._names.at(previousName + temp.value);
                                    previousName += temp.value;
                                    str = temp.rest;
                                }
                            }
                            this._generatedMappings.push(mapping);
                            if (typeof mapping.originalLine === 'number') {
                                this._originalMappings.push(mapping);
                            }
                        }
                    }
                    this._originalMappings.sort(this._compareOriginalPositions);
                };
                /**
                 * Comparator between two mappings where the original positions are compared.
                 */
                SourceMapConsumer.prototype._compareOriginalPositions = function SourceMapConsumer_compareOriginalPositions(mappingA, mappingB) {
                    if (mappingA.source > mappingB.source) {
                        return 1;
                    } else if (mappingA.source < mappingB.source) {
                        return -1;
                    } else {
                        var cmp = mappingA.originalLine - mappingB.originalLine;
                        return cmp === 0 ? mappingA.originalColumn - mappingB.originalColumn : cmp;
                    }
                };
                /**
                 * Comparator between two mappings where the generated positions are compared.
                 */
                SourceMapConsumer.prototype._compareGeneratedPositions = function SourceMapConsumer_compareGeneratedPositions(mappingA, mappingB) {
                    var cmp = mappingA.generatedLine - mappingB.generatedLine;
                    return cmp === 0 ? mappingA.generatedColumn - mappingB.generatedColumn : cmp;
                };
                /**
                 * Find the mapping that best matches the hypothetical "needle" mapping that
                 * we are searching for in the given "haystack" of mappings.
                 */
                SourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator) {
                    // To return the position we are searching for, we must first find the
                    // mapping for the given position and then return the opposite position it
                    // points to. Because the mappings are sorted, we can use binary search to
                    // find the best mapping.
                    if (aNeedle[aLineName] <= 0) {
                        throw new TypeError('Line must be greater than or equal to 1, got ' + aNeedle[aLineName]);
                    }
                    if (aNeedle[aColumnName] < 0) {
                        throw new TypeError('Column must be greater than or equal to 0, got ' + aNeedle[aColumnName]);
                    }
                    return binarySearch.search(aNeedle, aMappings, aComparator);
                };
                /**
                 * Returns the original source, line, and column information for the generated
                 * source's line and column positions provided. The only argument is an object
                 * with the following properties:
                 *
                 *   - line: The line number in the generated source.
                 *   - column: The column number in the generated source.
                 *
                 * and an object is returned with the following properties:
                 *
                 *   - source: The original source file, or null.
                 *   - line: The line number in the original source, or null.
                 *   - column: The column number in the original source, or null.
                 *   - name: The original identifier, or null.
                 */
                SourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
                    var needle = {
                            generatedLine: util.getArg(aArgs, 'line'),
                            generatedColumn: util.getArg(aArgs, 'column')
                        };
                    var mapping = this._findMapping(needle, this._generatedMappings, 'generatedLine', 'generatedColumn', this._compareGeneratedPositions);
                    if (mapping) {
                        var source = util.getArg(mapping, 'source', null);
                        if (source && this.sourceRoot) {
                            source = util.join(this.sourceRoot, source);
                        }
                        return {
                            source: source,
                            line: util.getArg(mapping, 'originalLine', null),
                            column: util.getArg(mapping, 'originalColumn', null),
                            name: util.getArg(mapping, 'name', null)
                        };
                    }
                    return {
                        source: null,
                        line: null,
                        column: null,
                        name: null
                    };
                };
                /**
                 * Returns the original source content. The only argument is
                 * the url of the original source file. Returns null if no
                 * original source content is availible.
                 */
                SourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource) {
                    if (!this.sourcesContent) {
                        return null;
                    }
                    if (this.sourceRoot) {
                        // Try to remove the sourceRoot
                        var relativeUrl = util.relative(this.sourceRoot, aSource);
                        if (this._sources.has(relativeUrl)) {
                            return this.sourcesContent[this._sources.indexOf(relativeUrl)];
                        }
                    }
                    if (this._sources.has(aSource)) {
                        return this.sourcesContent[this._sources.indexOf(aSource)];
                    }
                    throw new Error('"' + aSource + '" is not in the SourceMap.');
                };
                /**
                 * Returns the generated line and column information for the original source,
                 * line, and column positions provided. The only argument is an object with
                 * the following properties:
                 *
                 *   - source: The filename of the original source.
                 *   - line: The line number in the original source.
                 *   - column: The column number in the original source.
                 *
                 * and an object is returned with the following properties:
                 *
                 *   - line: The line number in the generated source, or null.
                 *   - column: The column number in the generated source, or null.
                 */
                SourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
                    var needle = {
                            source: util.getArg(aArgs, 'source'),
                            originalLine: util.getArg(aArgs, 'line'),
                            originalColumn: util.getArg(aArgs, 'column')
                        };
                    if (this.sourceRoot) {
                        needle.source = util.relative(this.sourceRoot, needle.source);
                    }
                    var mapping = this._findMapping(needle, this._originalMappings, 'originalLine', 'originalColumn', this._compareOriginalPositions);
                    if (mapping) {
                        return {
                            line: util.getArg(mapping, 'generatedLine', null),
                            column: util.getArg(mapping, 'generatedColumn', null)
                        };
                    }
                    return {
                        line: null,
                        column: null
                    };
                };
                SourceMapConsumer.GENERATED_ORDER = 1;
                SourceMapConsumer.ORIGINAL_ORDER = 2;
                /**
                 * Iterate over each mapping between an original source/line/column and a
                 * generated line/column in this source map.
                 *
                 * @param Function aCallback
                 *        The function that is called with each mapping.
                 * @param Object aContext
                 *        Optional. If specified, this object will be the value of `this` every
                 *        time that `aCallback` is called.
                 * @param aOrder
                 *        Either `SourceMapConsumer.GENERATED_ORDER` or
                 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
                 *        iterate over the mappings sorted by the generated file's line/column
                 *        order or the original's source/line/column order, respectively. Defaults to
                 *        `SourceMapConsumer.GENERATED_ORDER`.
                 */
                SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
                    var context = aContext || null;
                    var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
                    var mappings;
                    switch (order) {
                    case SourceMapConsumer.GENERATED_ORDER:
                        mappings = this._generatedMappings;
                        break;
                    case SourceMapConsumer.ORIGINAL_ORDER:
                        mappings = this._originalMappings;
                        break;
                    default:
                        throw new Error('Unknown order of iteration.');
                    }
                    var sourceRoot = this.sourceRoot;
                    mappings.map(function (mapping) {
                        var source = mapping.source;
                        if (source && sourceRoot) {
                            source = util.join(sourceRoot, source);
                        }
                        return {
                            source: source,
                            generatedLine: mapping.generatedLine,
                            generatedColumn: mapping.generatedColumn,
                            originalLine: mapping.originalLine,
                            originalColumn: mapping.originalColumn,
                            name: mapping.name
                        };
                    }).forEach(aCallback, context);
                };
                exports.SourceMapConsumer = SourceMapConsumer;
            });
        },
        {
            './util': 12,
            './binary-search': 13,
            './base64-vlq': 14,
            './array-set': 15,
            'amdefine': 16
        }
    ],
    9: [
        function (require, module, exports) {
            /* -*- Mode: js; js-indent-level: 2; -*- */
            /*
             * Copyright 2011 Mozilla Foundation and contributors
             * Licensed under the New BSD license. See LICENSE or:
             * http://opensource.org/licenses/BSD-3-Clause
             */
            if (typeof define !== 'function') {
                var define = require('amdefine')(module);
            }
            define(function (require, exports, module) {
                var base64VLQ = require('./base64-vlq');
                var util = require('./util');
                var ArraySet = require('./array-set').ArraySet;
                /**
                 * An instance of the SourceMapGenerator represents a source map which is
                 * being built incrementally. To create a new one, you must pass an object
                 * with the following properties:
                 *
                 *   - file: The filename of the generated source.
                 *   - sourceRoot: An optional root for all URLs in this source map.
                 */
                function SourceMapGenerator(aArgs) {
                    this._file = util.getArg(aArgs, 'file');
                    this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
                    this._sources = new ArraySet();
                    this._names = new ArraySet();
                    this._mappings = [];
                    this._sourcesContents = null;
                }
                SourceMapGenerator.prototype._version = 3;
                /**
                 * Creates a new SourceMapGenerator based on a SourceMapConsumer
                 *
                 * @param aSourceMapConsumer The SourceMap.
                 */
                SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
                    var sourceRoot = aSourceMapConsumer.sourceRoot;
                    var generator = new SourceMapGenerator({
                            file: aSourceMapConsumer.file,
                            sourceRoot: sourceRoot
                        });
                    aSourceMapConsumer.eachMapping(function (mapping) {
                        var newMapping = {
                                generated: {
                                    line: mapping.generatedLine,
                                    column: mapping.generatedColumn
                                }
                            };
                        if (mapping.source) {
                            newMapping.source = mapping.source;
                            if (sourceRoot) {
                                newMapping.source = util.relative(sourceRoot, newMapping.source);
                            }
                            newMapping.original = {
                                line: mapping.originalLine,
                                column: mapping.originalColumn
                            };
                            if (mapping.name) {
                                newMapping.name = mapping.name;
                            }
                        }
                        generator.addMapping(newMapping);
                    });
                    aSourceMapConsumer.sources.forEach(function (sourceFile) {
                        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                        if (content) {
                            generator.setSourceContent(sourceFile, content);
                        }
                    });
                    return generator;
                };
                /**
                 * Add a single mapping from original source line and column to the generated
                 * source's line and column for this source map being created. The mapping
                 * object should have the following properties:
                 *
                 *   - generated: An object with the generated line and column positions.
                 *   - original: An object with the original line and column positions.
                 *   - source: The original source file (relative to the sourceRoot).
                 *   - name: An optional original token name for this mapping.
                 */
                SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
                    var generated = util.getArg(aArgs, 'generated');
                    var original = util.getArg(aArgs, 'original', null);
                    var source = util.getArg(aArgs, 'source', null);
                    var name = util.getArg(aArgs, 'name', null);
                    this._validateMapping(generated, original, source, name);
                    if (source && !this._sources.has(source)) {
                        this._sources.add(source);
                    }
                    if (name && !this._names.has(name)) {
                        this._names.add(name);
                    }
                    this._mappings.push({
                        generated: generated,
                        original: original,
                        source: source,
                        name: name
                    });
                };
                /**
                 * Set the source content for a source file.
                 */
                SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
                    var source = aSourceFile;
                    if (this._sourceRoot) {
                        source = util.relative(this._sourceRoot, source);
                    }
                    if (aSourceContent !== null) {
                        // Add the source content to the _sourcesContents map.
                        // Create a new _sourcesContents map if the property is null.
                        if (!this._sourcesContents) {
                            this._sourcesContents = {};
                        }
                        this._sourcesContents[util.toSetString(source)] = aSourceContent;
                    } else {
                        // Remove the source file from the _sourcesContents map.
                        // If the _sourcesContents map is empty, set the property to null.
                        delete this._sourcesContents[util.toSetString(source)];
                        if (Object.keys(this._sourcesContents).length === 0) {
                            this._sourcesContents = null;
                        }
                    }
                };
                /**
                 * Applies a SourceMap for a source file to the SourceMap.
                 * Each mapping to the supplied source file is rewritten using the
                 * supplied SourceMap. Note: The resolution for the resulting mappings
                 * is the minimium of this map and the supplied map.
                 *
                 * @param aSourceMapConsumer The SourceMap to be applied.
                 * @param aSourceFile Optional. The filename of the source file.
                 *                    If omitted, sourceMapConsumer.file will be used.
                 */
                SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile) {
                    // If aSourceFile is omitted, we will use the file property of the SourceMap
                    if (!aSourceFile) {
                        aSourceFile = aSourceMapConsumer.file;
                    }
                    var sourceRoot = this._sourceRoot;
                    // Make "aSourceFile" relative if an absolute Url is passed.
                    if (sourceRoot) {
                        aSourceFile = util.relative(sourceRoot, aSourceFile);
                    }
                    // Applying the SourceMap can add and remove items from the sources and
                    // the names array.
                    var newSources = new ArraySet();
                    var newNames = new ArraySet();
                    // Find mappings for the "aSourceFile"
                    this._mappings.forEach(function (mapping) {
                        if (mapping.source === aSourceFile && mapping.original) {
                            // Check if it can be mapped by the source map, then update the mapping.
                            var original = aSourceMapConsumer.originalPositionFor({
                                    line: mapping.original.line,
                                    column: mapping.original.column
                                });
                            if (original.source !== null) {
                                // Copy mapping
                                if (sourceRoot) {
                                    mapping.source = util.relative(sourceRoot, original.source);
                                } else {
                                    mapping.source = original.source;
                                }
                                mapping.original.line = original.line;
                                mapping.original.column = original.column;
                                if (original.name !== null && mapping.name !== null) {
                                    // Only use the identifier name if it's an identifier
                                    // in both SourceMaps
                                    mapping.name = original.name;
                                }
                            }
                        }
                        var source = mapping.source;
                        if (source && !newSources.has(source)) {
                            newSources.add(source);
                        }
                        var name = mapping.name;
                        if (name && !newNames.has(name)) {
                            newNames.add(name);
                        }
                    }, this);
                    this._sources = newSources;
                    this._names = newNames;
                    // Copy sourcesContents of applied map.
                    aSourceMapConsumer.sources.forEach(function (sourceFile) {
                        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                        if (content) {
                            if (sourceRoot) {
                                sourceFile = util.relative(sourceRoot, sourceFile);
                            }
                            this.setSourceContent(sourceFile, content);
                        }
                    }, this);
                };
                /**
                 * A mapping can have one of the three levels of data:
                 *
                 *   1. Just the generated position.
                 *   2. The Generated position, original position, and original source.
                 *   3. Generated and original position, original source, as well as a name
                 *      token.
                 *
                 * To maintain consistency, we validate that any new mapping being added falls
                 * in to one of these categories.
                 */
                SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
                    if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
                        // Case 1.
                        return;
                    } else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aOriginal && 'line' in aOriginal && 'column' in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
                        // Cases 2 and 3.
                        return;
                    } else {
                        throw new Error('Invalid mapping.');
                    }
                };
                /**
                 * Serialize the accumulated mappings in to the stream of base 64 VLQs
                 * specified by the source map format.
                 */
                SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
                    var previousGeneratedColumn = 0;
                    var previousGeneratedLine = 1;
                    var previousOriginalColumn = 0;
                    var previousOriginalLine = 0;
                    var previousName = 0;
                    var previousSource = 0;
                    var result = '';
                    var mapping;
                    // The mappings must be guarenteed to be in sorted order before we start
                    // serializing them or else the generated line numbers (which are defined
                    // via the ';' separators) will be all messed up. Note: it might be more
                    // performant to maintain the sorting as we insert them, rather than as we
                    // serialize them, but the big O is the same either way.
                    this._mappings.sort(function (mappingA, mappingB) {
                        var cmp = mappingA.generated.line - mappingB.generated.line;
                        return cmp === 0 ? mappingA.generated.column - mappingB.generated.column : cmp;
                    });
                    for (var i = 0, len = this._mappings.length; i < len; i++) {
                        mapping = this._mappings[i];
                        if (mapping.generated.line !== previousGeneratedLine) {
                            previousGeneratedColumn = 0;
                            while (mapping.generated.line !== previousGeneratedLine) {
                                result += ';';
                                previousGeneratedLine++;
                            }
                        } else {
                            if (i > 0) {
                                result += ',';
                            }
                        }
                        result += base64VLQ.encode(mapping.generated.column - previousGeneratedColumn);
                        previousGeneratedColumn = mapping.generated.column;
                        if (mapping.source && mapping.original) {
                            result += base64VLQ.encode(this._sources.indexOf(mapping.source) - previousSource);
                            previousSource = this._sources.indexOf(mapping.source);
                            // lines are stored 0-based in SourceMap spec version 3
                            result += base64VLQ.encode(mapping.original.line - 1 - previousOriginalLine);
                            previousOriginalLine = mapping.original.line - 1;
                            result += base64VLQ.encode(mapping.original.column - previousOriginalColumn);
                            previousOriginalColumn = mapping.original.column;
                            if (mapping.name) {
                                result += base64VLQ.encode(this._names.indexOf(mapping.name) - previousName);
                                previousName = this._names.indexOf(mapping.name);
                            }
                        }
                    }
                    return result;
                };
                /**
                 * Externalize the source map.
                 */
                SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
                    var map = {
                            version: this._version,
                            file: this._file,
                            sources: this._sources.toArray(),
                            names: this._names.toArray(),
                            mappings: this._serializeMappings()
                        };
                    if (this._sourceRoot) {
                        map.sourceRoot = this._sourceRoot;
                    }
                    if (this._sourcesContents) {
                        map.sourcesContent = map.sources.map(function (source) {
                            if (map.sourceRoot) {
                                source = util.relative(map.sourceRoot, source);
                            }
                            return Object.prototype.hasOwnProperty.call(this._sourcesContents, util.toSetString(source)) ? this._sourcesContents[util.toSetString(source)] : null;
                        }, this);
                    }
                    return map;
                };
                /**
                 * Render the source map being generated to a string.
                 */
                SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
                    return JSON.stringify(this);
                };
                exports.SourceMapGenerator = SourceMapGenerator;
            });
        },
        {
            './base64-vlq': 14,
            './util': 12,
            './array-set': 15,
            'amdefine': 16
        }
    ],
    11: [
        function (require, module, exports) {
            /* -*- Mode: js; js-indent-level: 2; -*- */
            /*
             * Copyright 2011 Mozilla Foundation and contributors
             * Licensed under the New BSD license. See LICENSE or:
             * http://opensource.org/licenses/BSD-3-Clause
             */
            if (typeof define !== 'function') {
                var define = require('amdefine')(module);
            }
            define(function (require, exports, module) {
                var SourceMapGenerator = require('./source-map-generator').SourceMapGenerator;
                /**
                 * SourceNodes provide a way to abstract over interpolating/concatenating
                 * snippets of generated JavaScript source code while maintaining the line and
                 * column information associated with the original source code.
                 *
                 * @param aLine The original line number.
                 * @param aColumn The original column number.
                 * @param aSource The original source's filename.
                 * @param aChunks Optional. An array of strings which are snippets of
                 *        generated JS, or other SourceNodes.
                 * @param aName The original identifier.
                 */
                function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
                    this.children = [];
                    this.line = aLine === undefined ? null : aLine;
                    this.column = aColumn === undefined ? null : aColumn;
                    this.source = aSource === undefined ? null : aSource;
                    this.name = aName === undefined ? null : aName;
                    if (aChunks != null)
                        this.add(aChunks);
                }
                /**
                 * Creates a SourceNode from generated code and a SourceMapConsumer.
                 *
                 * @param aGeneratedCode The generated code
                 * @param aSourceMapConsumer The SourceMap for the generated code
                 */
                SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer) {
                    // The SourceNode we want to fill with the generated code
                    // and the SourceMap
                    var node = new SourceNode();
                    // The generated code
                    // Processed fragments are removed from this array.
                    var remainingLines = aGeneratedCode.split('\n');
                    // We need to remember the position of "remainingLines"
                    var lastGeneratedLine = 1, lastGeneratedColumn = 0;
                    // The generate SourceNodes we need a code range.
                    // To extract it current and last mapping is used.
                    // Here we store the last mapping.
                    var lastMapping = null;
                    aSourceMapConsumer.eachMapping(function (mapping) {
                        if (lastMapping === null) {
                            // We add the generated code until the first mapping
                            // to the SourceNode without any mapping.
                            // Each line is added as separate string.
                            while (lastGeneratedLine < mapping.generatedLine) {
                                node.add(remainingLines.shift() + '\n');
                                lastGeneratedLine++;
                            }
                            if (lastGeneratedColumn < mapping.generatedColumn) {
                                var nextLine = remainingLines[0];
                                node.add(nextLine.substr(0, mapping.generatedColumn));
                                remainingLines[0] = nextLine.substr(mapping.generatedColumn);
                                lastGeneratedColumn = mapping.generatedColumn;
                            }
                        } else {
                            // We add the code from "lastMapping" to "mapping":
                            // First check if there is a new line in between.
                            if (lastGeneratedLine < mapping.generatedLine) {
                                var code = '';
                                // Associate full lines with "lastMapping"
                                do {
                                    code += remainingLines.shift() + '\n';
                                    lastGeneratedLine++;
                                    lastGeneratedColumn = 0;
                                } while (lastGeneratedLine < mapping.generatedLine);
                                // When we reached the correct line, we add code until we
                                // reach the correct column too.
                                if (lastGeneratedColumn < mapping.generatedColumn) {
                                    var nextLine = remainingLines[0];
                                    code += nextLine.substr(0, mapping.generatedColumn);
                                    remainingLines[0] = nextLine.substr(mapping.generatedColumn);
                                    lastGeneratedColumn = mapping.generatedColumn;
                                }
                                // Create the SourceNode.
                                addMappingWithCode(lastMapping, code);
                            } else {
                                // There is no new line in between.
                                // Associate the code between "lastGeneratedColumn" and
                                // "mapping.generatedColumn" with "lastMapping"
                                var nextLine = remainingLines[0];
                                var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
                                remainingLines[0] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
                                lastGeneratedColumn = mapping.generatedColumn;
                                addMappingWithCode(lastMapping, code);
                            }
                        }
                        lastMapping = mapping;
                    }, this);
                    // We have processed all mappings.
                    // Associate the remaining code in the current line with "lastMapping"
                    // and add the remaining lines without any mapping
                    addMappingWithCode(lastMapping, remainingLines.join('\n'));
                    return node;
                    function addMappingWithCode(mapping, code) {
                        if (mapping.source === undefined) {
                            node.add(code);
                        } else {
                            node.add(new SourceNode(mapping.originalLine, mapping.originalColumn, mapping.source, code, mapping.name));
                        }
                    }
                };
                /**
                 * Add a chunk of generated JS to this source node.
                 *
                 * @param aChunk A string snippet of generated JS code, another instance of
                 *        SourceNode, or an array where each member is one of those things.
                 */
                SourceNode.prototype.add = function SourceNode_add(aChunk) {
                    if (Array.isArray(aChunk)) {
                        aChunk.forEach(function (chunk) {
                            this.add(chunk);
                        }, this);
                    } else if (aChunk instanceof SourceNode || typeof aChunk === 'string') {
                        if (aChunk) {
                            this.children.push(aChunk);
                        }
                    } else {
                        throw new TypeError('Expected a SourceNode, string, or an array of SourceNodes and strings. Got ' + aChunk);
                    }
                    return this;
                };
                /**
                 * Add a chunk of generated JS to the beginning of this source node.
                 *
                 * @param aChunk A string snippet of generated JS code, another instance of
                 *        SourceNode, or an array where each member is one of those things.
                 */
                SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
                    if (Array.isArray(aChunk)) {
                        for (var i = aChunk.length - 1; i >= 0; i--) {
                            this.prepend(aChunk[i]);
                        }
                    } else if (aChunk instanceof SourceNode || typeof aChunk === 'string') {
                        this.children.unshift(aChunk);
                    } else {
                        throw new TypeError('Expected a SourceNode, string, or an array of SourceNodes and strings. Got ' + aChunk);
                    }
                    return this;
                };
                /**
                 * Walk over the tree of JS snippets in this node and its children. The
                 * walking function is called once for each snippet of JS and is passed that
                 * snippet and the its original associated source's line/column location.
                 *
                 * @param aFn The traversal function.
                 */
                SourceNode.prototype.walk = function SourceNode_walk(aFn) {
                    this.children.forEach(function (chunk) {
                        if (chunk instanceof SourceNode) {
                            chunk.walk(aFn);
                        } else {
                            if (chunk !== '') {
                                aFn(chunk, {
                                    source: this.source,
                                    line: this.line,
                                    column: this.column,
                                    name: this.name
                                });
                            }
                        }
                    }, this);
                };
                /**
                 * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
                 * each of `this.children`.
                 *
                 * @param aSep The separator.
                 */
                SourceNode.prototype.join = function SourceNode_join(aSep) {
                    var newChildren;
                    var i;
                    var len = this.children.length;
                    if (len > 0) {
                        newChildren = [];
                        for (i = 0; i < len - 1; i++) {
                            newChildren.push(this.children[i]);
                            newChildren.push(aSep);
                        }
                        newChildren.push(this.children[i]);
                        this.children = newChildren;
                    }
                    return this;
                };
                /**
                 * Call String.prototype.replace on the very right-most source snippet. Useful
                 * for trimming whitespace from the end of a source node, etc.
                 *
                 * @param aPattern The pattern to replace.
                 * @param aReplacement The thing to replace the pattern with.
                 */
                SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
                    var lastChild = this.children[this.children.length - 1];
                    if (lastChild instanceof SourceNode) {
                        lastChild.replaceRight(aPattern, aReplacement);
                    } else if (typeof lastChild === 'string') {
                        this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
                    } else {
                        this.children.push(''.replace(aPattern, aReplacement));
                    }
                    return this;
                };
                /**
                 * Return the string representation of this source node. Walks over the tree
                 * and concatenates all the various snippets together to one string.
                 */
                SourceNode.prototype.toString = function SourceNode_toString() {
                    var str = '';
                    this.walk(function (chunk) {
                        str += chunk;
                    });
                    return str;
                };
                /**
                 * Returns the string representation of this source node along with a source
                 * map.
                 */
                SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
                    var generated = {
                            code: '',
                            line: 1,
                            column: 0
                        };
                    var map = new SourceMapGenerator(aArgs);
                    var sourceMappingActive = false;
                    this.walk(function (chunk, original) {
                        generated.code += chunk;
                        if (original.source !== null && original.line !== null && original.column !== null) {
                            map.addMapping({
                                source: original.source,
                                original: {
                                    line: original.line,
                                    column: original.column
                                },
                                generated: {
                                    line: generated.line,
                                    column: generated.column
                                },
                                name: original.name
                            });
                            sourceMappingActive = true;
                        } else if (sourceMappingActive) {
                            map.addMapping({
                                generated: {
                                    line: generated.line,
                                    column: generated.column
                                }
                            });
                            sourceMappingActive = false;
                        }
                        chunk.split('').forEach(function (ch) {
                            if (ch === '\n') {
                                generated.line++;
                                generated.column = 0;
                            } else {
                                generated.column++;
                            }
                        });
                    });
                    return {
                        code: generated.code,
                        map: map
                    };
                };
                exports.SourceNode = SourceNode;
            });
        },
        {
            './source-map-generator': 9,
            'amdefine': 16
        }
    ],
    17: [
        function (require, module, exports) {
            // shim for using process in browser
            var process = module.exports = {};
            process.nextTick = function () {
                var canSetImmediate = typeof window !== 'undefined' && window.setImmediate;
                var canPost = typeof window !== 'undefined' && window.postMessage && window.addEventListener;
                ;
                if (canSetImmediate) {
                    return function (f) {
                        return window.setImmediate(f);
                    };
                }
                if (canPost) {
                    var queue = [];
                    window.addEventListener('message', function (ev) {
                        if (ev.source === window && ev.data === 'process-tick') {
                            ev.stopPropagation();
                            if (queue.length > 0) {
                                var fn = queue.shift();
                                fn();
                            }
                        }
                    }, true);
                    return function nextTick(fn) {
                        queue.push(fn);
                        window.postMessage('process-tick', '*');
                    };
                }
                return function nextTick(fn) {
                    setTimeout(fn, 0);
                };
            }();
            process.title = 'browser';
            process.browser = true;
            process.env = {};
            process.argv = [];
            process.binding = function (name) {
                throw new Error('process.binding is not supported');
            };
            // TODO(shtylman)
            process.cwd = function () {
                return '/';
            };
            process.chdir = function (dir) {
                throw new Error('process.chdir is not supported');
            };
        },
        {}
    ],
    16: [
        function (require, module, exports) {
            (function (process, __filename) {
                /** vim: et:ts=4:sw=4:sts=4
                 * @license amdefine 0.0.4 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
                 * Available via the MIT or new BSD license.
                 * see: http://github.com/jrburke/amdefine for details
                 */
                /*jslint node: true */
                /*global module, process */
                'use strict';
                var path = require('path');
                /**
                 * Creates a define for node.
                 * @param {Object} module the "module" object that is defined by Node for the
                 * current module.
                 * @param {Function} [require]. Node's require function for the current module.
                 * It only needs to be passed in Node versions before 0.5, when module.require
                 * did not exist.
                 * @returns {Function} a define function that is usable for the current node
                 * module.
                 */
                function amdefine(module, require) {
                    var defineCache = {}, loaderCache = {}, alreadyCalled = false, makeRequire, stringRequire;
                    /**
                     * Trims the . and .. from an array of path segments.
                     * It will keep a leading path segment if a .. will become
                     * the first path segment, to help with module name lookups,
                     * which act like paths, but can be remapped. But the end result,
                     * all paths that use this function should look normalized.
                     * NOTE: this method MODIFIES the input array.
                     * @param {Array} ary the array of path segments.
                     */
                    function trimDots(ary) {
                        var i, part;
                        for (i = 0; ary[i]; i += 1) {
                            part = ary[i];
                            if (part === '.') {
                                ary.splice(i, 1);
                                i -= 1;
                            } else if (part === '..') {
                                if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                                    //End of the line. Keep at least one non-dot
                                    //path segment at the front so it can be mapped
                                    //correctly to disk. Otherwise, there is likely
                                    //no path mapping for a path starting with '..'.
                                    //This can still fail, but catches the most reasonable
                                    //uses of ..
                                    break;
                                } else if (i > 0) {
                                    ary.splice(i - 1, 2);
                                    i -= 2;
                                }
                            }
                        }
                    }
                    function normalize(name, baseName) {
                        var baseParts;
                        //Adjust any relative paths.
                        if (name && name.charAt(0) === '.') {
                            //If have a base name, try to normalize against it,
                            //otherwise, assume it is a top-level require that will
                            //be relative to baseUrl in the end.
                            if (baseName) {
                                baseParts = baseName.split('/');
                                baseParts = baseParts.slice(0, baseParts.length - 1);
                                baseParts = baseParts.concat(name.split('/'));
                                trimDots(baseParts);
                                name = baseParts.join('/');
                            }
                        }
                        return name;
                    }
                    /**
                     * Create the normalize() function passed to a loader plugin's
                     * normalize method.
                     */
                    function makeNormalize(relName) {
                        return function (name) {
                            return normalize(name, relName);
                        };
                    }
                    function makeLoad(id) {
                        function load(value) {
                            loaderCache[id] = value;
                        }
                        load.fromText = function (id, text) {
                            //This one is difficult because the text can/probably uses
                            //define, and any relative paths and requires should be relative
                            //to that id was it would be found on disk. But this would require
                            //bootstrapping a module/require fairly deeply from node core.
                            //Not sure how best to go about that yet.
                            throw new Error('amdefine does not implement load.fromText');
                        };
                        return load;
                    }
                    makeRequire = function (systemRequire, exports, module, relId) {
                        function amdRequire(deps, callback) {
                            if (typeof deps === 'string') {
                                //Synchronous, single module require('')
                                return stringRequire(systemRequire, exports, module, deps, relId);
                            } else {
                                //Array of dependencies with a callback.
                                //Convert the dependencies to modules.
                                deps = deps.map(function (depName) {
                                    return stringRequire(systemRequire, exports, module, depName, relId);
                                });
                                //Wait for next tick to call back the require call.
                                process.nextTick(function () {
                                    callback.apply(null, deps);
                                });
                            }
                        }
                        amdRequire.toUrl = function (filePath) {
                            if (filePath.indexOf('.') === 0) {
                                return normalize(filePath, path.dirname(module.filename));
                            } else {
                                return filePath;
                            }
                        };
                        return amdRequire;
                    };
                    //Favor explicit value, passed in if the module wants to support Node 0.4.
                    require = require || function req() {
                        return module.require.apply(module, arguments);
                    };
                    function runFactory(id, deps, factory) {
                        var r, e, m, result;
                        if (id) {
                            e = loaderCache[id] = {};
                            m = {
                                id: id,
                                uri: __filename,
                                exports: e
                            };
                            r = makeRequire(undefined, e, m, id);
                        } else {
                            //Only support one define call per file
                            if (alreadyCalled) {
                                throw new Error('amdefine with no module ID cannot be called more than once per file.');
                            }
                            alreadyCalled = true;
                            //Use the real variables from node
                            //Use module.exports for exports, since
                            //the exports in here is amdefine exports.
                            e = module.exports;
                            m = module;
                            r = makeRequire(require, e, m, module.id);
                        }
                        //If there are dependencies, they are strings, so need
                        //to convert them to dependency values.
                        if (deps) {
                            deps = deps.map(function (depName) {
                                return r(depName);
                            });
                        }
                        //Call the factory with the right dependencies.
                        if (typeof factory === 'function') {
                            result = factory.apply(module.exports, deps);
                        } else {
                            result = factory;
                        }
                        if (result !== undefined) {
                            m.exports = result;
                            if (id) {
                                loaderCache[id] = m.exports;
                            }
                        }
                    }
                    stringRequire = function (systemRequire, exports, module, id, relId) {
                        //Split the ID by a ! so that
                        var index = id.indexOf('!'), originalId = id, prefix, plugin;
                        if (index === -1) {
                            id = normalize(id, relId);
                            //Straight module lookup. If it is one of the special dependencies,
                            //deal with it, otherwise, delegate to node.
                            if (id === 'require') {
                                return makeRequire(systemRequire, exports, module, relId);
                            } else if (id === 'exports') {
                                return exports;
                            } else if (id === 'module') {
                                return module;
                            } else if (loaderCache.hasOwnProperty(id)) {
                                return loaderCache[id];
                            } else if (defineCache[id]) {
                                runFactory.apply(null, defineCache[id]);
                                return loaderCache[id];
                            } else {
                                if (systemRequire) {
                                    return systemRequire(originalId);
                                } else {
                                    throw new Error('No module with ID: ' + id);
                                }
                            }
                        } else {
                            //There is a plugin in play.
                            prefix = id.substring(0, index);
                            id = id.substring(index + 1, id.length);
                            plugin = stringRequire(systemRequire, exports, module, prefix, relId);
                            if (plugin.normalize) {
                                id = plugin.normalize(id, makeNormalize(relId));
                            } else {
                                //Normalize the ID normally.
                                id = normalize(id, relId);
                            }
                            if (loaderCache[id]) {
                                return loaderCache[id];
                            } else {
                                plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});
                                return loaderCache[id];
                            }
                        }
                    };
                    //Create a define function specific to the module asking for amdefine.
                    function define(id, deps, factory) {
                        if (Array.isArray(id)) {
                            factory = deps;
                            deps = id;
                            id = undefined;
                        } else if (typeof id !== 'string') {
                            factory = id;
                            id = deps = undefined;
                        }
                        if (deps && !Array.isArray(deps)) {
                            factory = deps;
                            deps = undefined;
                        }
                        if (!deps) {
                            deps = [
                                'require',
                                'exports',
                                'module'
                            ];
                        }
                        //Set up properties for this module. If an ID, then use
                        //internal cache. If no ID, then use the external variables
                        //for this node module.
                        if (id) {
                            //Put the module in deep freeze until there is a
                            //require call for it.
                            defineCache[id] = [
                                id,
                                deps,
                                factory
                            ];
                        } else {
                            runFactory(id, deps, factory);
                        }
                    }
                    //define.require, which has access to all the values in the
                    //cache. Useful for AMD modules that all have IDs in the file,
                    //but need to finally export a value to node based on one of those
                    //IDs.
                    define.require = function (id) {
                        if (loaderCache[id]) {
                            return loaderCache[id];
                        }
                        if (defineCache[id]) {
                            runFactory.apply(null, defineCache[id]);
                            return loaderCache[id];
                        }
                    };
                    define.amd = {};
                    return define;
                }
                module.exports = amdefine;
            }(require('__browserify_process'), '/Desktop\\atropa-ide\\node_modules\\atropa-jsformatter\\node_modules\\escodegen\\node_modules\\source-map\\node_modules\\amdefine\\amdefine.js'));
        },
        {
            'path': 18,
            '__browserify_process': 17
        }
    ],
    18: [
        function (require, module, exports) {
            (function (process) {
                function filter(xs, fn) {
                    var res = [];
                    for (var i = 0; i < xs.length; i++) {
                        if (fn(xs[i], i, xs))
                            res.push(xs[i]);
                    }
                    return res;
                }
                // resolves . and .. elements in a path array with directory names there
                // must be no slashes, empty elements, or device names (c:\) in the array
                // (so also no leading and trailing slashes - it does not distinguish
                // relative and absolute paths)
                function normalizeArray(parts, allowAboveRoot) {
                    // if the path tries to go above the root, `up` ends up > 0
                    var up = 0;
                    for (var i = parts.length; i >= 0; i--) {
                        var last = parts[i];
                        if (last == '.') {
                            parts.splice(i, 1);
                        } else if (last === '..') {
                            parts.splice(i, 1);
                            up++;
                        } else if (up) {
                            parts.splice(i, 1);
                            up--;
                        }
                    }
                    // if the path is allowed to go above the root, restore leading ..s
                    if (allowAboveRoot) {
                        for (; up--; up) {
                            parts.unshift('..');
                        }
                    }
                    return parts;
                }
                // Regex to split a filename into [*, dir, basename, ext]
                // posix version
                var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;
                // path.resolve([from ...], to)
                // posix version
                exports.resolve = function () {
                    var resolvedPath = '', resolvedAbsolute = false;
                    for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
                        var path = i >= 0 ? arguments[i] : process.cwd();
                        // Skip empty and invalid entries
                        if (typeof path !== 'string' || !path) {
                            continue;
                        }
                        resolvedPath = path + '/' + resolvedPath;
                        resolvedAbsolute = path.charAt(0) === '/';
                    }
                    // At this point the path should be resolved to a full absolute path, but
                    // handle relative paths to be safe (might happen when process.cwd() fails)
                    // Normalize the path
                    resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function (p) {
                        return !!p;
                    }), !resolvedAbsolute).join('/');
                    return (resolvedAbsolute ? '/' : '') + resolvedPath || '.';
                };
                // path.normalize(path)
                // posix version
                exports.normalize = function (path) {
                    var isAbsolute = path.charAt(0) === '/', trailingSlash = path.slice(-1) === '/';
                    // Normalize the path
                    path = normalizeArray(filter(path.split('/'), function (p) {
                        return !!p;
                    }), !isAbsolute).join('/');
                    if (!path && !isAbsolute) {
                        path = '.';
                    }
                    if (path && trailingSlash) {
                        path += '/';
                    }
                    return (isAbsolute ? '/' : '') + path;
                };
                // posix version
                exports.join = function () {
                    var paths = Array.prototype.slice.call(arguments, 0);
                    return exports.normalize(filter(paths, function (p, index) {
                        return p && typeof p === 'string';
                    }).join('/'));
                };
                exports.dirname = function (path) {
                    var dir = splitPathRe.exec(path)[1] || '';
                    var isWindows = false;
                    if (!dir) {
                        // No dirname
                        return '.';
                    } else if (dir.length === 1 || isWindows && dir.length <= 3 && dir.charAt(1) === ':') {
                        // It is just a slash or a drive letter with a slash
                        return dir;
                    } else {
                        // It is a full dirname, strip trailing slash
                        return dir.substring(0, dir.length - 1);
                    }
                };
                exports.basename = function (path, ext) {
                    var f = splitPathRe.exec(path)[2] || '';
                    // TODO: make this comparison case-insensitive on windows?
                    if (ext && f.substr(-1 * ext.length) === ext) {
                        f = f.substr(0, f.length - ext.length);
                    }
                    return f;
                };
                exports.extname = function (path) {
                    return splitPathRe.exec(path)[3] || '';
                };
                exports.relative = function (from, to) {
                    from = exports.resolve(from).substr(1);
                    to = exports.resolve(to).substr(1);
                    function trim(arr) {
                        var start = 0;
                        for (; start < arr.length; start++) {
                            if (arr[start] !== '')
                                break;
                        }
                        var end = arr.length - 1;
                        for (; end >= 0; end--) {
                            if (arr[end] !== '')
                                break;
                        }
                        if (start > end)
                            return [];
                        return arr.slice(start, end - start + 1);
                    }
                    var fromParts = trim(from.split('/'));
                    var toParts = trim(to.split('/'));
                    var length = Math.min(fromParts.length, toParts.length);
                    var samePartsLength = length;
                    for (var i = 0; i < length; i++) {
                        if (fromParts[i] !== toParts[i]) {
                            samePartsLength = i;
                            break;
                        }
                    }
                    var outputParts = [];
                    for (var i = samePartsLength; i < fromParts.length; i++) {
                        outputParts.push('..');
                    }
                    outputParts = outputParts.concat(toParts.slice(samePartsLength));
                    return outputParts.join('/');
                };
            }(require('__browserify_process')));
        },
        { '__browserify_process': 17 }
    ],
    13: [
        function (require, module, exports) {
            /* -*- Mode: js; js-indent-level: 2; -*- */
            /*
             * Copyright 2011 Mozilla Foundation and contributors
             * Licensed under the New BSD license. See LICENSE or:
             * http://opensource.org/licenses/BSD-3-Clause
             */
            if (typeof define !== 'function') {
                var define = require('amdefine')(module);
            }
            define(function (require, exports, module) {
                /**
                 * Recursive implementation of binary search.
                 *
                 * @param aLow Indices here and lower do not contain the needle.
                 * @param aHigh Indices here and higher do not contain the needle.
                 * @param aNeedle The element being searched for.
                 * @param aHaystack The non-empty array being searched.
                 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
                 */
                function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare) {
                    // This function terminates when one of the following is true:
                    //
                    //   1. We find the exact element we are looking for.
                    //
                    //   2. We did not find the exact element, but we can return the next
                    //      closest element that is less than that element.
                    //
                    //   3. We did not find the exact element, and there is no next-closest
                    //      element which is less than the one we are searching for, so we
                    //      return null.
                    var mid = Math.floor((aHigh - aLow) / 2) + aLow;
                    var cmp = aCompare(aNeedle, aHaystack[mid]);
                    if (cmp === 0) {
                        // Found the element we are looking for.
                        return aHaystack[mid];
                    } else if (cmp > 0) {
                        // aHaystack[mid] is greater than our needle.
                        if (aHigh - mid > 1) {
                            // The element is in the upper half.
                            return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare);
                        }
                        // We did not find an exact match, return the next closest one
                        // (termination case 2).
                        return aHaystack[mid];
                    } else {
                        // aHaystack[mid] is less than our needle.
                        if (mid - aLow > 1) {
                            // The element is in the lower half.
                            return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare);
                        }
                        // The exact needle element was not found in this haystack. Determine if
                        // we are in termination case (2) or (3) and return the appropriate thing.
                        return aLow < 0 ? null : aHaystack[aLow];
                    }
                }
                /**
                 * This is an implementation of binary search which will always try and return
                 * the next lowest value checked if there is no exact hit. This is because
                 * mappings between original and generated line/col pairs are single points,
                 * and there is an implicit region between each of them, so a miss just means
                 * that you aren't on the very start of a region.
                 *
                 * @param aNeedle The element you are looking for.
                 * @param aHaystack The array that is being searched.
                 * @param aCompare A function which takes the needle and an element in the
                 *     array and returns -1, 0, or 1 depending on whether the needle is less
                 *     than, equal to, or greater than the element, respectively.
                 */
                exports.search = function search(aNeedle, aHaystack, aCompare) {
                    return aHaystack.length > 0 ? recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare) : null;
                };
            });
        },
        { 'amdefine': 16 }
    ],
    12: [
        function (require, module, exports) {
            /* -*- Mode: js; js-indent-level: 2; -*- */
            /*
             * Copyright 2011 Mozilla Foundation and contributors
             * Licensed under the New BSD license. See LICENSE or:
             * http://opensource.org/licenses/BSD-3-Clause
             */
            if (typeof define !== 'function') {
                var define = require('amdefine')(module);
            }
            define(function (require, exports, module) {
                /**
                 * This is a helper function for getting values from parameter/options
                 * objects.
                 *
                 * @param args The object we are extracting values from
                 * @param name The name of the property we are getting.
                 * @param defaultValue An optional value to return if the property is missing
                 * from the object. If this is not specified and the property is missing, an
                 * error will be thrown.
                 */
                function getArg(aArgs, aName, aDefaultValue) {
                    if (aName in aArgs) {
                        return aArgs[aName];
                    } else if (arguments.length === 3) {
                        return aDefaultValue;
                    } else {
                        throw new Error('"' + aName + '" is a required argument.');
                    }
                }
                exports.getArg = getArg;
                function join(aRoot, aPath) {
                    return aPath.charAt(0) === '/' ? aPath : aRoot.replace(/\/$/, '') + '/' + aPath;
                }
                exports.join = join;
                /**
                 * Because behavior goes wacky when you set `__proto__` on objects, we
                 * have to prefix all the strings in our set with an arbitrary character.
                 *
                 * See https://github.com/mozilla/source-map/pull/31 and
                 * https://github.com/mozilla/source-map/issues/30
                 *
                 * @param String aStr
                 */
                function toSetString(aStr) {
                    return '$' + aStr;
                }
                exports.toSetString = toSetString;
                function relative(aRoot, aPath) {
                    aRoot = aRoot.replace(/\/$/, '');
                    return aPath.indexOf(aRoot + '/') === 0 ? aPath.substr(aRoot.length + 1) : aPath;
                }
                exports.relative = relative;
            });
        },
        { 'amdefine': 16 }
    ],
    14: [
        function (require, module, exports) {
            /* -*- Mode: js; js-indent-level: 2; -*- */
            /*
             * Copyright 2011 Mozilla Foundation and contributors
             * Licensed under the New BSD license. See LICENSE or:
             * http://opensource.org/licenses/BSD-3-Clause
             *
             * Based on the Base 64 VLQ implementation in Closure Compiler:
             * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
             *
             * Copyright 2011 The Closure Compiler Authors. All rights reserved.
             * Redistribution and use in source and binary forms, with or without
             * modification, are permitted provided that the following conditions are
             * met:
             *
             *  * Redistributions of source code must retain the above copyright
             *    notice, this list of conditions and the following disclaimer.
             *  * Redistributions in binary form must reproduce the above
             *    copyright notice, this list of conditions and the following
             *    disclaimer in the documentation and/or other materials provided
             *    with the distribution.
             *  * Neither the name of Google Inc. nor the names of its
             *    contributors may be used to endorse or promote products derived
             *    from this software without specific prior written permission.
             *
             * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
             * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
             * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
             * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
             * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
             * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
             * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
             * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
             * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
             * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
             * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
             */
            if (typeof define !== 'function') {
                var define = require('amdefine')(module);
            }
            define(function (require, exports, module) {
                var base64 = require('./base64');
                // A single base 64 digit can contain 6 bits of data. For the base 64 variable
                // length quantities we use in the source map spec, the first bit is the sign,
                // the next four bits are the actual value, and the 6th bit is the
                // continuation bit. The continuation bit tells us whether there are more
                // digits in this value following this digit.
                //
                //   Continuation
                //   |    Sign
                //   |    |
                //   V    V
                //   101011
                var VLQ_BASE_SHIFT = 5;
                // binary: 100000
                var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
                // binary: 011111
                var VLQ_BASE_MASK = VLQ_BASE - 1;
                // binary: 100000
                var VLQ_CONTINUATION_BIT = VLQ_BASE;
                /**
                 * Converts from a two-complement value to a value where the sign bit is
                 * is placed in the least significant bit.  For example, as decimals:
                 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
                 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
                 */
                function toVLQSigned(aValue) {
                    return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
                }
                /**
                 * Converts to a two-complement value from a value where the sign bit is
                 * is placed in the least significant bit.  For example, as decimals:
                 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
                 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
                 */
                function fromVLQSigned(aValue) {
                    var isNegative = (aValue & 1) === 1;
                    var shifted = aValue >> 1;
                    return isNegative ? -shifted : shifted;
                }
                /**
                 * Returns the base 64 VLQ encoded value.
                 */
                exports.encode = function base64VLQ_encode(aValue) {
                    var encoded = '';
                    var digit;
                    var vlq = toVLQSigned(aValue);
                    do {
                        digit = vlq & VLQ_BASE_MASK;
                        vlq >>>= VLQ_BASE_SHIFT;
                        if (vlq > 0) {
                            // There are still more digits in this value, so we must make sure the
                            // continuation bit is marked.
                            digit |= VLQ_CONTINUATION_BIT;
                        }
                        encoded += base64.encode(digit);
                    } while (vlq > 0);
                    return encoded;
                };
                /**
                 * Decodes the next base 64 VLQ value from the given string and returns the
                 * value and the rest of the string.
                 */
                exports.decode = function base64VLQ_decode(aStr) {
                    var i = 0;
                    var strLen = aStr.length;
                    var result = 0;
                    var shift = 0;
                    var continuation, digit;
                    do {
                        if (i >= strLen) {
                            throw new Error('Expected more digits in base 64 VLQ value.');
                        }
                        digit = base64.decode(aStr.charAt(i++));
                        continuation = !!(digit & VLQ_CONTINUATION_BIT);
                        digit &= VLQ_BASE_MASK;
                        result = result + (digit << shift);
                        shift += VLQ_BASE_SHIFT;
                    } while (continuation);
                    return {
                        value: fromVLQSigned(result),
                        rest: aStr.slice(i)
                    };
                };
            });
        },
        {
            './base64': 19,
            'amdefine': 16
        }
    ],
    15: [
        function (require, module, exports) {
            /* -*- Mode: js; js-indent-level: 2; -*- */
            /*
             * Copyright 2011 Mozilla Foundation and contributors
             * Licensed under the New BSD license. See LICENSE or:
             * http://opensource.org/licenses/BSD-3-Clause
             */
            if (typeof define !== 'function') {
                var define = require('amdefine')(module);
            }
            define(function (require, exports, module) {
                var util = require('./util');
                /**
                 * A data structure which is a combination of an array and a set. Adding a new
                 * member is O(1), testing for membership is O(1), and finding the index of an
                 * element is O(1). Removing elements from the set is not supported. Only
                 * strings are supported for membership.
                 */
                function ArraySet() {
                    this._array = [];
                    this._set = {};
                }
                /**
                 * Static method for creating ArraySet instances from an existing array.
                 */
                ArraySet.fromArray = function ArraySet_fromArray(aArray) {
                    var set = new ArraySet();
                    for (var i = 0, len = aArray.length; i < len; i++) {
                        set.add(aArray[i]);
                    }
                    return set;
                };
                /**
                 * Add the given string to this set.
                 *
                 * @param String aStr
                 */
                ArraySet.prototype.add = function ArraySet_add(aStr) {
                    if (this.has(aStr)) {
                        // Already a member; nothing to do.
                        return;
                    }
                    var idx = this._array.length;
                    this._array.push(aStr);
                    this._set[util.toSetString(aStr)] = idx;
                };
                /**
                 * Is the given string a member of this set?
                 *
                 * @param String aStr
                 */
                ArraySet.prototype.has = function ArraySet_has(aStr) {
                    return Object.prototype.hasOwnProperty.call(this._set, util.toSetString(aStr));
                };
                /**
                 * What is the index of the given string in the array?
                 *
                 * @param String aStr
                 */
                ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
                    if (this.has(aStr)) {
                        return this._set[util.toSetString(aStr)];
                    }
                    throw new Error('"' + aStr + '" is not in the set.');
                };
                /**
                 * What is the element at the given index?
                 *
                 * @param Number aIdx
                 */
                ArraySet.prototype.at = function ArraySet_at(aIdx) {
                    if (aIdx >= 0 && aIdx < this._array.length) {
                        return this._array[aIdx];
                    }
                    throw new Error('No element indexed by ' + aIdx);
                };
                /**
                 * Returns the array representation of this set (which has the proper indices
                 * indicated by indexOf). Note that this is a copy of the internal array used
                 * for storing the members so that no one can mess with internal state.
                 */
                ArraySet.prototype.toArray = function ArraySet_toArray() {
                    return this._array.slice();
                };
                exports.ArraySet = ArraySet;
            });
        },
        {
            './util': 12,
            'amdefine': 16
        }
    ],
    19: [
        function (require, module, exports) {
            /* -*- Mode: js; js-indent-level: 2; -*- */
            /*
             * Copyright 2011 Mozilla Foundation and contributors
             * Licensed under the New BSD license. See LICENSE or:
             * http://opensource.org/licenses/BSD-3-Clause
             */
            if (typeof define !== 'function') {
                var define = require('amdefine')(module);
            }
            define(function (require, exports, module) {
                var charToIntMap = {};
                var intToCharMap = {};
                'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach(function (ch, index) {
                    charToIntMap[ch] = index;
                    intToCharMap[index] = ch;
                });
                /**
                 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
                 */
                exports.encode = function base64_encode(aNumber) {
                    if (aNumber in intToCharMap) {
                        return intToCharMap[aNumber];
                    }
                    throw new TypeError('Must be between 0 and 63: ' + aNumber);
                };
                /**
                 * Decode a single base 64 digit to an integer.
                 */
                exports.decode = function base64_decode(aChar) {
                    if (aChar in charToIntMap) {
                        return charToIntMap[aChar];
                    }
                    throw new TypeError('Not a valid base 64 digit: ' + aChar);
                };
            });
        },
        { 'amdefine': 16 }
    ]
}, {}, [
    'CCiCNi',
    'o9QCoL',
    'R8Ba+v',
    'WEt/eN',
    'h+sAzN',
    'fLaY4S',
    'yhbTZ0'
]);
;