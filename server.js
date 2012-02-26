#!/usr/bin/env node

var express = require('express'),
	_ = require('underscore'),
	issueDao = require('./lib/issueDao'),
	projectDao = require('./lib/projectDao'),
	tracker = require('./lib/tracker');

// command line parameters
var argv = require('optimist')
	.options('port', {
		alias: 'p',
		default: 1337
	})
	.options('password', {
		alias: 'pass',
		default: 'admin'
	})
	.options('optimized', {
		alias: 'opt',
		default: false
	})
	.argv;

var port = process.env.app_port || argv.port;
var password = process.env.admin_pass || argv.password;
// run with --optimized to use 'public-built/' directory
// build 'public-built/' using 'node r.js -o app.build.js'
var www_public = argv.optimized ? '/public-built' : '/public';

var db_dir = __dirname + '/db/';
if (process.env['NODE_ENV'] === 'nodester') {
	db_dir = __dirname + '/'; // override due to https://github.com/nodester/nodester/issues/313
}
projectDao.init(db_dir);
issueDao.init(db_dir);

var app = express.createServer(
	express.logger(),
	express.cookieParser(),
	express.session({ secret: 'nyan cat' }), // for flash messages
	express.static(__dirname + www_public),
	express.bodyParser(),
	express.methodOverride()
);
app.set('views', __dirname + '/views');
app.register('.html', require('ejs')); // call our views html
app.use(app.router);
app.listen(port);

app.get('/', function (req, res) {
	var unlistedCount = projectDao.findUnlisted().length;
	res.render('index.html', { projects: projectDao.findListed(), unlisted: unlistedCount });
});
app.post('/project', function (req, res) {
	var name = req.body.projectName;
	if (!name) {
		res.json({ error: 'empty' }, 400);
		return;
	} else if (!projectDao.isValidName(name)) {
		res.json({ error: 'invalid' }, 400);
		return;
	}

	if (projectDao.exists(name)) {
		res.json({ error: 'exists', url: '/project/'  + projectDao.getSlug(name) }, 409); // Conflict
	} else {
		var created = projectDao.create(name, !!req.body.unlisted);
		tracker.listen(created);
		var message = created.unlisted ? "Here's your project. Remember: it's unlisted, so nobody'll find it unless you share the address." : "Here's your project. Love, Ω";
		req.flash('info', message);
		res.json({ url: '/project/' + created.slug });
	}
});
app.get('/project', function (req, res) {
	res.end('Nothing to see here. Try /project/<name>');
});
app.get('/project/:slug', function (req, res) {
	var project = projectDao.find(req.params.slug);
	if (project && !project.deleted) {
		var flash = req.flash('info');
		var message = flash.length ? _.first(flash) : null;

		res.render('project.html', { title: project.name, flash: message });
	} else if (project && project.deleted) {
		res.writeHead(410); // Gone
		res.end('Project deleted');
	} else {
		res.writeHead(404);
		res.end('No such project');
	}
});

var auth = express.basicAuth('admin', password);

app.delete('/project/:slug', auth, function (req, res) {
	console.log('trying to delete ' + req.params.slug);
	projectDao.remove(req.params.slug);
	res.redirect('back');
});

app.get('/admin', auth, function (req, res) {
	res.render('admin.html', { projects: JSON.stringify(projectDao.findAll()) });
});

tracker.init(app);

console.log('Ω running on port ' + port);

