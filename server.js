#!/usr/bin/env node

var express = require('express'),
	_ = require('underscore'),
	projectDao = require('./lib/projectDao'),
	tracker = require('./lib/tracker');

// command line parameters
var argv = require('optimist')
	.options('port', {
		alias: 'p',
		default: 1337
	})
	.options('optimized', {
		alias: 'opt',
		default: false
	})
	.argv;

var PORT = process.env.app_port || argv.port;
// run with --optimized to use 'public-built/' directory
// build 'public-built/' using 'node r.js -o app.build.js'
var www_public = argv.optimized ? '/public-built' : '/public';

var app = express.createServer(
	express.logger(),
	express.static(__dirname + www_public),
	express.bodyParser()
);
app.register('.html', require('ejs')); // call our views html
app.use(app.router);
app.listen(PORT);

app.get('/', function (req, res) {
	res.end('intro page where you create projects etc');
});
app.post('/project', function (req, res) {
	var name = req.body.projectName;
	if (!name) {
		res.json({ error: 'empty' }, 400);
		return;
	}

	if (projectDao.exists(name)) {
		res.json({ error: 'exists', url: '/project/'  + projectDao.getSlug(name) }, 409);
	} else {
		var created = projectDao.create(name);
		tracker.listen(created);
		res.json({ url: '/project/' + created.slug });
	}
});
app.get('/project', function(req, res) {
	res.end('Projects are unlisted. Try /project/<name>');
});
app.get('/project/:slug', function(req, res) {
	var project = projectDao.find(req.params.slug);
	if (project) {
		res.render('project.html', { title: project.name, layout: false });
	} else {
		res.writeHead(404);
		res.end('No such project');
	}
});

tracker.init(app);

console.log('Ω running on port ' + PORT);

