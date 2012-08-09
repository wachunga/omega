define(['ko', 'underscore', 'jquery', 'Issue', 'error/NoSuchIssueError'], function (ko, _, $, Issue, NoSuchIssueError) {

	function IssueManager(socket) {
		this.socket = socket;

		this.allIssues = ko.observableArray();
		this.sortedIssues = ko.computed(function () {
			return this.allIssues().sort(Issue.sort);
		}, this);
		this.openIssuesCount = ko.computed(function () {
			return _.select(this.allIssues(), function (issue) {
				return !issue.closed();
			}).length;
		}, this);
		this.closedIssuesCount = ko.computed(function () {
			return this.allIssues().length - this.openIssuesCount();
		}, this);
		this.highlightedIssue = ko.observable();

		this.issueFilterInstant = ko.observable();
		this.issueFilter = ko.computed(this.issueFilterInstant).extend({ throttle: 400 });

		this.filteredIssues = ko.observableArray([]);
		this.issueFilter.subscribe(this.filterIssueList, this);

		var that = this;
		this.socket.on('issues', function (issues) {
			that.allIssues(_.map(issues, function (issue) {
				return new Issue(issue.id, issue);
			}));
		});

		this.socket.on('issue created', function (event) {
			that.allIssues.push(new Issue(event.issue.id, event.issue));
		});
		this.socket.on('issue assigned', function (event) {
			var issue = that.findIssue(event.issue.id);
			issue.assignee(event.issue.assignee);
		});
		this.socket.on('issue tagged', function (event) {
			var issue = that.findIssue(event.issue.id);
			issue.tags(event.issue.tags);
		});
		this.socket.on('issue untagged', function (event) {
			var issue = that.findIssue(event.issue.id);
			issue.tags([]);
		});
		this.socket.on('issue updated', _.bind(this.refreshIssue, this));
		this.socket.on('issue prioritized', _.bind(this.refreshIssue, this));
		this.socket.on('issue closed', function (event) {
			var issue = that.findIssue(event.issue.id);
			issue.closer(event.issue.closer);
			issue.closed(true);
		});

	}

	IssueManager.prototype.filterIssueList = function (filterValue) {
		filterValue = filterValue.trim();

		// supports tag:<tag>
		if (filterValue.substr(0,4) === 'tag:') {
			var tag = filterValue.substr(4);
			_.each(this.sortedIssues(), function (issue) {
				issue.filtered(!_.include(issue.tags(), tag));
			});
			return;
		}

		var regex = new RegExp(filterValue, 'mi');

		_.each(this.sortedIssues(), function (issue) {
			var tags = issue.tags().join(' ');
			if (!filterValue || regex.test(issue.description() + tags)) {
				issue.filtered(false);
			} else {
				issue.filtered(true); // no match, so hide
			}
		});
	};

	IssueManager.prototype.findIssue = function (id) {
		var issue = _.find(this.allIssues(), function (issue) {
			return issue.id === id;
		});
		if (!issue) {
			throw new NoSuchIssueError(id);
		}
		return issue;
	};

	IssueManager.prototype.createIssue = function (desc) {
		this.socket.emit('new issue', desc);
	};

	IssueManager.prototype.assignIssue = function (id, assignee) {
		this.findIssue(id);
		this.socket.emit('assign issue', id, assignee);
	};

	IssueManager.prototype.tagIssue = function (id, tag) {
		this.findIssue(id);
		this.socket.emit('tag issue', id, tag);
	};

	IssueManager.prototype.untagIssue = function (id) {
		this.findIssue(id);
		this.socket.emit('untag issue', id);
	};

	IssueManager.prototype.closeIssue = function (id) {
		var issue = this.findIssue(id);
		if (issue.closed()) {
			return;
		}
		this.socket.emit('close issue', id);
	};

	IssueManager.prototype.updateIssue = function (id, props) {
		this.findIssue(id);
		this.socket.emit('update issue', id, props);
	};

	IssueManager.prototype.prioritizeIssue = function (id) {
		this.findIssue(id);
		this.socket.emit('prioritize issue', id);
	};

	IssueManager.prototype.highlightIssue = function (id) {
		this.findIssue(id);
		this.highlightedIssue(id);
	};

	IssueManager.prototype.refreshIssue = function (props, event) {
		var issue = this.findIssue(event.issue.id);
		_.each(_.keys(props), function (key) {
			var value = event.issue[key];
			if (ko.isObservable(issue[key])) {
				issue[key](value);
			} else {
				issue[key] = value;
			}
		});
	};

	return IssueManager;

});