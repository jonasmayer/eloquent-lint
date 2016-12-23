'use strict';

module.exports = require('./lib');
"use strict";

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var absolute = require("absolute");
var assert = require("assert");
var clone = require("clone");
var fs = require("co-fs-extra");
var is = require("is");
var path = require("path");
var readdir = require("recursive-readdir");
var thunkify = require("thunkify");
var unyield = require("unyield");
var utf8 = require("is-utf8");
var Ware = require("ware");
var os = require("os");
var _ = require("lodash");

var readdirThunkified = thunkify(readdir);

/**
 * Initialize a new `Eloquent` builder with a working `directory`.
 *
 * @param {String} directory
 */
function Eloquent(directory) {
    if (!(this instanceof Eloquent)) {
        return new Eloquent(directory);
    }

    assert(directory, "You must pass a working directory path.");

    this.plugins = [];
    this.ignores = [];
    this.setDirectory(directory);
    this.setMetadata({});
    this.setSource(".");
    this.setConcurrency(Infinity);
}

Eloquent.prototype.setDirectory = function (directory) {
    assert(is.string(directory), "You must pass a directory path string.");
    this.directory = path.resolve(directory);
};

Eloquent.prototype.getDirectory = function () {
    return this.directory;
};

Eloquent.prototype.setMetadata = function (metadata) {
    assert(is.object(metadata), "You must pass a metadata object.");
    this.metadata = clone(metadata);
};

Eloquent.prototype.getMetadata = function () {
    return this.metadata;
};

Eloquent.prototype.setSource = function (source) {
    assert(is.string(source), "You must pass a source path string.");
    this.source = this.path(source);
};

Eloquent.prototype.getSource = function () {
    return this.source;
};

Eloquent.prototype.setConcurrency = function (max) {
    assert(is.number(max), "You must pass a number for concurrency.");
    this.concurrency = max;
};

Eloquent.prototype.getConcurrency = function () {
    return this.concurrency;
};

Eloquent.prototype.setIgnore = function (files) {
    this.ignores = this.ignores.concat(files);
};

Eloquent.prototype.getIgnore = function () {
    return this.ignores.slice();
};

/**
 * Add a `plugin` function to the stack.
 *
 * @param {Function or Array} plugin
 * @return {Eloquent}
 */
Eloquent.prototype.use = function (plugin) {
    assert(plugin, "You must pass a valid function");

    this.plugins.push(plugin);
    return this;
};

/**
 * Resolve `paths` relative to the root directory.
 *
 * @param {String} paths...
 * @return {String}
 */
Eloquent.prototype.path = function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
    }

    var paths = [].slice.call(args);
    paths.unshift(this.getDirectory());
    return path.resolve.apply(path, _toConsumableArray(paths));
};

/**
 * Process files through plugins without writing out files.
 *
 * @return {Object}
 */
Eloquent.prototype.process = unyield(regeneratorRuntime.mark(function _callee() {
    var files;
    return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    _context.next = 2;
                    return this.read();

                case 2:
                    files = _context.sent;
                    _context.next = 5;
                    return this.run(files);

                case 5:
                    files = _context.sent;
                    return _context.abrupt("return", files);

                case 7:
                case "end":
                    return _context.stop();
            }
        }
    }, _callee, this);
}));

/**
 * Run a set of `files` through the plugins stack.
 *
 * @param {Object} files
 * @param {Array} plugins
 * @return {Object}
 */
Eloquent.prototype.run = unyield(regeneratorRuntime.mark(function _callee2(files, plugins) {
    var ware, run, res;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
            switch (_context2.prev = _context2.next) {
                case 0:
                    ware = new Ware(plugins || this.plugins);
                    run = thunkify(ware.run.bind(ware));
                    _context2.next = 4;
                    return run(files, this);

                case 4:
                    res = _context2.sent;
                    return _context2.abrupt("return", res[0]);

                case 6:
                case "end":
                    return _context2.stop();
            }
        }
    }, _callee2, this);
}));

/**
 * Read a dictionary of files from a `dir`, parsing frontmatter. If no directory
 * is provided, it will default to the source directory.
 *
 * @param {String} dir (optional)
 * @return {Object}
 */
Eloquent.prototype.read = unyield(regeneratorRuntime.mark(function _callee3() {
    var dir = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.getSource();
    var read, concurrency, ignores, paths, files, complete, batch, memoizer;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
            switch (_context3.prev = _context3.next) {
                case 0:
                    memoizer = function memoizer(memo, file, i) {
                        var relativePathFile = path.relative(dir, file);
                        var newMemo = _.clone(memo);
                        newMemo[relativePathFile] = files[i];
                        return newMemo;
                    };

                    read = this.readFile.bind(this);
                    concurrency = this.getConcurrency();
                    ignores = this.getIgnore() || null;
                    _context3.next = 6;
                    return readdirThunkified(dir, ignores);

                case 6:
                    paths = _context3.sent;
                    files = [];
                    complete = 0;
                    batch = void 0;

                case 10:
                    if (!(complete < paths.length)) {
                        _context3.next = 19;
                        break;
                    }

                    batch = paths.slice(complete, complete + concurrency);
                    _context3.next = 14;
                    return batch.map(read);

                case 14:
                    batch = _context3.sent;

                    files = files.concat(batch);
                    complete += concurrency;
                    _context3.next = 10;
                    break;

                case 19:
                    return _context3.abrupt("return", paths.reduce(memoizer, {}));

                case 20:
                case "end":
                    return _context3.stop();
            }
        }
    }, _callee3, this);
}));

/**
 * Read a `file` by path. If the path is not absolute, it will be resolved
 * relative to the source directory.
 *
 * @param {String} file
 * @return {Object}
 */
Eloquent.prototype.readFile = unyield(regeneratorRuntime.mark(function _callee4(file) {
    var ret, filePath, buffer;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
            switch (_context4.prev = _context4.next) {
                case 0:
                    ret = {};
                    filePath = this.getAbsolutePath(file);
                    _context4.prev = 2;
                    _context4.next = 5;
                    return fs.readFile(filePath);

                case 5:
                    buffer = _context4.sent;

                    if (utf8(buffer)) {
                        ret.contents = buffer.toString("utf8");
                        ret.lines = buffer.toString("utf8").split(os.EOL);
                    } else {
                        ret.contents = buffer.toString();
                        ret.lines = buffer.toString().split(os.EOL);
                    }
                    _context4.next = 14;
                    break;

                case 9:
                    _context4.prev = 9;
                    _context4.t0 = _context4["catch"](2);

                    _context4.t0.message = "Failed to read the file at: " + file + " \n\n " + _context4.t0.message;
                    _context4.t0.code = "failed_read";
                    throw _context4.t0;

                case 14:
                    return _context4.abrupt("return", ret);

                case 15:
                case "end":
                    return _context4.stop();
            }
        }
    }, _callee4, this, [[2, 9]]);
}));

Eloquent.prototype.getAbsolutePath = function (file) {
    if (!absolute(file)) {
        return path.resolve(this.getSource(), file);
    }
    return file;
};

/**
 * Print messages for lints
 *
 * @param {Number} line
 * @param {Number} column
 * @param {String} message
 */
Eloquent.prototype.printMessage = function (fileName, line, column, message) {
    assert(is.number(line), "line must be a number");
    assert(is.number(column), "column must be a number");
    console.log(fileName + " - " + line + ":" + column + " " + message);
};

module.exports = Eloquent;

//# sourceMappingURL=eloquent.js.map