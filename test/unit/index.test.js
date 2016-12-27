import test from "ava";
import path from "path";
import sinon from "sinon";

import Eloquent from "../../index.js";

// constructor
test("Eloquent returns a constructor", (t) => {
    t.is(typeof Eloquent, "function");
});

test("Eloquent constructor should works", (t) => {
    Eloquent(".");
    t.pass();
});

test("Eloquent constructor should store directory", (t) => {
    const eloquent = Eloquent(".");
    t.deepEqual(eloquent.directory, path.resolve("."));
});

test.failing("Eloquent constructor should break if a directory isn't informed", () => {
    Eloquent();
});

// directory
test("set directory", (t) => {
    const eloquent = Eloquent(".");
    eloquent.setDirectory("directory");
    t.deepEqual(eloquent.directory, path.resolve("directory"));
});

test.failing("don't set invalid directory - null", () => {
    const eloquent = Eloquent(".");
    eloquent.setDirectory(null);
});

test.failing("don't set invalid directory - non-string", () => {
    const eloquent = Eloquent(".");
    eloquent.setDirectory(5);
});

test("get directory", (t) => {
    const eloquent = Eloquent(".");
    const directory = path.resolve("directory");
    eloquent.directory = directory;
    t.deepEqual(eloquent.getDirectory(), directory);
});

// metadata
test("set metadata", (t) => {
    const eloquent = Eloquent(".");
    const metadata = {
        metadata: "",
    };
    eloquent.setMetadata(metadata);
    t.deepEqual(eloquent.metadata, metadata);
});

test.failing("don't set invalid metadata", () => {
    const eloquent = Eloquent(".");
    eloquent.setMetadata(null);
});

test.failing("don't set invalid metadata", () => {
    const eloquent = Eloquent(".");
    eloquent.setMetadata("metadata");
});

test("get metadata", (t) => {
    const eloquent = Eloquent(".");
    const metadata = {
        metadata: "",
    };
    eloquent.metadata = metadata;
    t.deepEqual(eloquent.getMetadata(), metadata);
});

// source
test("set source", (t) => {
    const eloquent = Eloquent(".");
    eloquent.setSource("source");
    t.deepEqual(eloquent.source, path.resolve("source"));
});

test.failing("don't set invalid source", () => {
    const eloquent = Eloquent(".");
    eloquent.setSource(null);
});

test.failing("don't set invalid source", () => {
    const eloquent = Eloquent(".");
    eloquent.setSource(5);
});

test("get source", (t) => {
    const eloquent = Eloquent(".");
    const source = path.resolve("source");
    eloquent.source = source;
    t.deepEqual(eloquent.getSource(), source);
});

// concurrency
test("set concurrency", (t) => {
    const eloquent = Eloquent(".");
    eloquent.setConcurrency(0);
    t.is(eloquent.concurrency, 0);
});

test.failing("don't set invalid concurrency", () => {
    const eloquent = Eloquent(".");
    eloquent.setConcurrency(null);
});

test.failing("don't set invalid concurrency", () => {
    const eloquent = Eloquent(".");
    eloquent.setConcurrency("concurrency");
});

test("get concurrency", (t) => {
    const eloquent = Eloquent(".");
    eloquent.concurrency = 0;
    t.is(eloquent.getConcurrency(), 0);
});

// ignore
test("set ignore", (t) => {
    const eloquent = Eloquent(".");
    eloquent.setIgnore(["file"]);
    t.deepEqual(eloquent.ignores, ["file"]);
});

test("get ignore", (t) => {
    const eloquent = Eloquent(".");
    eloquent.ignores = "file";
    t.deepEqual(eloquent.getIgnore(), "file");
});

// use
test("Use function should add a valid plugin to the stack", (t) => {
    const plugin = function (files, eloquent, donePlugin) {
        donePlugin();
    };
    const eloquent = Eloquent(".");
    eloquent.use(plugin);
    t.true(eloquent.plugins.length > 0);
    t.deepEqual(eloquent.plugins[0], plugin);
});

test.failing("Use function shouldn't add a undefined value to the stack", () => {
    const eloquent = Eloquent(".");
    eloquent.use(null);
});

// path
test("Eloquent path method resolves paths relative to directory", (t) => {
    const eloquent = Eloquent(".");
    t.deepEqual(eloquent.path("path"), path.resolve("./path"));
});

// process
test.cb("process read and run files", (t) => {
    const eloquent = Eloquent(".");
    const files = ["files"];
    const read = sinon.stub(eloquent, "read").returns(files);
    const run = sinon.stub(eloquent, "run").returns(files);

    eloquent.process((err, resp) => {
        t.deepEqual(resp, files);
        t.true(read.called);
        t.true(run.called);
        t.end();
    });
});

test.cb("runs plugins with files", (t) => {
    const eloquent = Eloquent(".");
    const files = ["files1"];
    const plugin = function (filesArg, el, donePlugin) {
        filesArg.push("files2");
        donePlugin();
    };
    eloquent.run(files, [plugin], (err, resp) => {
        t.deepEqual(resp, ["files1", "files2"]);
        t.end();
    });
});

test("", (t) => {
    const eloquent = Eloquent(".");
    const expectedPath = "file";
    eloquent.getAbsolutePath(expectedPath);
    t.deepEqual(eloquent.getAbsolutePath("file"), path.resolve(".", expectedPath));
});

test("", (t) => {
    const eloquent = Eloquent(".");
    const expectedPath = path.resolve(".", "file");
    eloquent.getAbsolutePath(expectedPath);
    t.deepEqual(eloquent.getAbsolutePath("file"), expectedPath);
});
