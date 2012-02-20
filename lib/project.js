var _ = require('underscore'),
	slugify = require('slugs');

function Project(name, unlisted) {
	this.name = name;
	this.slug = slugify(name);
	this.createdDate = new Date();
	this.url = '/project/'+ this.slug;

	this.unlisted = unlisted;
}

Project.prototype.toString = function () {
	return 'Project[' + JSON.stringify(this) + ']';
};

Project.slugify = slugify;

module.exports = Project;