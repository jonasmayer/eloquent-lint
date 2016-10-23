const absolute = require("absolute");
const assert = require("assert");
const clone = require("clone");
const fs = require("co-fs-extra");
const is = require("is");
const path = require("path");
const readdir = require("recursive-readdir");
const thunkify = require("thunkify");
const unyield = require("unyield");
const utf8 = require("is-utf8");
const Ware = require("ware");
const os = require("os");
const _ = require("lodash");

const readdirThunkified = thunkify(readdir);

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
    this.directory(directory);
    this.metadata({});
    this.source(".");
    this.concurrency(Infinity);
}

/**
 * Add a `plugin` function to the stack.
 *
 * @param {Function or Array} plugin
 * @return {Eloquent}
 */
Eloquent.prototype.use = function (plugin) {
    this.plugins.push(plugin);
    return this;
};

/**
 * Get or set the working `directory`.
 *
 * @param {Object} directory
 * @return {Object or Eloquent}
 */
Eloquent.prototype.directory = function (directory) {
    if (!arguments.length) {
        return path.resolve(this._directory);
    }
    assert(is.string(directory), "You must pass a directory path string.");

    this._directory = directory;
    return this;
};

/**
 * Get or set the global `metadata` to pass to templates.
 *
 * @param {Object} metadata
 * @return {Object or Eloquent}
 */
Eloquent.prototype.metadata = function (metadata) {
    if (!arguments.length) {
        return this._metadata;
    }
    assert(is.object(metadata), "You must pass a metadata object.");
    this._metadata = clone(metadata);
    return this;
};

/**
 * Get or set the source directory.
 *
 * @param {String} path
 * @return {String or Eloquent}
 */
Eloquent.prototype.source = function (source) {
    if (!arguments.length) {
        return this.path(this._source);
    }
    assert(is.string(source), "You must pass a source path string.");

    this._source = source;
    return this;
};


/**
 * Get or set the maximum number of files to open at once.
 *
 * @param {Number} max
 * @return {Number or Eloquent}
 */

Eloquent.prototype.concurrency = function (max) {
    if (!arguments.length) {
        return this._concurrency;
    }
    assert(is.number(max), "You must pass a number for concurrency.");

    this._concurrency = max;
    return this;
};

/**
 * Add a file or files to the list of ignores.
 *
 * @param {String or Strings} The names of files or directories to ignore.
 * @return {Eloquent}
 */
Eloquent.prototype.ignore = function (files) {
    if (!arguments.length) {
        return this.ignores.slice();
    }
    this.ignores = this.ignores.concat(files);
    return this;
};

/**
 * Resolve `paths` relative to the root directory.
 *
 * @param {String} paths...
 * @return {String}
 */
Eloquent.prototype.path = function (...args) {
    const paths = [].slice.call(args);
    paths.unshift(this.directory());
    return path.resolve(...paths);
};

/**
 * Process files through plugins without writing out files.
 *
 * @return {Object}
 */
Eloquent.prototype.process = unyield(function* () {
    let files = yield this.read();
    files = yield this.run(files);
    return files;
});

/**
 * Run a set of `files` through the plugins stack.
 *
 * @param {Object} files
 * @param {Array} plugins
 * @return {Object}
 */
Eloquent.prototype.run = unyield(function* (files, plugins) {
    const ware = new Ware(plugins || this.plugins);
    const run = thunkify(ware.run.bind(ware));
    const res = yield run(files, this);
    return res[0];
});

/**
 * Read a dictionary of files from a `dir`, parsing frontmatter. If no directory
 * is provided, it will default to the source directory.
 *
 * @param {String} dir (optional)
 * @return {Object}
 */
Eloquent.prototype.read = unyield(function* (dir = this.source()) {
    const read = this.readFile.bind(this);
    const concurrency = this.concurrency();
    const ignores = this.ignores || null;
    const paths = yield readdirThunkified(dir, ignores);
    let files = [];
    let complete = 0;
    let batch;

    while (complete < paths.length) {
        batch = paths.slice(complete, complete + concurrency);
        batch = yield batch.map(read);
        files = files.concat(batch);
        complete += concurrency;
    }

    function memoizer(memo, file, i) {
        const relativePathFile = path.relative(dir, file);
        const newMemo = _.clone(memo);
        newMemo[relativePathFile] = files[i];
        return newMemo;
    }

    return paths.reduce(memoizer, {});
});

/**
 * Read a `file` by path. If the path is not absolute, it will be resolved
 * relative to the source directory.
 *
 * @param {String} file
 * @return {Object}
 */
Eloquent.prototype.readFile = unyield(function* (file) {
    const src = this.source();
    const ret = {};
    let filePath;

    if (!absolute(file)) {
        filePath = path.resolve(src, file);
    } else {
        filePath = file;
    }

    try {
        const buffer = yield fs.readFile(filePath);
        if (utf8(buffer)) {
            ret.contents = buffer.toString("utf8");
            ret.lines = buffer.toString("utf8").split(os.EOL);
        } else {
            ret.contents = buffer.toString();
            ret.lines = buffer.toString().split(os.EOL);
        }
    } catch (e) {
        e.message = `Failed to read the file at: ${file} \n\n ${e.message}`;
        e.code = "failed_read";
        throw e;
    }

    return ret;
});

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
    console.log(`${fileName} - ${line}:${column} ${message}`);
};

module.exports = Eloquent;
