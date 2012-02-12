var fs = require('fs');

var issueDb = (function () {

	function getIssueFileFromProject(project) {
		return process.cwd() + '/db/' + project.slug + '.json';
	}

	return {

		load: function (project) {
			var issueFile = getIssueFileFromProject(project);
			console.log('Loading issues from ' + issueFile);
			try {
				var issueJSON = fs.readFileSync(issueFile);
				return JSON.parse(issueJSON.toString());
			} catch (e) {
				console.log('Issue file may not exist, it will be created later');
			}
			return [];
		},

		write: function (project, issues) {
			var issueFile = getIssueFileFromProject(project);
			fs.writeFile(issueFile, JSON.stringify(issues), function (err) {
				if (err) {
					console.log(err);
				}
			});
		}

	};
})();

module.exports = issueDb;
