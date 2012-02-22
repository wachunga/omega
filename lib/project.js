var _ = require('underscore'),
	slugify = require('slugs');

function Project(name, unlisted) {
	this.name = name;
	this.createdDate = new Date();

	this.slug = slugify(name);
	this.url = '/project/'+ this.slug;

	this.closed = false;
	this.deleted = false;
	this.unlisted = unlisted;
}

Project.prototype.toString = function () {
	return 'Project[' + JSON.stringify(this) + ']';
};

Project.applyDefaults = function (projects) {
	_.each(projects, function (project) {
		_.defaults(project, { deleted: false, unlisted: false, closed: false });
	});
	return projects;
};

Project.slugify = slugify;

module.exports = Project;