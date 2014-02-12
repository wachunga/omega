var _ = require('underscore'),
	Issue = require('./Issue');

/*
 * schema:
 * omega:project:<slug>:issues :: list<json>
 */
function RedisIssueDao(client) {
	this.client = client;
	this.prefix = "omega:";

	console.log('storing issues in: redis://' + this.client.host + ':' + this.client.port + '/' + this.prefix);
}

RedisIssueDao.prototype.load = function (project, callback) {
	var key = this.prefix + 'project:' + project.slug + ':issues';
	this.client.lrange(key, 0, -1, function (err, issues) {
		if (err) {
			callback(err);
		} else {
			callback(null, issues.map(function (json, index) {
				var issue = JSON.parse(json);
				issue.id = index + 1;
				return issue;
			}));
		}
	});
};

RedisIssueDao.prototype.count = function (project, callback) {
	var key = this.prefix + 'project:' + project.slug + ':issues';
	this.client.llen(key, callback);
};

RedisIssueDao.prototype.add = function (description, name, project, callback) {
	var key = this.prefix + 'project:' + project.slug + ':issues';

	// we could use redis transactions to get the length of the list
	// and set the issue's id correctly, or we can fix it up when it gets
	// loaded (since we don't allow deletion of issues)
	var issue = new Issue(0, description, name);

	this.client.rpush(key, JSON.stringify(issue), function (err, length) {
		if (err) {
			callback(err);
		} else {
			issue.id = length;
			callback(null, issue);
		}
	});
};

RedisIssueDao.prototype.find = function (id, project, callback) {
	var key = this.prefix + 'project:' + project.slug + ':issues';
	var index = id - 1;
	this.client.lrange(key, index, index, function (err, issues) {
		if (err) {
			callback(err);
		} else {
			var issue = JSON.parse(issues[0]);
			if (issue) {
				issue.id = index + 1;
			}
			callback(null, issue);
		}
	});
};

RedisIssueDao.prototype.findAndUpdateIssue = function (id, project, mod, callback) {
	var key = this.prefix + 'project:' + project.slug + ':issues';
	var self = this;

	// TODO do this transactionally
	this.find(id, project, function (err, issue) {
		if (err) {
			callback(err);
		} else {
			if (!issue) {
				callback(null, issue);
			} else {
				mod(issue);
				self.client.lset(key, issue.id - 1, JSON.stringify(issue), function (err, ok) {
					if (err) {
						callback(err);
					} else {
						callback(null, issue);
					}
				});
			}
		}
	});
};

RedisIssueDao.prototype.addTag = function (id, tag, project, callback) {
	this.findAndUpdateIssue(id, project, function (issue) {
		issue.tags.push(tag);
	}, callback);
};

RedisIssueDao.prototype.stripTags = function (id, project, callback) {
	this.findAndUpdateIssue(id, project, function (issue) {
		issue.tags = [];
	}, callback);
};

RedisIssueDao.prototype.update = function (id, props, project, callback) {
	delete props['id']; // never change this

	this.findAndUpdateIssue(id, project, function (issue) {
		for (var key in props) {
			if (key === 'critical') {
				issue[key] = !issue[key];
			} else {
				issue[key] = props[key];
			}
		}
	}, callback);
};

RedisIssueDao.prototype.reset = function (project, callback) {
	var key = this.prefix + 'project:' + project.slug + ':issues';
	this.client.del(key, callback);
};

module.exports = RedisIssueDao;
