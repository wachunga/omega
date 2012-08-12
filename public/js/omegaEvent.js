define(['underscore'], function (_) {

	function OmegaEvent(type, details) {
		this.type = type;
		this.issue = details.issue;
		this.speaker = details.speaker;
		this.message = _.template(type.message, details);
		this.timestamp = new Date();
		
		if (type.notificationTitle) {
			this.notification = {
				title: _.template(type.notificationTitle, details),
				body: _.template(type.notificationBody, details)
			};
		}
	}

	function OmegaEventType(name, message, notificationTitle, notificationBody) {
		this.name = name;
		this.message = message;

		if (notificationTitle && notificationBody) {
			this.notificationTitle = notificationTitle;
			this.notificationBody = notificationBody;
		}
	}

	// TODO: this should be client only
	OmegaEvent.Type = {
		UserMessage: new OmegaEventType("userMessage", "<%= message %>", "<%= speaker %> says...", "<%= message %>"),
		NewIssue: new OmegaEventType("newIssue", "<%= issue.creator %> created $id$<%= issue.id %>.", "New issue", "<%= issue.description %>"),
		AssignIssue: new OmegaEventType("assignIssue", "<%= assigner %> assigned $id$<%= issue.id %> to <%= issue.assignee %>."),
		TagIssue: new OmegaEventType("tagIssue", "<%= updater %> tagged $id$<%= issue.id %> with '<%= tag %>'."),
		UntagIssue: new OmegaEventType("untagIssue", "<%= updater %> removed tags from $id$<%= issue.id %>."),
		UpdateIssue: new OmegaEventType("updateIssue", "<%= updater %> updated $id$<%= issue.id %>."),
		CloseIssue: new OmegaEventType("closeIssue", "<%= issue.closer %> closed $id$<%= issue.id %>.", "Issue closed", "<%= issue.description %>"),
		PrioritizeIssue: new OmegaEventType("prioritizeIssue", "<%= updater %> marked $id$<%= issue.id %> as<% if (!issue.critical) print(' not'); %> critical.")
	};
	
	return OmegaEvent;
});