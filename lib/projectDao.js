var fs = require('fs'),
	Project = require('./project'),
	_ = require('underscore');

var projectDao = (function () {

	var projectsFile = process.cwd() + '/db/projects.json';
	var projects = load();
	console.log('Loaded projects:\n', projects);

	function load() {
		try {
			var json = fs.readFileSync(projectsFile);
			return JSON.parse(json.toString());
		} catch (e) {
			console.log('Could not read projects from ' + projectsFile + ': ' + e);
			return [];
		}
	}

	return {

		create: function (project) {
			projects[project.id] = project;
			//console.log('Created project', project, projects);
			fs.writeFile(projectsFile, JSON.stringify(projects), function (err) {
				if (err) {
					console.log(err);
				}
			});
		},

		find: function (slug) {
			//console.log('Finding project ' + slug);
			return _.find(projects, function (project) {
				return project.slug == slug;
			});
		},

		findAll: function () {
			return projects;
		}

	};
})();

// testing
projectDao.create(new Project('Hornby'));
projectDao.create(new Project('Dunsmuir'));

module.exports = projectDao;