var requirejs = require('requirejs');

var config = {
	"baseUrl": "public/js",
	"paths": {
		"underscore": "lib/underscore-min",
	},
	"shim": {
		"underscore": {
			"exports": "_"
		}
	},
	"nodeRequire": require
}

requirejs.config(config);

module.exports = requirejs;