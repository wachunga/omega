
var isNode = (typeof exports !== 'undefined');

(function(exports){

	if (isNode) {
		var _ = require('underscore');
	}
	
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
	};
	
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
		NewIssue: new OmegaEventType("newIssue", "<%= issue.creator %> created <%= issue.id %>.", "New issue", "<%= issue.description %>"),
		AssignIssue: new OmegaEventType("assignIssue", "<%= assigner %> assigned <%= issue.id %> to <%= issue.assignee %>."),
		UpdateIssue: new OmegaEventType("updateIssue", "<%= updater %> updated <%= issue.id %>."),
		CloseIssue: new OmegaEventType("closeIssue", "<%= issue.closer %> closed <%= issue.id %>.", "Issue closed", "<%= issue.description %>"),
		PrioritizeIssue: new OmegaEventType("prioritizeIssue", "<%= updater %> marked <%= issue.id %> as<% if (!issue.critical) print(' not'); %> critical.")
	};
	
	exports.OmegaEvent = OmegaEvent;

})(isNode ? exports : (OmegaIssueTracker = OmegaIssueTracker || {}));