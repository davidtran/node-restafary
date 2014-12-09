(function() {
    'use strict';
    
    var DIR             = '../',
        
        readStream      = require('fs').createReadStream,
        check           = require('checkup'),
        minify          = require('minify'),
        
        mellow          = require('mellow'),
        flop            = require('flop'),
        files           = require('files-io'),
        ashify          = require('ashify'),
        
        beautify        = require(DIR + 'beautify');
    
    module.exports      = function(query, name, callback) {
        var hashStream, error;
        
        check(arguments, ['query', 'name', 'callback']);
        
        switch (query) {
        default:
            mellow.read(name, callback);
            break;
        
        case 'size':
            flop.read(name, 'size', callback);
            break;
            
        case 'time':
            flop.read(name, 'time', callback);
            break;
        
        case 'beautify':
            beautify(name, callback);
            break;
        
        case 'minify':
            minify(name, callback);
            break;
        
        case 'hash':
            ashify(readStream(name), {algorithm: 'sha1', encoding:'hex'}, callback);
            break;
        }
    };
})();