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
	};

	// TODO: move into json file
	OmegaEvent.Type = {
		UserMessage: new OmegaEventType("UserMessage", "<%= message %>", "<%= speaker %> says...", "<%= message %>"),
		NewIssue: new OmegaEventType("NewIssue", "<%= issue.creator %> created <a class=\"id\" data-id=\"<%= issue.id %>\" href=\"#<%= issue.id %>\">Ω<%= issue.id%></a>.", "New issue", "<%= issue.description %>"),
		AssignIssue: new OmegaEventType("AssignIssue", "<%= assigner %> assigned <a class=\"id\" data-id=\"<%= issue.id %>\" href=\"#<%= issue.id %>\">Ω<%= issue.id%></a> to <%= issue.assignee %>."),
		TagIssue: new OmegaEventType("TagIssue", "<%= updater %> tagged <a class=\"id\" data-id=\"<%= issue.id %>\" href=\"#<%= issue.id %>\">Ω<%= issue.id%></a> with '<%= tag %>'."),
		UntagIssue: new OmegaEventType("UntagIssue", "<%= updater %> removed tags from <a class=\"id\" data-id=\"<%= issue.id %>\" href=\"#<%= issue.id %>\">Ω<%= issue.id%></a>."),
		UpdateIssue: new OmegaEventType("UpdateIssue", "<%= updater %> updated <a class=\"id\" data-id=\"<%= issue.id %>\" href=\"#<%= issue.id %>\">Ω<%= issue.id%></a>."),
		CloseIssue: new OmegaEventType("CloseIssue", "<%= issue.closer %> closed <a class=\"id\" data-id=\"<%= issue.id %>\" href=\"#<%= issue.id %>\">Ω<%= issue.id%></a>.", "Issue closed", "<%= issue.description %>"),
		PrioritizeIssue: new OmegaEventType("PrioritizeIssue", "<%= updater %> marked <a class=\"id\" data-id=\"<%= issue.id %>\" href=\"#<%= issue.id %>\">Ω<%= issue.id%></a> as<% if (!issue.critical) print(' not'); %> critical.")
	};
	
	return OmegaEvent;
});