define(['ko', 'underscore', 'jquery', 'Issue'], function (ko, _, $, Issue) {

	function IssueManager(socket) {
		this.socket = socket;

		this.issues = ko.observableArray();
		this.sortedIssues = ko.computed(function () {
			return this.issues().sort(Issue.sort);
		}, this);
		this.openIssuesCount = ko.computed(function () {
			return _.select(this.issues(), function (issue) {
				return !issue.closed();
			}).length;
		}, this);
		this.closedIssuesCount = ko.computed(function () {
			return this.issues().length - this.openIssuesCount();
		}, this);
		this.highlightedIssue = ko.observable();

		var that = this;
		this.socket.on('issues', function (issues) {
			that.issues(_.map(issues, function (issue) {
				return new Issue(issue.id, issue);
			}));
		});

		this.socket.on('issue created', function (event) {
			that.issues.push(new Issue(event.issue.id, event.issue));
		});
		this.socket.on('issue assigned', function (event) {
			var issue = that.findIssue(event.issue.id);
			issue.assignee(event.issue.assignee);
		});
		this.socket.on('issue updated', function (props, event) {
			that.refreshIssue(event.issue.id, props);
		});
		this.socket.on('issue prioritized', function (props, event) {
			that.refreshIssue(event.issue.id, props);
		});
		this.socket.on('issue closed', function (closer, event) {
			var issue = that.findIssue(event.issue.id);
			issue.closed(true);
		});

	}

	IssueManager.prototype.findIssue = function (id) {
		return _.find(this.issues(), function (issue) {
			return issue.id === id;
		});
	};

	IssueManager.prototype.createIssue = function (desc) {
		this.socket.emit('new issue', desc);
	};

	IssueManager.prototype.assignIssue = function (id, assignee) {
		this.socket.emit('assign issue', id, assignee);
	};

	IssueManager.prototype.closeIssue = function (id) {
		if (this.findIssue(id).closed()) {
			return;
		}
		this.socket.emit('close issue', id);
	};

	IssueManager.prototype.updateIssue = function (id, props) {
		this.socket.emit('update issue', id, props);
	};

	IssueManager.prototype.prioritizeIssue = function (id) {
		this.socket.emit('prioritize issue', id);
	};

	IssueManager.prototype.highlightIssue = function (issue) {
		this.highlightedIssue(issue.id);
	};

	IssueManager.prototype.refreshIssue = function (id, props) {
		var issue = this.findIssue(id);
		_.each(props, function (value, key) {
			if (ko.isObservable(issue[key])) {
				issue[key](value);
			} else {
				issue[key] = value;
			}
		});
	};

	return IssueManager;

});