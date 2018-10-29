var express = require('express'),
	_ = require('underscore'),
	Q = require('q'),
	http = require('http'),
	partial = require('express-partials'),
	flash = require('connect-flash'),

	historyDao = require('./lib/historyDao'),
	tracker = require('./lib/tracker'),
	Project = require('./lib/Project');

var methodOverride = require('method-override');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var basicAuth = require('basic-auth-connect');

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
	// TODO: get r.js optimizer going again and run on startup (according to NODE_ENV)
	.options('optimized', {
		alias: 'opt',
		default: false
	})
	.argv;

var version = require('../package.json').version;
var port = process.env.PORT || argv.port;
var password = process.env.admin_pass || argv.password;
var www_public = '/../public';

var projectDao, issueDao;

if (argv.redis) {
	var client = process.env.REDISTOGO_URL ? require('redis-url').connect(process.env.REDISTOGO_URL) : require('redis').createClient();
	var RedisProjectDao = require('./lib/RedisProjectDao');
	projectDao = new RedisProjectDao(client);
	var RedisIssueDao = require('./lib/RedisIssueDao');
	issueDao = new RedisIssueDao(client);
} else {
	var db_dir = __dirname + '/../db/';
	projectDao = require('./lib/projectDao');
	projectDao.init(db_dir);
	issueDao = require('./lib/issueDao');
	issueDao.init(db_dir);
}

var app = express();

if (app.get('env') === 'development') {
	console.log('Starting development server');

	var lessMiddleware = require('less-middleware');
	app.use(lessMiddleware({
		debug: true,
		src: __dirname + '/server',
		dest: __dirname + '/public'
	}));
}

app.set('views', __dirname + '/../views');
app.engine('.html', require('ejs').renderFile); // call our views html

app.use(morgan('combined'));
app.use(cookieParser());
app.use(cookieSession({ secret: 'nyan cat' })); // for flash messages
app.use(express.static(__dirname + www_public));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride(function (req, res) {
	if (req.body && typeof req.body === 'object' && '_method' in req.body) {
		// look in urlencoded POST bodies and delete it
		var method = req.body._method;
		delete req.body._method;
		return method;
	}
}));
app.use(partial());
app.use(flash());

var server = http.createServer(app);
tracker.init(server, projectDao, issueDao);
server.listen(port);

// TODO: extract routes elsewhere

app.get('/', function (req, res) {
	projectDao.findAll(function (err, projects) {
		var listed = [],
			unlisted = 0;
		_.each(projects, function (project) {
			if (!project.deleted) {
				if (project.unlisted) {
					unlisted++;
				} else {
					listed.push(project);
				}
			}
		});
		_.sortBy(listed, function (p) { return p.name; });
		res.render('index.html', viewOptions({
			projects: listed,
			unlisted: unlisted
		}));
	});
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

	projectDao.create(name, !!req.body.unlisted, function (err, project) {
		if (err) {
			if (err.message === 'project exists') {
				var url = '/project/' + Project.slugify(name);
				res.json({ error: 'exists', url: url }, 409);
				return;
			}
			throw err;
		}
		tracker.listen(project);
		var message = project.unlisted ? "Here's your project. Remember: it's unlisted, so nobody'll find it unless you share the address." : "Here's your project.";
		req.flash('info', message);
		res.json({ url: project.url });
	});
});
app.get('/project', function (req, res) {
	res.statusCode = 404;
	res.end('Nothing to see here. Try /project/<name>');
});
app.get('/project/:slug', function (req, res) {
	projectDao.find(req.params.slug, function (err, project) {
		if (project && !project.deleted) {
			var flash = req.flash('info');
			var message = flash.length ? _.first(flash) : null;

			res.render('project.html', viewOptions({
				title: project.name,
				flash: message,
				noindex: project.unlisted
			}));
		} else if (project && project.deleted) {
			res.statusCode = 410; // Gone
			res.end('Project deleted');
		} else {
			res.statusCode = 404;
			res.end('No such project');
		}
	});
});
app.get('/project/:slug/export', function (req, res) {
	projectDao.find(req.params.slug, function (err, project) {
		var filename = project.name + '.json';
		res.setHeader('Content-disposition', 'attachment; filename=' + filename);
		issueDao.load(project, function (err, issues) {
			res.json(issues);
		});
	});
});


var auth = basicAuth('admin', password);

app.get('/admin', auth, function (req, res) {
	projectDao.findAll(function (err, projects) {
		Q.all(projects.map(function (project) {
			return Q.ninvoke(issueDao, 'count', project).then(function (count) {
				project.issueCount = count;
				return project;
			});
		})).then(function (projects) {
			res.render('admin.html', viewOptions({
				projects: projects,
				flash: req.flash(),
				noindex: true
			}));
		});
	});
});

app.put('/project/:slug', auth, function (req, res) {
	projectDao.find(req.params.slug, function (err, original) {
		var updated = {};
		_.each(['unlisted', 'deleted'], function (prop) {
			var set = req.body[prop] === 'on';
			updated[prop] = set;
		});
		projectDao.update(req.params.slug, updated, function (err) {
			var success = !err;
			buildAdminFlashMessage(req, original, 'update', success);
			res.redirect('back');
		});
	});
});

app.delete('/project/:slug/issues', auth, function (req, res) {
	projectDao.find(req.params.slug, function (err, project) {
		issueDao.reset(project, function (err) {
			historyDao.reset(project);
			req.flash('info', 'All issues in project \'' + project.name + '\' have been deleted.');
			res.redirect('back');
		});
	});
});

function buildAdminFlashMessage(req, project, action, success) {
	var type = success ? 'info' : 'error';
	var message = success ? 'Project \'' + project.name + '\' has been ' + action + 'd.' : 'Oops, could not ' + action + ' \'' + project.name + '\'';
	req.flash(type, message);
}

function viewOptions(options) {
	return _.extend({}, { version: version }, options);
}

console.log('Ω v' + version + ' running on port ' + port);
