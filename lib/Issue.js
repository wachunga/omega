var _ = require('underscore');


function Issue(id, description, creator) {
	this.id = id;
	this.description = description;
	this.creator = creator;

	this.critical = false;
	this.closer = Issue.UNASSIGNED;
	this.assignee = Issue.UNASSIGNED;
	this.closed = false;
	this.createdDate = new Date();
}

Issue.UNASSIGNED = 'nobody';

Issue.applyDefaults = function (issues) {
	_.each(issues, function (issue) {
		_.defaults(issue, { critical: false, closer: Issue.UNASSIGNED });
	});
	return issues;
};

module.exports = Issue;