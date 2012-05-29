var sio = require('socket.io'),
	_ = require('underscore'),

	issueDao = require('./issueDao'),
	projectDao = require('./projectDao'),
	userDao = require('./userDao'),
	historyDao = require('./historyDao'),
	ET = require('../public/js/omegaEvent').OmegaEvent.Type;

var tracker = module.exports = {};

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
		if (userDao.isReservedName(name)) {
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
		var newIssue = issueDao.add(description, socket.nickname, project);
		var event = recordEvent(ET.NewIssue, {issue: newIssue});
		projectSocket.emit('issue created', event);
	});

	socket.on('assign issue', function (id, specifiedAssignee) {
		var assignee = specifiedAssignee;
		if (userDao.isCurrentUser(assignee)) {
			assignee = socket.nickname;
		}
		var updated = issueDao.update(id, { assignee: assignee }, project);
		var event = recordEvent(ET.AssignIssue, {assigner: socket.nickname, issue: updated});
		projectSocket.emit('issue assigned', event);
	});

	socket.on('tag issue', function (id, tag) {
		var tagged = issueDao.addTag(id, tag, project);
		var event = recordEvent(ET.TagIssue, { updater: socket.nickname, issue: tagged, tag: tag });
		projectSocket.emit('issue tagged', event);
	});

	socket.on('close issue', function (id) {
		var updated = issueDao.update(id, { closed: true, closer: socket.nickname }, project);
		var event = recordEvent(ET.CloseIssue, {issue: updated});
		projectSocket.emit('issue closed', event);
	});

	socket.on('update issue', function (id, props) {
		var updated = issueDao.update(id, props, project);
		var event = recordEvent(ET.UpdateIssue, {updater: socket.nickname, issue: updated});
		projectSocket.emit('issue updated', props, event);
	});

	socket.on('prioritize issue', function (id) {
		var updated = issueDao.update(id, { critical: 'invert' }, project);
		var event = recordEvent(ET.PrioritizeIssue, {updater: socket.nickname, issue: updated});
		projectSocket.emit('issue prioritized', {critical: updated.critical}, event);
	});

	socket.on('reset issues', function () {
		issueDao.reset(project);
		projectSocket.emit('issues', []);

		historyDao.reset(project);
		projectSocket.emit('history', []);
	});

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