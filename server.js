#!/usr/bin/env node

var http = require('http'),
	express = require('express'),
	sio = require('socket.io'),
	_ = require('underscore'),
	issueDb = require('./lib/issueDb'),
	projectDao = require('./lib/projectDao'),
	Issue = require('./lib/Issue'),
	oe = require('./public/js/omegaEvent'),
	ET = oe.OmegaEvent.Type;

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
// built 'public-built/' using 'node r.js -o app.build.js'
var www_public = argv.optimized ? '/public-built' : '/public';

var app = express.createServer(
	express.logger(),
	express.static(__dirname + www_public)
);
app.register('.html', require('ejs')); // call our views html
app.use(app.router);
app.listen(PORT);

app.get('/', function (req, res) {
	res.end('intro page where you create projects etc');
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

console.log('App running at http://127.0.0.1:' + PORT);

// TODO: extract

var CURRENT_USER = "me";
var HISTORY_ITEMS_TO_SHOW = 10;
var MAX_HISTORY_ITEMS = 100;
var RESERVED_USERNAMES = [Issue.UNASSIGNED, CURRENT_USER];

var io = sio.listen(app);
io.configure(function () {
	// excluded websocket due to Chrome bug: https://github.com/LearnBoost/socket.io/issues/425
	io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);
});

initProjects();

function initProjects() {
	var projects = projectDao.findAll();
	_.each(projects, function (project) {
		io.of('/' + project.slug).on('connection', _.bind(handleProjectConnect, this, project));
	});
}

var historyMap = {};
var usernameMap = {};

function handleProjectConnect(project, socket) {

	historyMap[project.slug] = historyMap[project.slug] || [];
	var history = historyMap[project.slug];

	usernameMap[project.slug] = usernameMap[project.slug] || {};
	var usernames = usernameMap[project.slug];

	var projectSocket = io.of('/' + project.slug);

	socket.emit('issues', issueDb.load(project));
	socket.emit('usernames', usernames);
	socket.emit('history', _.last(history, HISTORY_ITEMS_TO_SHOW));

	socket.on('login user', function(name, callback) {
		if (_.include(RESERVED_USERNAMES, name.toLowerCase())) {
			callback(true);
			return;
		}
		callback(false);
		socket.nickname = name;
		// keep track of duplicate usernames
		usernames[name] = (usernames[name] || 0) + 1;
		projectSocket.emit('usernames', usernames);
	});

	socket.on('user message', function(msg) {
		var event = recordEvent(ET.UserMessage, {message: msg, speaker: socket.nickname});
		projectSocket.emit('user message', event);
	});

	socket.on('new issue', function(description) {
		var newIssue = issueDb.add(new Issue(description, socket.nickname), project);
		var event = recordEvent(ET.NewIssue, {issue: newIssue});
		projectSocket.emit('issue created', event);
	});

	socket.on('assign issue', function(id, specifiedAssignee) {
		var assignee = specifiedAssignee;
		if (!specifiedAssignee || specifiedAssignee === CURRENT_USER) {
			assignee = socket.nickname;
		}
		var issue = issueDb.find(id, project);
		issue.assignee = assignee;
		issueDb.update(issue, project);

		var event = recordEvent(ET.AssignIssue, {assigner: socket.nickname, issue: issue});
		projectSocket.emit('issue assigned', event);
	});

	socket.on('close issue', function(id) {
		var issue = issueDb.find(id, project);
		issue.closed = true;
		issue.closer = socket.nickname;
		issueDb.update(issue, project);

		var event = recordEvent(ET.CloseIssue, {issue: issue});
		projectSocket.emit('issue closed', event);
	});

	socket.on('update issue', function(id, props) {
		var issue = issueDb.find(id, project);
		delete props['id'];
		for (key in props) {
			issue[key] = props[key];
		}
		issueDb.update(issue, project);

		var event = recordEvent(ET.UpdateIssue, {updater: socket.nickname, issue: issue});
		projectSocket.emit('issue updated', props, event);
	});

	socket.on('prioritize issue', function(id) {
		var issue = issueDb.find(id, project);
		issue.critical = !issue.critical;
		issueDb.update(issue, project);

		var event = recordEvent(ET.PrioritizeIssue, {updater: socket.nickname, issue: issue});
		projectSocket.emit('issue prioritized', {critical: issue.critical}, event);
	});

	socket.on('reset issues', function() {
		issueDb.reset(project);
		projectSocket.emit('issues', []);
		history = [];
		projectSocket.emit('history', history);
	});

	function recordEvent(type, details) {
		var event = new oe.OmegaEvent(type, details);
		history.push(event);
		if (history.length > MAX_HISTORY_ITEMS) {
			history = _.last(history, HISTORY_ITEMS_TO_SHOW);
		}
		return event;
	}

	function removeCurrentUser() {
		if (!socket.nickname) {
			return;
		}
		if (usernames[socket.nickname] == 1) {
			delete usernames[socket.nickname];
		} else {
			usernames[socket.nickname]--;
		}
		delete socket.nickname;
		projectSocket.emit('usernames', usernames);
	}

	socket.on('disconnect', removeCurrentUser);
	socket.on('logout', removeCurrentUser);
}
