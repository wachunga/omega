
var userDao = module.exports = {};

var users = {};


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