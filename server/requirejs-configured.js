var requirejs = require('requirejs');

var config = {
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