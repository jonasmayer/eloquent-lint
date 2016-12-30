const _ = require("lodash");
const Eloquent = require("../build/eloquent").default;

const example = function () {
    return function (files, eloquent, done) {
        _.forEach(files, (file, fileName) => {
            _.forEach(file.lines, (line, index) => {
                const patt = new RegExp("e", "g");
                let match = patt.exec(line);
                while (match != null) {
                    eloquent.printMessage(fileName, index + 1, match.index + 1, "You have a 'e' in ", line.substring(match.index - 10, match.index + 10));
                    match = patt.exec(line);
                }
            });
        });
        done();
    };
};

Eloquent("./example/sample")
    .use(example())
    .process((e) => {
        if (e) {
            throw e;
        }
    });
