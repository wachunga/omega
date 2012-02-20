var fs = require('fs'),
	Project = require('./project'),
	_ = require('underscore');

var projectDao = (function () {

	var projectsFile = process.cwd() + '/db/projects.json';
	var projects = load() || {};
	console.log('Loaded projects:\n', projects);

	function load() {
		try {
			var json = fs.readFileSync(projectsFile);
			return JSON.parse(json.toString());
		} catch (e) {
			console.log('Could not read projects from ' + projectsFile + ': ' + e);
		}
	}

	return {

		exists: function (name) {
			if (!name) {
				return false;
			}
			return !!this.find(this.getSlug(name));
		},

		getSlug: function (name) {
			return Project.slugify(name);
		},

		create: function (name) {
			var project = new Project(name);
			projects[project.slug] = project;
			console.log('Created new project', project);
			fs.writeFile(projectsFile, JSON.stringify(projects), function (err) {
				if (err) {
					console.log('Problem writing out projects', err);
				}
			});
			return project;
		},

		find: function (slug) {
			return projects[slug];
		},

		findAll: function () {
			return _.values(projects);
		}

	};
})();

module.exports = projectDao;