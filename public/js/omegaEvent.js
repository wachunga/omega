define(['underscore'], function (_) {

	function OmegaEvent(type, details) {
		this.type = type.name;
		this.details = details;
		this.timestamp = new Date();
	}

	function OmegaEventType(name, message, notificationTitle, notificationBody) {
		this.name = name;
		this.message = message;
		this.notificationTitle = notificationTitle;
		this.notificationBody = notificationBody;
	}

	OmegaEventType.prototype.notifies = function () {
		return !!this.notificationTitle && !!this.notificationBody;
	}

	OmegaEvent.Type = {
		UserMessage: new OmegaEventType("UserMessage", "<%= message %>", "<%= speaker %> says...", "<%= message %>"),
		NewIssue: new OmegaEventType("NewIssue", "<%= issue.creator %> created $id$<%= issue.id %>.", "New issue", "<%= issue.description %>"),
		AssignIssue: new OmegaEventType("AssignIssue", "<%= assigner %> assigned $id$<%= issue.id %> to <%= issue.assignee %>."),
		TagIssue: new OmegaEventType("TagIssue", "<%= updater %> tagged $id$<%= issue.id %> with '<%= tag %>'."),
		UntagIssue: new OmegaEventType("UntagIssue", "<%= updater %> removed tags from $id$<%= issue.id %>."),
		UpdateIssue: new OmegaEventType("UpdateIssue", "<%= updater %> updated $id$<%= issue.id %>."),
		CloseIssue: new OmegaEventType("CloseIssue", "<%= issue.closer %> closed $id$<%= issue.id %>.", "Issue closed", "<%= issue.description %>"),
		PrioritizeIssue: new OmegaEventType("PrioritizeIssue", "<%= updater %> marked $id$<%= issue.id %> as<% if (!issue.critical) print(' not'); %> critical.")
	};
	
	return OmegaEvent;
});