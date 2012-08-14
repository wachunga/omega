var _ = require('underscore'),
	Issue = require('./Issue');

var userDao = module.exports = {};

var users = {};

var CURRENT_USER = "me";
var RESERVED_USERNAMES = [Issue.UNASSIGNED, CURRENT_USER];


userDao.add = function (name, project) {
	users[project.slug] = users[project.slug] || {};

	// keep track of duplicate usernames
	users[project.slug][name] = (users[project.slug][name] || 0) + 1;
};

userDao.remove = function (name, project) {
	if (users[project.slug][name] === 1) {
		delete users[project.slug][name];
	} else {
		users[project.slug][name]--;
	}
};

userDao.load = function (project) {
	return users[project.slug];
};

userDao.isCurrentUser = function (assignee) {
	return !assignee || assignee === CURRENT_USER;
};

userDao.isReservedName = function (name) {
	return _.include(RESERVED_USERNAMES, name.toLowerCase());
};