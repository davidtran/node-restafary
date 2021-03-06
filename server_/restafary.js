'use strict';

var DIR = './';
var fs = require('fs');
var path = require('path');
var jonny = require('jonny');
var mellow = require('mellow');
var ponse = require('ponse');
var WIN = process.platform === 'win32';
var CWD = process.cwd();
var isTextPath = require('is-text-path');
var Fs = {};

['get', 'put', 'patch', 'delete'].forEach(function (name) {
    Fs[name] = require(DIR + 'fs/' + name);
});

module.exports = function (options) {
    return middle.bind(null, options || {});
};

function middle(options, request, response, next) {
    var req = request;
    var res = response;
    var isFile = /^\/restafary\.js/.test(req.url);
    var prefix = options.prefix || '/fs';
    var root = options.root || '/';

    var params = {
        root: root,
        request: request,
        response: response
    };

    var name = ponse.getPathName(req);
    var is = !name.indexOf(prefix);

    if (isFile) sendFile(req, res);else if (!is) {
        next();
    } else {
        name = name.replace(prefix, '') || '/';

        params.name = name;

        onFS(params, function (error, options, data) {
            params.gzip = !error;

            if (options.name) params.name = options.name;

            if (options.gzip !== undefined) params.gzip = options.gzip;

            if (options.query) params.query = options.query;

            if (error) return ponse.sendError(error, params);

            if (!data) data = getMsg(name, req);

            ponse.send(data, params);
        });
    }
}

function sendFile(request, response) {
    var url = request.url;
    var name = path.join(__dirname, '..', 'dist', url);

    ponse.sendFile({
        name: name,
        gzip: true,
        request: request,
        response: response
    });
}

function getMsg(name, req) {
    var msg = void 0;
    var query = ponse.getQuery(req);
    var method = req.method.toLowerCase();

    name = path.basename(name);

    if (method !== 'put') {
        msg = method;
    } else {
        if (query === 'dir') msg = 'make dir';else msg = 'save';
    }

    msg = format(msg, name);

    return msg;
}

function checkPath(name, root) {
    var drive = name.split('/')[1];
    var isRoot = root === '/';
    var isDrive = /^[a-z]$/i.test(drive);

    var ok = !WIN || !isRoot || isDrive;

    return ok;
}

function onFS(params, callback) {
    var pathError = 'Could not write file/create directory in root on windows!';
    var p = params;
    var name = p.name;
    var query = ponse.getQuery(p.request);

    var optionsDefaults = {
        gzip: false,
        name: '.txt'
    };

    var root = void 0;
    if (typeof params.root === 'function') root = params.root();else root = params.root;

    root = handleDotFolder(root);
    var rootWin = root.replace('/', '\\');
    var pathOS = mellow.pathToWin(name, root);
    var pathWeb = path.join(root, name);

    if (WIN && pathWeb.indexOf(rootWin) || !WIN && pathWeb.indexOf(root)) return callback(Error('Path ' + pathWeb + ' beyond root ' + root + '!'), optionsDefaults);

    switch (p.request.method) {
        case 'PUT':
            if (!checkPath(name, root)) callback(pathError, optionsDefaults);else Fs.put(query, pathOS, p.request, function (error) {
                callback(error, optionsDefaults);
            });
            break;

        case 'PATCH':
            Fs.patch(path, p.request, function (error) {
                callback(error, optionsDefaults);
            });
            break;

        case 'GET':
            Fs.get(query, pathOS, function (error, data) {
                onGet({
                    error: error,
                    name: p.name,
                    path: pathOS,
                    query: query,
                    request: p.request,
                    response: p.response,
                    data: data
                }, callback);
            });
            break;

        case 'DELETE':
            Fs.delete(query, pathOS, p.request, function (error) {
                callback(error, optionsDefaults);
            });
            break;
    }
}

function onGet(p, callback) {
    var options = {};
    var isFile = p.error && p.error.code === 'ENOTDIR';
    var isStr = typeof p.data === 'string';

    var params = {
        gzip: true,
        name: p.path,
        request: p.request,
        response: p.response
    };

    if (isFile) return fs.realpath(p.path, function (error, path) {
        if (!error) params.name = path;

        params.gzip = false;
        ponse.sendFile(params);
    });

    if (p.error) return callback(p.error, options);

    if (/^(size|time|hash|beautify|minify)$/.test(p.query)) return callback(p.error, options, String(p.data));

    p.data.path = addSlashToEnd(p.name);

    p.data.files.forEach(function (file) {
        var path = p.data.path + file.name;
        file.isText = isTextPath(path);
    });

    if (p.name === '/') p.name += 'fs';

    options = {
        name: p.name + 'fs.json',
        query: p.query
    };

    var str = void 0;
    if (isStr) str = p.data;else str = jonny.stringify(p.data, null, 4);

    callback(p.error, options, str);
}

function format(msg, name) {
    var status = 'ok';

    if (name) name = '("' + name + '")';

    return msg + ': ' + status + name;
}

function addSlashToEnd(path) {
    if (!path) return path;

    var length = path.length - 1;
    var isSlash = path[length] === '/';

    if (!isSlash) path += '/';

    return path;
}

function handleDotFolder(root) {
    return root.replace(/^\.(\/|\\|$)/, CWD);
}