var _ = require('underscore');


function Issue(id, description, creator) {
	this.id = id;
	this.description = description;
	this.creator = creator;

	this.critical = false;
	// TODO: last updated date
	this.assignee = Issue.UNASSIGNED;
	this.createdDate = new Date();

	this.closed = false;
	this.closer = Issue.UNASSIGNED;
	this.closedDate = null;

	this.tags = [];
}

Issue.UNASSIGNED = 'nobody';

Issue.applyDefaults = function (issues) {
	_.each(issues, function (issue) {
		_.defaults(issue, { critical: false, closer: Issue.UNASSIGNED, closedDate: null, tags: [] });
	});
	return issues;
};

module.exports = Issue;