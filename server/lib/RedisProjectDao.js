var Project = require('./Project'),
	_ = require('underscore');

var INVALID_NAMES = ['projects', 'lib', 'node_modules', 'public', 'tests', 'views'];

function RedisProjectDao(client) {
	this.client = client;
	this.prefix = "omega:";

	console.log('storing projects in: redis://' + this.client.host + ':' + this.client.port + '/' + this.prefix + "projects");
}

RedisProjectDao.prototype.isValidName = function (name) {
	var slug = Project.slugify(name),
		nameIsValid = !_.contains(INVALID_NAMES, name) && name.length > 3,
		slugIsValid = !_.contains(INVALID_NAMES, slug) && slug.length > 3;
	return nameIsValid && slugIsValid;
};

RedisProjectDao.prototype.create = function (name, unlisted, callback) {
	var project = new Project(name, unlisted);

	this.client.sadd(this.prefix + "projects", project.slug, function (err, result) {
		// TODO: error handling
	});
	this.client.setnx(this.prefix + "project:" + project.slug, JSON.stringify(project), function (err, result) {
		if (err) {
			callback(err);
		} else if (!result) {
			// TODO: return the existing project, not the new one
			callback(new Error('project exists'), project);
		} else {
			callback(null, project);
		}
	});
};

RedisProjectDao.prototype.update = function (slug, updatedProject, callback) {
	var self = this;

	// TODO do this transactionally
	self.find(slug, function (err, project) {
		if (err) {
			callback(err);
		}
		if (!project) {
			callback(new Error('project does not exist'));
		}
		if (updatedProject.deleted !== undefined) {
			project.deleted = updatedProject.deleted;
		}
		if (updatedProject.unlisted !== undefined) {
			project.unlisted = updatedProject.unlisted;
		}
		self.client.set(self.prefix + "project:" + project.slug, JSON.stringify(project), callback);
	});
};

RedisProjectDao.prototype.find = function (slug, callback) {
	this.client.get(this.prefix + "project:" + slug, function (err, json) {
		if (err) {
			callback(err);
		} else {
			callback(null, JSON.parse(json));
		}
	});
};

RedisProjectDao.prototype.findAll = function (callback) {
	var self = this;

	// TODO: use Q, async or some other callback-management library
	this.client.smembers(this.prefix + "projects", function (err, result) {
		if (err) {
			callback(err);
		} else {
			var keys = result.map(function (slug) {
				return self.prefix + "project:" + slug;
			});
			self.client.mget(keys, function (err, result) {
				if (err) {
					callback(err);
				} else {
					callback(null, result.map(function (json) {
						return JSON.parse(json);
					}));
				}
			});
		}
	});
};

module.exports = RedisProjectDao;
