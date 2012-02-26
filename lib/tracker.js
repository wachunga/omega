var sio = require('socket.io'),
	_ = require('underscore'),
	Issue = require('./Issue'),

	issueDao = require('./issueDao'),
	projectDao = require('./projectDao'),
	userDao = require('./userDao'),
	historyDao = require('./historyDao'),
	ET = require('../public/js/omegaEvent').OmegaEvent.Type;

var tracker = module.exports = {};

var CURRENT_USER = "me";
var RESERVED_USERNAMES = [Issue.UNASSIGNED, CURRENT_USER];

var io;

tracker.init = function (app) {
	io = sio.listen(app);
	io.configure(function () {
		// excluded websocket due to Chrome bug: https://github.com/LearnBoost/socket.io/issues/425
		io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);
	});

	_.each(projectDao.findAll(), function (project) {
		this.listen(project);
	}, this);
};

tracker.listen = function (project) {
	io.of('/' + project.slug).on('connection', function (socket) {
		var projectSocket = io.of('/' + project.slug);
		onConnect(project, socket, projectSocket);
	});
};

function onConnect(project, socket, projectSocket) {
	socket.emit('issues', issueDao.load(project));
	socket.emit('usernames', userDao.load(project));
	socket.emit('history', historyDao.load(project));

	socket.on('login user', function (name, callback) {
		if (_.include(RESERVED_USERNAMES, name.toLowerCase())) {
			callback(true);
			return;
		}
		callback(false);
		socket.nickname = name;

		userDao.add(name, project);
		projectSocket.emit('usernames', userDao.load(project));
	});

	socket.on('user message', function (msg) {
		var event = recordEvent(ET.UserMessage, {message: msg, speaker: socket.nickname});
		projectSocket.emit('user message', event);
	});

	socket.on('new issue', function (description) {
		var newIssue = issueDao.add(new Issue(description, socket.nickname), project);
		var event = recordEvent(ET.NewIssue, {issue: newIssue});
		projectSocket.emit('issue created', event);
	});

	socket.on('assign issue', function (id, specifiedAssignee) {
		var assignee = specifiedAssignee;
		if (!specifiedAssignee || specifiedAssignee === CURRENT_USER) {
			assignee = socket.nickname;
		}
		var updated = updateIssue(id, { assignee: assignee });
		var event = recordEvent(ET.AssignIssue, {assigner: socket.nickname, issue: updated});
		projectSocket.emit('issue assigned', event);
	});

	socket.on('close issue', function (id) {
		var updated = updateIssue(id, { closed: true, closer: socket.nickname });
		var event = recordEvent(ET.CloseIssue, {issue: updated});
		projectSocket.emit('issue closed', event);
	});

	socket.on('update issue', function (id, props) {
		var updated = updateIssue(id, props);
		var event = recordEvent(ET.UpdateIssue, {updater: socket.nickname, issue: updated});
		projectSocket.emit('issue updated', props, event);
	});

	socket.on('prioritize issue', function (id) {
		var updated = updateIssue(id, { critical: 'invert' });
		var event = recordEvent(ET.PrioritizeIssue, {updater: socket.nickname, issue: updated});
		projectSocket.emit('issue prioritized', {critical: updated.critical}, event);
	});

	socket.on('reset issues', function () {
		issueDao.reset(project);
		projectSocket.emit('issues', []);

		historyDao.reset(project);
		projectSocket.emit('history', []);
	});

	function updateIssue(id, props) {
		var issue = issueDao.find(id, project);
		delete props['id'];
		for (var key in props) {
			if (key === 'critical') {
				issue[key] = !issue[key];
			} else {
				issue[key] = props[key];
			}
		}
		issueDao.update(issue, project);
		return issue;
	}

	function recordEvent(type, details) {
		return historyDao.record(type, details, project);
	}

	function removeCurrentUser() {
		if (!socket.nickname) {
			return;
		}
		userDao.remove(socket.nickname, project);
		delete socket.nickname;
		projectSocket.emit('usernames', userDao.load(project));
	}

	socket.on('disconnect', removeCurrentUser);
	socket.on('logout', removeCurrentUser);
}