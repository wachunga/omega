var sio = require('socket.io'),
	_ = require('underscore'),
	markdown = require('node-markdown').Markdown,
	requirejs = require('../requirejs-configured'),

	issueDao, // set in init
	userDao = require('./userDao'),
	historyDao = require('./historyDao');

var allowedHtml = 'a|b|code|del|em|i|pre|sup|sub|strong|strike';

var tracker = module.exports = {};

requirejs(['public/js/omegaEvent'], function (OmegaEvent) {

tracker.init = function (server, projectDao, realIssueDao) {
	var that = this;
	that.io = sio(server);

	issueDao = realIssueDao;
	projectDao.findAll(function (err, projects) {
		_.each(projects, function (project) {
			that.listen(project);
		});
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
	issueDao.load(project, function (err, issues) {
		socket.emit('issues', markdownize(issues));
	});
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
		issueDao.add(description, socket.nickname, project, function (err, issue) {
			var event = recordEvent(OmegaEvent.Type.NewIssue, {issue: markdownize(issue)});
			projectSocket.emit('issue created', event);
		});
	});

	socket.on('assign issue', function (id, specifiedAssignee) {
		var assignee = specifiedAssignee;
		if (userDao.isCurrentUser(assignee)) {
			assignee = socket.nickname;
		}
		issueDao.update(id, { assignee: assignee }, project, function (err, updated) {
			if (updated) {
				var event = recordEvent(OmegaEvent.Type.AssignIssue, {assigner: socket.nickname, issue: markdownize(updated)});
				projectSocket.emit('issue assigned', event);
			}
		});
	});

	socket.on('tag issue', function (id, tag) {
		issueDao.addTag(id, tag, project, function (err, tagged) {
			if (tagged) {
				var event = recordEvent(OmegaEvent.Type.TagIssue, { updater: socket.nickname, issue: markdownize(tagged), tag: tag });
				projectSocket.emit('issue tagged', event);
			}
		});
	});

	socket.on('untag issue', function (id) {
		issueDao.stripTags(id, project, function (err, untagged) {
			if (untagged) {
				var event = recordEvent(OmegaEvent.Type.UntagIssue, { updater: socket.nickname, issue: markdownize(untagged) });
				projectSocket.emit('issue untagged', event);
			}
		});
	});

	socket.on('close issue', function (id) {
		issueDao.update(id, { closed: true, closer: socket.nickname, closedDate: new Date() }, project, function (err, updated) {
			if (updated) {
				var event = recordEvent(OmegaEvent.Type.CloseIssue, {issue: markdownize(updated)});
				projectSocket.emit('issue closed', event);
			}
		});
	});

	socket.on('update issue', function (id, props) {
		issueDao.update(id, props, project, function (err, updated) {
			if (updated) {
				var event = recordEvent(OmegaEvent.Type.UpdateIssue, {updater: socket.nickname, issue: markdownize(updated)});
				projectSocket.emit('issue updated', props, event);
			}
		});
	});

	socket.on('prioritize issue', function (id) {
		issueDao.update(id, { critical: 'invert' }, project, function (err, updated) {
			if (updated) {
				var event = recordEvent(OmegaEvent.Type.PrioritizeIssue, {updater: socket.nickname, issue: markdownize(updated)});
				projectSocket.emit('issue prioritized', {critical: updated.critical}, event);
			}
		});
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
