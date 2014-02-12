var Project = require('./Project'),
	_ = require('underscore'),
	Q = require('q');

var INVALID_NAMES = ['projects', 'lib', 'node_modules', 'public', 'tests', 'views'];

/*
 * schema:
 * omega:projects :: set<slug>
 * omega:project:<slug> :: json
 */
function RedisProjectDao(client) {
	this.client = client;
	this.prefix = "omega:";

	console.log('storing projects in: redis://' + this.client.host + ':' + this.client.port + '/' + this.prefix);
}

RedisProjectDao.prototype.isValidName = function (name) {
	var slug = Project.slugify(name),
		nameIsValid = !_.contains(INVALID_NAMES, name) && name.length > 3,
		slugIsValid = !_.contains(INVALID_NAMES, slug) && slug.length > 3;
	return nameIsValid && slugIsValid;
};

RedisProjectDao.prototype.create = function (name, unlisted, callback) {
	var project = new Project(name, unlisted);

	Q.all([
		Q.ninvoke(this.client, 'sadd', this.prefix + "projects", project.slug),
		Q.ninvoke(this.client, 'setnx', this.prefix + "project:" + project.slug, JSON.stringify(project))
	]).spread(function (added, created) {
		if (!created) {
			throw new Error('project exists');
		}
		callback(null, project);
	}).fail(function (err) {
		callback(err);
	}).done();
};

RedisProjectDao.prototype.update = function (slug, updatedProject, callback) {
	var self = this;

	// TODO do this transactionally
	self.find(slug, function (err, project) {
		if (err) {
			callback(err);
		} else {
			if (!project) {
				callback(new Error('project does not exist'));
			} else {
				if (updatedProject.deleted !== undefined) {
					project.deleted = updatedProject.deleted;
				}
				if (updatedProject.unlisted !== undefined) {
					project.unlisted = updatedProject.unlisted;
				}
				self.client.set(self.prefix + "project:" + project.slug, JSON.stringify(project), callback);
			}
		}
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

	Q.ninvoke(this.client, 'smembers', this.prefix + 'projects').then(function (slugs) {
		return Q.ninvoke(self.client, 'mget', slugs.map(function (slug) {
			return self.prefix + "project:" + slug;
		}));
	}).then(function (projects) {
		callback(null, projects.map(function (json) {
			return JSON.parse(json);
		}));
	}).fail(function (err) {
		callback(err);
	}).done();
};

module.exports = RedisProjectDao;
