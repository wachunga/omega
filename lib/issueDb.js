var fs = require('fs');

var issueFile = process.cwd() + '/' + 'issues.json';

var issueDb = (function() {
	return {

		load: function() {
			try {
				var issueJSON = fs.readFileSync(issueFile);
				return JSON.parse(issueJSON.toString());
			} catch (e) {
				console.log('Issue file may not exist, it will be created later');
			}
			return [];
		},

		// TODO make "issues" internal so it does not need to get passed in.
		write: function(issues) {
			fs.writeFile(issueFile, JSON.stringify(issues), function (err) {
				if (err) {
					console.log(err);
				}
			});
		}

	};
})();

module.exports = issueDb;
