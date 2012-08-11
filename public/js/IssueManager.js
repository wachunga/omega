define([
	'ko', 'underscore', 'jquery', 'Issue', 'error/NoSuchIssueError', 'TagFilter'
], function (ko, _, $, Issue, NoSuchIssueError, TagFilter) {

	function IssueManager(socket) {
		this.socket = socket;

		this.allIssues = ko.observableArray();
		this.tagFilters = ko.observableArray();

		this.hideClosed = ko.observable(true);
		this.hideClosed.subscribe(this.filterIssueList, this);

		this.sortedIssues = ko.computed(function () {
			return this.allIssues().sort(Issue.sort);
		}, this);
		this.filteredIssuesCount = ko.computed(function () {
			return _.filter(this.sortedIssues(), function (issue) {
				return !issue.filtered();
			}).length;
		}, this);
		this.highlightedIssue = ko.observable();

		this.issueFilterInstant = ko.observable();
		this.issueFilter = ko.computed(this.issueFilterInstant).extend({ throttle: 400 });
		this.issueFilter.subscribe(this.filterIssueList, this);

		var that = this;
		this.socket.on('issues', function (issues) {
			that.allIssues(_.map(issues, function (issue) {
				return new Issue(issue.id, issue);
			}));
			that.initTagFilters(that.allIssues());
			that.filterIssueList();
		});

		this.socket.on('issue created', function (event) {
			var newIssue = new Issue(event.issue.id, event.issue);
			filterIssue(newIssue, that);
			that.allIssues.push(newIssue);
		});
		this.socket.on('issue assigned', function (event) {
			var issue = that.findIssue(event.issue.id);
			issue.assignee(event.issue.assignee);
		});
		this.socket.on('issue tagged', function (event) {
			var issue = that.findIssue(event.issue.id);
			issue.tags(event.issue.tags);
			filterIssue(issue, that);
		});
		this.socket.on('issue untagged', function (event) {
			var issue = that.findIssue(event.issue.id);
			issue.tags([]);
			filterIssue(issue, that);
		});
		this.socket.on('issue updated', _.bind(this.refreshIssue, this));
		this.socket.on('issue prioritized', _.bind(this.refreshIssue, this));
		this.socket.on('issue closed', function (event) {
			var issue = that.findIssue(event.issue.id);
			issue.closer(event.issue.closer);
			issue.closed(true);
			filterIssue(issue, that);
		});
	}

	function filterIssue(issue, model) {
		var filters = model.tagFilters();
		issue.updateFiltered(model.hideClosed(), TagFilter.getOn(filters), TagFilter.getOff(filters), getFilterInputValue());
	}

	function getUniqueTags(issues) {
		return _.chain(issues)
			.map(function (issue) {
				if (issue.tags().length) {
					return issue.tags();
				}
			})
			.compact().flatten().uniq().value();
	}

	IssueManager.prototype.initTagFilters = function (issues) {
		var tags = getUniqueTags(issues);

		this.tagFilters(_.map(tags, function (tag) {
			return new TagFilter(tag);
		}));
	};

	function getFilterInputValue() {
		return $("#issueFilter").val().trim();
	}

	IssueManager.prototype.resetFilters = function () {
		this.hideClosed(true);
		$("#issueFilter").val('');
		TagFilter.resetAll(this.tagFilters());
		this.filterIssueList();
	};

	IssueManager.prototype.tagFilterToggle = function (tagFilter) {
		tagFilter.toggle();
		this.filterIssueList();
	};

	IssueManager.prototype.filterIssueList = function () {
		console.log('filtering list');

		var hideClosed = this.hideClosed();
		var requiredTags = TagFilter.getOn(this.tagFilters());
		var forbiddenTags = TagFilter.getOff(this.tagFilters());
		var filterValue = getFilterInputValue();

		_.each(this.sortedIssues(), function (issue) {
			issue.updateFiltered(hideClosed, requiredTags, forbiddenTags, filterValue);
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