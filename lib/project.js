var _ = require('underscore'),
	slugify = require('slugs');

function Project(name) {
	this.id = _.uniqueId();
	this.name = name;
	this.slug = slugify(name);
}

Project.prototype.toString = function () {
	return 'Project[' + JSON.stringify(this) + ']';
}

module.exports = Project;