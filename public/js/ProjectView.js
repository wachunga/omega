/* global window */

define([
	'jquery', 'underscore', 'ko', 'timeago', 'tooltips',
	'util', 'Issue', 'Notifier', 'UserManager', 'MessageList', 'IssueManager', 'error/NoSuchIssueError'
],
function ($, _, ko, timeago, tooltips, util, Issue, Notifier, UserManager, MessageList, IssueManager, NoSuchIssueError) {

	var BAD_COMMAND_RESPONSES = [
		'Oops.', 'This is not a Turing test.',
		'The least you could do is be grammatical.',
		'That does not compute.',
		'I can haz parser.',
		'These are not the droids you\'re looking for.'
	];

	var ProjectView = function ($nameInput, $messageInput, $messageList, socket) {
		var that = this;

		this.socket = socket;
		this.messageList = new MessageList($messageList, socket);
		this.userManager = new UserManager($nameInput, socket);
		this.issueManager = new IssueManager(socket);
		this.notifier = new Notifier(this.userManager, socket);
		this.$messageInput = $messageInput;

		this.disconnected = ko.observable();
		this.loading = ko.observable(true);

		this.initTooltips();

		$(window).bind('hashchange', _.bind(this.checkHashForBookmark, this));

		this.hideClosed = ko.observable(true);
		this.hideAssigned = ko.observable(false);
		this.helpOpen = ko.observable(false);
		this.addHtmlLinks = util.addHtmlLinks;

		ko.applyBindings(this);

		this.socket.on('connect', function () {
			that.disconnected(false);
			that.userManager.loginExistingUserIfAny();
			that.loading(false);
		});

		this.socket.on('disconnect', function () {
			that.disconnected(true);
		});

		this.socket.on('issues', function (issues) {
			that.checkHashForBookmark();
		});
	};

	ProjectView.prototype.initTooltips = function () {
		var that = this;
		$('#messages').tooltip({
			selector: '.id',
			placement: 'right',
			delay: 0,
			title: function () {
				var issue = that.issueManager.findIssue($(this).data('id'));
				var assignee = issue.assigneeLabel();
				var tooltip = assignee ? assignee + ' ' : '';
				return tooltip + issue.description();
			}
		});
	};
	
	function isCommand(input) {
		return input.trim().charAt(0) === "/";
	}

	function ArgError(message) {
		this.name = "ArgError";
		this.message = "Invalid or missing argument.";
	}

	function requireArgument() {
		_.each(arguments, function (arg) {
			if (!arg) {
				throw new ArgError();
			}
		});
	}
	
	function getArgument(string, argToReturn) {
		if (!string) {
			return null;
		}
		var match = string.match(/(\d+)(?:\s+(.+))?/);
		return match ? match[argToReturn] : null;
	}
	
	// @VisibleForTesting
	ProjectView.prototype.notifyOfBadCommand = function () {
		window.alert(util.getRandomItem(BAD_COMMAND_RESPONSES) + ' Try /help.'); // TODO: style
	};
	ProjectView.prototype.notifyNoSuchIssue = function (error) {
		window.alert(error.toString());
	};

	ProjectView.prototype.filterByTag = function (tag) {
		this.issueManager.issueFilterInstant('tag:' + tag);
		$('#issueFilter').focus();
	};

	ProjectView.prototype.togglePriority = function (issue) {
		if (this.userManager.noUser()) {
			return;
		}
		this.issueManager.prioritizeIssue(issue.id);
	};

	// TODO: extract command parsing etc.
	ProjectView.prototype.handleInput = function () {
		if (this.userManager.noUser()) {
			this.userManager.attemptLogin();
			return;
		}

		if (!this.userManager.loggedIn()) {
			return;
		}
		var input = this.$messageInput.val();
		this.$messageInput.val('');
		
		if (!input || input.length < 1) {
			return;
		}
		
		if (!isCommand(input)) {
			this.send(input); // assume chat message
			return;
		}

		try {
			var matches = input.match(/[:\/]([\S]+)(?:\s+(.*))?/);
			var cmd = matches[1] && matches[1].trim();
			var rest = matches[2] && matches[2].trim();

			var id;
			switch (cmd.toLowerCase()) {
				case 'help':
				case '?':
					this.helpOpen(!this.helpOpen());
					break;
				case 'add':
				case 'create':
				case 'nouveau':
				case 'new':
				case 'open':
					requireArgument(rest);
					this.issueManager.createIssue(rest);
					break;
				case 'close':
				case 'resolve':
				case 'done':
					id = parseInt(rest, 10);
					requireArgument(id);
					this.issueManager.closeIssue(id);
					break;
				case 'reopen':
					id = parseInt(rest, 10);
					requireArgument(id);
					this.issueManager.updateIssue(id, { closed: false });
					break;
				case 'unassign':
					id = parseInt(rest, 10);
					requireArgument(id);
					this.issueManager.assignIssue(id, 'nobody');
					break;
				case 'assign':
				case '@':
					id = parseInt(getArgument(rest, 1), 10);
					var assignee = getArgument(rest, 2);
					requireArgument(id);
					this.issueManager.assignIssue(id, assignee);
					break;
				case 'tag':
					id = parseInt(getArgument(rest, 1), 10);
					var tag = getArgument(rest, 2);
					requireArgument(id, tag);
					this.issueManager.tagIssue(id, tag);
					break;
				case 'untag':
					id = parseInt(getArgument(rest, 1), 10);
					requireArgument(id);
					this.issueManager.untagIssue(id);
					break;
				case 'critical':
				case 'urgent':
				case '!':
				case '*':
				case 'star':
					id = parseInt(getArgument(rest, 1), 10);
					requireArgument(id);
					this.issueManager.prioritizeIssue(id);
					break;
				case 'edit':
				case 'update':
					// only allow editing the description
					id = parseInt(getArgument(rest, 1), 10);
					var desc = getArgument(rest, 2);
					requireArgument(id, desc);
					this.issueManager.updateIssue(id, { description: desc });
					break;
				case 'reset':
					this.reset();
					break;
				default:
					this.notifyOfBadCommand();
					break;
			}
		} catch (e) {
			if (e instanceof ArgError) {
				this.notifyOfBadCommand();
			} else if (e instanceof NoSuchIssueError) {
				this.notifyNoSuchIssue(e);
			} else {
				throw e;
			}
		}
	};

	ProjectView.prototype.send = function (message) {
		this.socket.emit('user message', message);
	};

	ProjectView.prototype.reset = function () {
		if (window.confirm('Warning: this will completely delete all issues from the server.')) {
			if (window.confirm('I have a bad feeling about this. Are you absolutely sure?')) {
				this.socket.emit('reset issues');
			}
		}
	};

	// doesn't highlight if filtering issues, but not a big deal
	ProjectView.prototype.checkHashForBookmark = function () {
		var bookmarked = parseInt(window.location.hash.substring(1), 10);

		try {
			this.issueManager.highlightIssue(bookmarked);

			var $target = $(window.location.hash);
			if ($target.length) {
				var pos = $target.offset();
				window.scrollTo(pos.left, pos.top);
			}
		} catch (e) {
			if (!(e instanceof NoSuchIssueError)) {
				throw e;
			}
		}

	};

	ProjectView.prototype.applyTimeago = function (elements) {
		_.each(elements, function (element) {
			var $time = $(element).find("time");
			if ($time && $time.length) {
				$time.timeago();
			}
		});
	};
	
	return ProjectView;
	
});
