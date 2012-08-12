// RequireJS Optimizer Configuration
//
// TODO-DH: update this for 1.0
// This is only recommended for *production* installations of Omega.
//
// To optimize: node r.js -o app.build.js
//
// Run Omega with the --optimize switch to use the new ./public-built directory.
//
({
	mainConfigFile: "./public/js/main.js",
	paths: {
		'jquery': 'empty:'               // override main.js
	},
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
