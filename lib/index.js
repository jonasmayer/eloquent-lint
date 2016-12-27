import absolute from "absolute";
import assert from "assert";
import clone from "clone";
import fs from "co-fs-extra";
import is from "is";
import path from "path";
import readdir from "recursive-readdir";
import thunkify from "thunkify";
import unyield from "unyield";
import utf8 from "is-utf8";
import Ware from "ware";
import os from "os";
import _ from "lodash";

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
Eloquent.prototype.path = function (...args) {
    const paths = [].slice.call(args);
    paths.unshift(this.getDirectory());
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
Eloquent.prototype.read = unyield(function* (dir = this.getSource()) {
    const read = this.readFile.bind(this);
    const concurrency = this.getConcurrency();
    const ignores = this.getIgnore() || null;
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
    const ret = {};
    const filePath = this.getAbsolutePath(file);

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
    console.log(`${fileName} - ${line}:${column} ${message}`);
};

export default Eloquent;
