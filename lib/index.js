var absolute = require('absolute');
var assert = require('assert');
var clone = require('clone');
var fs = require('co-fs-extra');
var is = require('is');
var matter = require('gray-matter');
var Mode = require('stat-mode');
var path = require('path');
var readdir = require('recursive-readdir');
var rm = require('rimraf');
var thunkify = require('thunkify');
var unyield = require('unyield');
var utf8 = require('is-utf8');
var Ware = require('ware');
var os = require('os');

/**
 * Thunks.
 */

readdir = thunkify(readdir);
rm = thunkify(rm);

/**
 * Export `Eloquent`.
 */

module.exports = Eloquent;

/**
 * Initialize a new `Eloquent` builder with a working `directory`.
 *
 * @param {String} directory
 */

function Eloquent(directory){
  if (!(this instanceof Eloquent)) return new Eloquent(directory);
  assert(directory, 'You must pass a working directory path.');
  this.plugins = [];
  this.ignores = [];
  this.directory(directory);
  this.metadata({});
  this.source('.');
  this.concurrency(Infinity);
}

/**
 * Add a `plugin` function to the stack.
 *
 * @param {Function or Array} plugin
 * @return {Eloquent}
 */

Eloquent.prototype.use = function(plugin){
  this.plugins.push(plugin);
  return this;
};

/**
 * Get or set the working `directory`.
 *
 * @param {Object} directory
 * @return {Object or Eloquent}
 */

Eloquent.prototype.directory = function(directory){
  if (!arguments.length) return path.resolve(this._directory);
  assert(is.string(directory), 'You must pass a directory path string.');
  this._directory = directory;
  return this;
};

/**
 * Get or set the global `metadata` to pass to templates.
 *
 * @param {Object} metadata
 * @return {Object or Eloquent}
 */

Eloquent.prototype.metadata = function(metadata){
  if (!arguments.length) return this._metadata;
  assert(is.object(metadata), 'You must pass a metadata object.');
  this._metadata = clone(metadata);
  return this;
};

/**
 * Get or set the source directory.
 *
 * @param {String} path
 * @return {String or Eloquent}
 */

Eloquent.prototype.source = function(path){
  if (!arguments.length) return this.path(this._source);
  assert(is.string(path), 'You must pass a source path string.');
  this._source = path;
  return this;
};


/**
 * Get or set the maximum number of files to open at once.
 *
 * @param {Number} max
 * @return {Number or Eloquent}
 */

Eloquent.prototype.concurrency = function(max){
  if (!arguments.length) return this._concurrency;
  assert(is.number(max), 'You must pass a number for concurrency.');
  this._concurrency = max;
  return this;
};

/**
 * Add a file or files to the list of ignores.
 *
 * @param {String or Strings} The names of files or directories to ignore.
 * @return {Eloquent}
 */
Eloquent.prototype.ignore = function(files){
  if (!arguments.length) return this.ignores.slice();
  this.ignores = this.ignores.concat(files);
  return this;
};

/**
 * Resolve `paths` relative to the root directory.
 *
 * @param {String} paths...
 * @return {String}
 */

Eloquent.prototype.path = function(){
  var paths = [].slice.call(arguments);
  paths.unshift(this.directory());
  return path.resolve.apply(path, paths);
};

/**
 * Process files through plugins without writing out files.
 *
 * @return {Object}
 */

Eloquent.prototype.process = unyield(function*(){
  var files = yield this.read();
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

Eloquent.prototype.run = unyield(function*(files, plugins){
    var ware = new Ware(plugins || this.plugins);
    var run = thunkify(ware.run.bind(ware));
    var res = yield run(files, this);
    return res[0];
});

/**
 * Read a dictionary of files from a `dir`, parsing frontmatter. If no directory
 * is provided, it will default to the source directory.
 *
 * @param {String} dir (optional)
 * @return {Object}
 */

Eloquent.prototype.read = unyield(function*(dir){
  dir = dir || this.source();
  var read = this.readFile.bind(this);
  var concurrency = this.concurrency();
  var ignores = this.ignores || null;
  var paths = yield readdir(dir, ignores);
  var files = [];
  var complete = 0;
  var batch;

  while (complete < paths.length) {
    batch = paths.slice(complete, complete + concurrency);
    batch = yield batch.map(read);
    files = files.concat(batch);
    complete += concurrency;
  }

  return paths.reduce(memoizer, {});

  function memoizer(memo, file, i) {
    file = path.relative(dir, file);
    memo[file] = files[i];
    return memo;
  }
});

/**
 * Read a `file` by path. If the path is not absolute, it will be resolved
 * relative to the source directory.
 *
 * @param {String} file
 * @return {Object}
 */

Eloquent.prototype.readFile = unyield(function*(file){
  var src = this.source();
  var ret = {};

  if (!absolute(file)) file = path.resolve(src, file);

  try {
    //var frontmatter = this.frontmatter();
    var stats = yield fs.stat(file);
    var buffer = yield fs.readFile(file);
    var parsed;
	
 
    /*if (frontmatter && utf8(buffer)) {
      try {
        parsed = matter(buffer.toString());
      } catch (e) {
        var err = new Error('Invalid frontmatter in the file at: ' + file);
        err.code = 'invalid_frontmatter';
        throw err;
      }

      ret = parsed.data;
      ret.contents = new Buffer(parsed.content);
    } else {*/
        if(utf8(buffer)){
           ret.contents = buffer.toString('utf8');
           ret.lines = buffer.toString('utf8').split(os.EOL);
        }else{
            ret.contents = buffer.toString();
            ret.lines = buffer.toString().split(os.EOL);
        }
    //}

    //ret.mode = Mode(stats).toOctal();
    //ret.stats = stats;
  } catch (e) {
    e.message = 'Failed to read the file at: ' + file + '\n\n' + e.message;
    e.code = 'failed_read';
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
Eloquent.prototype.printMessage = function(fileName, line, column, message){
	assert(is.number(line), 'line must be a number');
	assert(is.number(column), 'column must be a number');
	console.log(fileName + " - " + line + ":" + column + " " + message);
};
