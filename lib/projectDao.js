var fs = require('fs'),
	Project = require('./Project'),
	_ = require('underscore');

var projectDao = module.exports = {};

var FILENAME = 'projects';
var INVALID_NAMES = [FILENAME, 'lib', 'node_modules', 'public', 'tests', 'views'];

var projectsFile;
var projects = {};

projectDao.init = function (dir) {
	projectsFile = dir + FILENAME + '.json';
	console.log('storing projects in: ' + projectsFile);

	projects = load() || {};
};

function load() {
	try {
		var json = fs.readFileSync(projectsFile);
		return Project.applyDefaults(JSON.parse(json.toString()));
	} catch (e) {
		console.log("Project file " + projectsFile + " appears to not yet exist, but that's okay. It'll get created with the first project.", e);
	}
}

projectDao.isValidName = function (name) {
	return !_.contains(INVALID_NAMES, name);
};

projectDao.getSlug = function (name) {
	return Project.slugify(name);
};

projectDao.create = function (name, unlisted) {
	var project = new Project(name, unlisted);
	projects[project.slug] = project;
	console.log('Created new project', project);
	this.write();
	return project;
};

projectDao.write = function () {
	fs.writeFile(projectsFile, JSON.stringify(projects), function (err) {
		if (err) {
			console.log("Couldn't write projects file.");
			throw err;
		}
	});
	console.log('wrote projects');
};

projectDao.remove = function (slug) {
	var project = projects[slug];
	if (!project) {
		return false;
	}
	projects[slug].deleted = true;
	this.write();
	return true;
};

projectDao.exists = function (name) {
	return !!this.find(this.getSlug(name));
};

projectDao.find = function (slug) {
	return projects[slug];
};

projectDao.findAll = function () {
	return _.values(projects);
};

projectDao.findListed = function () {
	return _.filter(projects, function (project) {
		return !project.unlisted && !project.deleted;
	});
};

projectDao.findUnlisted = function () {
	return _.filter(projects, function (project) {
		return project.unlisted && !project.deleted;
	});
};