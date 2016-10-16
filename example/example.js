var Eloquent = require('../lib');
var _ = require('lodash');

var tester = function(opts){

    return function(files, eloquent, done){
        _.forEach(files, function(file, fileName){
            _.forEach(file.lines, function(line, index){  
                var patt = new RegExp("e","g");
                var match = patt.exec(line);
                    while (match != null) {
                        eloquent.printMessage(fileName, index+1, match.index+1, "You have a 'e' in " + line.substring( match.index - 10, match.index + 10) );
                        match = patt.exec(line);
                    }
                });
            });
        done();
    }
}
  
 

Eloquent('./sample')
    .use(tester())
    .process(function(e,h){if (e){throw e;}});