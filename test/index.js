
var assert = require('assert');
var equal = require('assert-dir-equal');
var exec = require('child_process').exec;
var fs = require('fs');
var Eloquent = require('..');
var Mode = require('stat-mode');
var noop = function(){};
var path = require('path');
var rm = require('rimraf').sync;
var fixture = path.resolve.bind(path, __dirname, 'fixtures');
var path = require('path');


describe('Eloquent', function(){
	beforeEach(function(){
		rm('test/tmp');
	});
  
    it('should expose a constructor', function(){
		assert.equal(typeof Eloquent, 'function');
	});
	
	describe('#read', function(){
		it('should read from a source directory', function(done){
		  var m = Eloquent(fixture('read'));
		  var stats = fs.statSync(fixture('read'+path.sep+'src'+path.sep+'index.md'));
		  m.read(function(err, files){
			if (err) return done(err);
			
			var fileExpected = {};
			fileExpected['src'+path.sep+'index.md'] = {contents: 'body', lines: ["body"]};
			
			assert.deepEqual(files, fileExpected);
			done();
		  });
		});
	});
	
	
	describe('#plugin', function(){
		it('should apply a plugin', function(done){
			var m = Eloquent('test/tmp');
			
			function plugin(files, eloquent, done){
				assert.equal(files[0].fileName.contents, 'text');
				assert.equal(m, eloquent);
				assert.equal(typeof done, 'function');
				done();
			}
			
			m.use(plugin);
			m.run([{fileName: {contents: 'text'}}], function(err, files, eloquent){
				if (err) return done(err); 
				done();	
			});
		});
		
		it('should print a message when a plugin calls', function(done){
			var messages = "";
			Eloquent.prototype.addMessage = function(message){
				messages = messages + message;
			};
			
			var m = Eloquent('test/tmp');
						
			function plugin(text,  eloquent, done){
				assert.equal(text.fileName, 'text');
				//'assert.equal(fileName, 'fileName');
				assert.equal(m, eloquent);
				m.addMessage('messages');
				done();
			}
			
			m.use(plugin);
			m.run({ fileName: 'text' }, function(err, files, eloquent){
				if (err) return done(err); 
				assert.equal(messages, 'messages');
				done();	
			});
		});
	});
});	