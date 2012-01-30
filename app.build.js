// RequireJS Optimizer Configuration
//
// Docs: https://github.com/jrburke/r.js/blob/master/build/example.build.js
//
({
	// paths here override the settings in ./app/js/main.js
	paths: {
		'jquery': 'empty:'               // override main.js
	},
	mainConfigFile: "./public/js/main.js",
	appDir: "./public",
	baseUrl: "js",
	dir: "./public-built",
	modules: [
		{
			name: "main"
		}
	],
	//optimize: "none", // comment out to use uglify
	uglify: {
		toplevel: true,
		ascii_only: false,
		beautify: false
	},
	inlineText: true,
	preserveLicenseComments: true,
	findNestedDependencies: false
})
