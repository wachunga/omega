define([
	'ko', 'underscore', 'jquery', 'Issue', 'error/NoSuchIssueError', 'TagFilter'
], function (ko, _, $, Issue, NoSuchIssueError, TagFilter) {

	function IssueManager(socket) {
		this.socket = socket;

		this.openIssues = ko.observableArray();
		this.closedIssues = ko.observableArray();
		this.allIssues = ko.computed(function () {
			return this.openIssues().concat(this.closedIssues());
		}, this);
		this.tagFilters = ko.observableArray();
		this.showClosed = ko.observable(false);

		this.displayedIssues = ko.computed(function () {
			if (!this.showClosed()) {
				return this.openIssues().sort(Issue.sort);
			} else {
				return this.allIssues().sort(Issue.sort);
			}
		}, this);
		this.showClosed.subscribe(this.filterIssueList, this);

		this.filteredIssuesCount = ko.computed(function () {
			return _.filter(this.displayedIssues(), function (issue) {
				return !issue.filtered();
			}).length;
		}, this);
		this.highlightedIssue = ko.observable();

		this.issueFilterInstant = ko.observable();
		this.issueFilter = ko.computed(this.issueFilterInstant).extend({ throttle: 400 });
		this.issueFilter.subscribe(this.filterIssueList, this);

		var that = this;
		this.socket.on('issues', function (issues) {
			var mapped = _.map(issues, function (issue) {
			    return new Issue(issue.id, issue);
			});
			that.initTagFilters(mapped);
			that.filterIssueList(mapped);

			var open = [];
			var closed = [];
			_.each(mapped, function (issue) {
				if (issue.closed()) {
					return closed.push(issue);
				}
				open.push(issue);
			});
			that.openIssues(open);
			that.closedIssues(closed);
		});

		this.socket.on('issue created', function (event) {
			var newIssue = new Issue(event.details.issue.id, event.details.issue);
			filterIssue(newIssue, that);
			that.openIssues.push(newIssue);
		});
		this.socket.on('issue assigned', function (event) {
			var issue = that.findIssue(event.details.issue.id);
			issue.assignee(event.details.issue.assignee);
		});
		this.socket.on('issue tagged', function (event) {
			var issue = that.findIssue(event.details.issue.id);
			var tags = event.details.issue.tags;
			var newTag = _.first(_.difference(tags, issue.tags()));
			issue.tags(tags);
			that.addTagFilterIfNecessary(newTag);
			filterIssue(issue, that);
		});
		this.socket.on('issue untagged', function (event) {
			var issue = that.findIssue(event.details.issue.id);
			var oldTags = issue.tags();
			issue.tags([]);
			_.each(oldTags, function (tag) {
				var stillUsed = _.any(that.allIssues(), function (issue) {
					return _.include(issue.tags(), tag);
				});
				if (!stillUsed) {
					that.removeTagFilter(tag);
				}
			});
			filterIssue(issue, that);
		});
		this.socket.on('issue prioritized', _.bind(this.refreshIssue, this));
		this.socket.on('issue updated', function (props, event) {
			that.refreshIssue(props, event);
			var issue = that.findIssue(event.details.issue.id);
			filterIssue(issue, that);
		});
		this.socket.on('issue closed', function (event) {
			var issue = that.findIssue(event.details.issue.id);
			issue.closer(event.details.issue.closer);
			issue.closedDate(event.details.issue.closedDate);
			issue.closed(true);
			filterIssue(issue, that);
		});
	}

	function filterIssue(issue, model) {
		var filters = model.tagFilters();
		issue.updateFiltered(model.showClosed(), TagFilter.getOn(filters), TagFilter.getOff(filters), getFilterInputValue());
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

	IssueManager.prototype.removeTagFilter = function (tag) {
		this.tagFilters.remove(function (item) {
			return item.label === tag;
		});
	};

	IssueManager.prototype.addTagFilterIfNecessary = function (tag) {
		var alreadyExists = _.any(this.tagFilters(), function (tagFilter) {
			return tagFilter.label === tag;
		});
		if (!alreadyExists) {
			this.tagFilters.push(new TagFilter(tag));
		}
	};

	function getFilterInputValue() {
		return $.trim($("#issueFilter").val());
	}

	IssueManager.prototype.resetFilters = function () {
		this.showClosed(false);
		$("#issueFilter").val('');
		TagFilter.resetAll(this.tagFilters());
		this.filterIssueList();
	};

	IssueManager.prototype.tagFilterToggle = function (tagFilter) {
		tagFilter.toggle();
		this.filterIssueList();
	};

	IssueManager.prototype.filterIssueList = function (issues) {
		var issuesToFilter = _.isArray(issues) ? issues : this.displayedIssues();

		var showClosed = this.showClosed();
		var requiredTags = TagFilter.getOn(this.tagFilters());
		var forbiddenTags = TagFilter.getOff(this.tagFilters());
		var filterValue = getFilterInputValue();

		_.each(issuesToFilter, function (issue) {
			issue.updateFiltered(showClosed, requiredTags, forbiddenTags, filterValue);
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
		var issue = this.findIssue(event.details.issue.id);
		_.each(_.keys(props), function (key) {
			var value = event.details.issue[key];
			if (ko.isObservable(issue[key])) {
				issue[key](value);
			} else {
				issue[key] = value;
			}
		});
	};

	return IssueManager;

});