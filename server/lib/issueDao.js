var fs = require('fs'),
	_ = require('underscore'),
	path = require('path'),
	Issue = require('./Issue');

// TODO: writing to disk rather sucks

var issueDao = module.exports = {};

var home = '';
var issues = {};

issueDao.init = function (dir) {
	home = path.normalize(dir);
	console.log('storing issues in: ' + home);
};

function getIssueFileFromProject(project) {
	return home + project.slug + '.json';
}

issueDao.load = function (project, callback) {
	var issueFile = getIssueFileFromProject(project);
	console.log('Loading issues from ' + issueFile);
	try {
		var issueJSON = fs.readFileSync(issueFile);
		issues[project.slug] = Issue.applyDefaults(JSON.parse(issueJSON.toString()));
	} catch (e) {
		console.log("Issue file does not appear to exist yet, but that's okay. It'll get created with the first issue.", e);
	}
	callback(null, issues[project.slug] || []);
};

issueDao.count = function (project, callback) {
	var cached = issues[project.slug];
	if (cached !== undefined) {
		callback(null, cached.length);
	} else {
		issueDao.load(project, function (err, issues) {
			if (err) {
				callback(err);
			} else {
				callback(null, issues.length);
			}
		});
	}
};

issueDao.add = function (description, name, project, callback) {
	if (!issues[project.slug]) {
		issues[project.slug] = [];
	}

	var id = issues[project.slug].length + 1;
	var issue = new Issue(id, description, name);
	issues[project.slug].push(issue);
	this.write(project);

	callback(null, issue);
};

issueDao.find = function (id, project) {
	return issues[project.slug][id - 1];
};

issueDao.addTag = function (id, tag, project, callback) {
	var issue = issueDao.find(id, project);
	if (!issue) {
		callback(null, null);
	} else {
		issue.tags.push(tag);
		issues[project.slug][issue.id - 1] = issue;
		this.write(project);
		callback(null, issue);
	}
};

issueDao.stripTags = function (id, project, callback) {
	var issue = issueDao.find(id, project);
	if (!issue) {
		callback(null, null);
	} else {
		issue.tags = [];
		issues[project.slug][issue.id - 1] = issue;
		this.write(project);
		callback(null, issue);
	}
};

issueDao.update = function (id, props, project, callback) {
	delete props['id']; // never change this

	var issue = issueDao.find(id, project);
	if (!issue) {
		callback(null, null);
	} else {
		for (var key in props) {
			if (key === 'critical') {
				issue[key] = !issue[key];
			} else {
				issue[key] = props[key];
			}
		}
		issues[project.slug][issue.id - 1] = issue;
		this.write(project); // TODO: only persist updated
		callback(null, issue);
	}
};

issueDao.write = function (project) {
	var issueFile = getIssueFileFromProject(project);
	fs.writeFile(issueFile, JSON.stringify(issues[project.slug]), function (err) {
		if (err) {
			console.log("Couldn't write issues file.");
			throw err;
		}
	});
};

issueDao.reset = function (project, callback) {
	issues[project.slug] = [];
	this.write(project);
	callback(null);
};