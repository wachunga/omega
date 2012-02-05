#!/usr/bin/env node

var http = require('http'),
	sio = require('socket.io'),
	_ = require('underscore'),
	static = require('node-static'),
	issueDb = require('./lib/issueDb'),
	exec = require('child_process').exec,
	oe = require('./public/js/omegaEvent'),
	ET = oe.OmegaEvent.Type;

// command line parameters
var argv = require('optimist')
		.options('port', {
			alias: 'p',
			default: 1337
		})
		.options('issues', {
			alias: 'db',
			default: 'issues.json'
		})
		.options('optimized', {
			alias: 'opt',
			default: false
		})
		.argv;

// run with --optimized to use 'public-built/' directory
// built 'public-built/' using 'node r.js -o app.build.js'
var www_public = argv.optimized ? '/public-built' : '/public';

// TODO switch to node server.js -p 1337 --db issues.json --optimized,
// then use:
// var PORT = argv.port;
// var issuesJson = argv.issues;
var PORT = (parseInt(process.argv[2], 10) && process.argv[2]) || process.env.app_port || argv.port;
var issuesJson = (process.argv[3] !== '--optimized') && process.argv[3] || argv.issues;

issueDb.setIssueFile(issuesJson);

var fileServer = new static.Server(__dirname + www_public);
var server = http.createServer(function (request, response) {
    request.addListener('end', function () {
        fileServer.serve(request, response);
    });
});
server.listen(PORT);

console.log('Server running at http://127.0.0.1:' + PORT);

var UNASSIGNED = "nobody";
var CURRENT_USER = "me";
var HISTORY_ITEMS_TO_SHOW = 10;
var MAX_HISTORY_ITEMS = 100;
var RESERVED_USERNAMES = [UNASSIGNED, CURRENT_USER];

var usernames = {};
var issues = issueDb.load();
var history = [];

var io = sio.listen(server);
io.configure(function () {
	// excluded websocket due to Chrome bug: https://github.com/LearnBoost/socket.io/issues/425
	io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);
});
io.sockets.on('connection', function(socket) {
	applyIssueDefaults();
	socket.emit('issues', issues);
	socket.emit('usernames', usernames);
	
	socket.emit('history', _.last(history, HISTORY_ITEMS_TO_SHOW));
	exec("git rev-parse HEAD", {cwd: __dirname}, emitVersionNumber);

	socket.on('login user', function(name, callback) {
		if (_.include(RESERVED_USERNAMES, name.toLowerCase())) {
			callback(true);
			return;
		}
		callback(false);
		socket.nickname = name;
		// keep track of duplicate usernames
		usernames[name] = (usernames[name] || 0) + 1;
		io.sockets.emit('usernames', usernames);
	});
	
	socket.on('user message', function(msg) {
		var event = recordEvent(ET.UserMessage, {message: msg, speaker: socket.nickname});
		io.sockets.emit('user message', event);
	});
	
	socket.on('new issue', function(desc) {
		var newIssue = {
			id: issues.length+1,
			description: desc,
			critical: false,
			creator: socket.nickname,
			closer: UNASSIGNED,
			assignee: UNASSIGNED,
			closed: false,
			createdDate: new Date()
		};
		issues.push(newIssue);
		issueDb.write(issues);
		
		var event = recordEvent(ET.NewIssue, {issue: newIssue});
		io.sockets.emit('issue created', event);
	});

	socket.on('assign issue', function(id, specifiedAssignee) {
		var assignee = specifiedAssignee;
		if (!specifiedAssignee || specifiedAssignee === CURRENT_USER) {
			assignee = socket.nickname;
		}
		var issue = issues[id-1];
		issue.assignee = assignee; 
		issueDb.write(issues);
		
		var event = recordEvent(ET.AssignIssue, {assigner: socket.nickname, issue: issue});
		io.sockets.emit('issue assigned', event);
	});
	
	socket.on('close issue', function(id) {
		var issue = issues[id-1]; 
		issue.closed = true;
		issueDb.write(issues);
		issue.closer = socket.nickname;
		
		var event = recordEvent(ET.CloseIssue, {issue: issue});
		io.sockets.emit('issue closed', event);
	});
	
	socket.on('update issue', function(id, props) {
		var issue = issues[id-1];
		delete props['id'];
		for (key in props) {
			issue[key] = props[key];
		}
		issueDb.write(issues);
		
		var event = recordEvent(ET.UpdateIssue, {updater: socket.nickname, issue: issue});
		io.sockets.emit('issue updated', props, event);
	});

	socket.on('prioritize issue', function(id) {
		var issue = issues[id-1]; 
		issue.critical = !issue.critical;
		issueDb.write(issues);
		
		var event = recordEvent(ET.PrioritizeIssue, {updater: socket.nickname, issue: issue});
		io.sockets.emit('issue prioritized', {critical: issue.critical}, event);
	});
	
	socket.on('reset issues', function() {
		issues = [];
		issueDb.write(issues);
		io.sockets.emit('issues', issues);
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
		io.sockets.emit('usernames', usernames);
	}

	function applyIssueDefaults() {
		_.each(issues, function (issue) {
			_.defaults(issue, { critical: false, closer: UNASSIGNED });
		});
	}
	
	function emitVersionNumber(error, stdout, stderr) {
		if (error !== null) {
			console.log(error);
			return;
		}
		console.log("version: " + stdout);
		socket.emit('version', stdout);
	}

	socket.on('disconnect', removeCurrentUser);
	socket.on('logout', removeCurrentUser);
});
