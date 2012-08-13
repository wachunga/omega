var sio = require('socket.io'),
	_ = require('underscore'),
	markdown = require('node-markdown').Markdown,
	requirejs = require('../server/requirejs-configured'),

	issueDao = require('./issueDao'),
	projectDao = require('./projectDao'),
	userDao = require('./userDao'),
	historyDao = require('./historyDao');

var allowedHtml = 'a|b|code|del|em|i|pre|sup|sub|strong|strike';

var tracker = module.exports = {};

requirejs(['public/js/omegaEvent'], function (OmegaEvent) {

tracker.init = function (app) {
	var that = this;
	that.io = sio.listen(app);
	that.io.configure(function () {
		// excluded websocket due to Chrome bug: https://github.com/LearnBoost/socket.io/issues/425
		that.io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);
	});

	_.each(projectDao.findAll(), function (project) {
		that.listen(project);
	});
};

tracker.listen = function (project) {
	var that = this;
	that.io.of('/' + project.slug).on('connection', function (socket) {
		var projectSocket = that.io.of('/' + project.slug);
		onConnect(project, socket, projectSocket);
	});
};

function markdownizeItem(item) {
	if (item.details && item.details.message) {
		item.details.message = markdown(item.details.message, true, allowedHtml, null, true);
	}
	if (item.description) {
		item.description = markdown(item.description, true, allowedHtml, null, true);
	}
	return item;
}

function markdownize(items) {
	if (!items) {
		return;
	}

	if (_.isArray(items)) {
		return _.map(items, markdownizeItem);
	}
	return markdownizeItem(items);
}

function onConnect(project, socket, projectSocket) {
	socket.emit('issues', markdownize(issueDao.load(project)));
	socket.emit('usernames', userDao.load(project));
	socket.emit('history', markdownize(historyDao.load(project)));

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
		var event = markdownize(recordEvent(OmegaEvent.Type.UserMessage, {message: msg, speaker: socket.nickname}));
		projectSocket.emit('user message', event);
	});

	socket.on('new issue', function (description) {
		var newIssue = markdownize(issueDao.add(description, socket.nickname, project));
		var event = recordEvent(OmegaEvent.Type.NewIssue, {issue: newIssue});
		projectSocket.emit('issue created', event);
	});

	socket.on('assign issue', function (id, specifiedAssignee) {
		var assignee = specifiedAssignee;
		if (userDao.isCurrentUser(assignee)) {
			assignee = socket.nickname;
		}
		var updated = markdownize(issueDao.update(id, { assignee: assignee }, project));
		if (updated) {
			var event = recordEvent(OmegaEvent.Type.AssignIssue, {assigner: socket.nickname, issue: updated});
			projectSocket.emit('issue assigned', event);
		}
	});

	socket.on('tag issue', function (id, tag) {
		var tagged = markdownize(issueDao.addTag(id, tag, project));
		if (tagged) {
			var event = recordEvent(OmegaEvent.Type.TagIssue, { updater: socket.nickname, issue: tagged, tag: tag });
			projectSocket.emit('issue tagged', event);
		}
	});

	socket.on('untag issue', function (id) {
		var untagged = markdownize(issueDao.stripTags(id, project));
		if (untagged) {
			var event = recordEvent(OmegaEvent.Type.UntagIssue, { updater: socket.nickname, issue: untagged });
			projectSocket.emit('issue untagged', event);
		}
	});

	socket.on('close issue', function (id) {
		var updated = markdownize(issueDao.update(id, { closed: true, closer: socket.nickname }, project));
		if (updated) {
			var event = recordEvent(OmegaEvent.Type.CloseIssue, {issue: updated});
			projectSocket.emit('issue closed', event);
		}
	});

	socket.on('update issue', function (id, props) {
		var updated = markdownize(issueDao.update(id, props, project));
		if (updated) {
			var event = recordEvent(OmegaEvent.Type.UpdateIssue, {updater: socket.nickname, issue: updated});
			projectSocket.emit('issue updated', props, event);
		}
	});

	socket.on('prioritize issue', function (id) {
		var updated = markdownize(issueDao.update(id, { critical: 'invert' }, project));
		if (updated) {
			var event = recordEvent(OmegaEvent.Type.PrioritizeIssue, {updater: socket.nickname, issue: updated});
			projectSocket.emit('issue prioritized', {critical: updated.critical}, event);
		}
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

});