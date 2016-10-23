const assert = require("assert");
const path = require("path");
const rm = require("rimraf").sync;
const Eloquent = require("..");

const fixture = path.resolve.bind(path, __dirname, "fixtures");

describe("Eloquent", () => {
    beforeEach(() => {
        rm("test/tmp");
    });

    it("should expose a constructor", () => {
        assert.equal(typeof Eloquent, "function");
    });

    describe("#read", () => {
        it("should read from a source directory", (done) => {
            const m = Eloquent(fixture("read"));
            m.read((err, files) => {
                if (err) {
                    done(err);
                }

                const fileExpected = {};
                fileExpected[`src${path.sep}index.md`] = { contents: "body", lines: ["body"] };

                assert.deepEqual(files, fileExpected);
                done();
            });
        });
    });


    describe("#plugin", () => {
        it("should apply a plugin", (done) => {
            const m = Eloquent("test/tmp");

            function plugin(files, eloquent, donePlugin) {
                assert.equal(files[0].fileName.contents, "text");
                assert.equal(m, eloquent);
                assert.equal(typeof donePlugin, "function");
                donePlugin();
            }

            m.use(plugin);
            m.run([{ fileName: { contents: "text" } }], (err) => {
                if (err) {
                    done(err);
                }
                done();
            });
        });

        it("should print a message when a plugin calls", (done) => {
            let messages = "";
            Eloquent.prototype.addMessage = function (message) {
                messages += message;
            };

            const m = Eloquent("test/tmp");

            function plugin(text, eloquent, donePlugin) {
                assert.equal(text.fileName, "text");
                assert.equal(m, eloquent);
                m.addMessage("messages");
                donePlugin();
            }

            m.use(plugin);
            m.run({ fileName: "text" }, (err) => {
                if (err) {
                    done(err);
                }
                assert.equal(messages, "messages");
                done();
            });
        });
    });
});
