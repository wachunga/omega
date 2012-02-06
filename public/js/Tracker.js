/* global window */

define([
	'jquery', 'underscore', 'ko', 'timeago',
	'util', 'Issue', 'Notifier', 'UserManager', 'MessageList', 'IssueManager'
],
function ($, _, ko, timeago, util, Issue, Notifier, UserManager, MessageList, IssueManager) {

	var BAD_COMMAND_RESPONSES = [
		'Oops.', 'This is not a Turing test.',
		'The least you could do is be grammatical.',
		'That does not compute.',
		'I can haz parser.',
		'These are not the droids you\'re looking for.'
	];

	var Tracker = function ($nameInput, $messageInput, $form, $messageList, socket) {
		var that = this;

		this.socket = socket;
		this.messageList = new MessageList($messageList, socket);
		this.userManager = new UserManager($nameInput, socket);
		this.issueManager = new IssueManager(socket);
		this.notifier = new Notifier(this.userManager, socket);
		this.$messageInput = $messageInput;

		this.disconnected = ko.observable();
		this.loading = ko.observable(true);

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
	
	function isCommand(input) {
		return input.trim().charAt(0) === "/";
	}
	
	function requireArgument() {
		_.each(arguments, function (arg) {
			if (!arg) {
				throw "Invalid or missing argument.";	
			}
		});
	}
	
	function getArgument(string, argToReturn) {
		var match = string.match(/(\d+)(?:\s+(.+))?/);
		return match ? match[argToReturn] : null;
	}
	
	// @VisibleForTesting
	Tracker.prototype.notifyOfBadCommand = function () {
		window.alert(util.getRandomItem(BAD_COMMAND_RESPONSES) + ' Try /help.'); // TODO: style
	};

	Tracker.prototype.handleInput = function () {
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
					var id = parseInt(rest, 10);
					requireArgument(id);
					this.issueManager.closeIssue(id);
					break;
				case 'reopen':
					var id = parseInt(rest, 10);
					requireArgument(id);
					this.issueManager.updateIssue(id, { closed: false });
					break;
				case 'unassign':
					var id = parseInt(rest, 10);
					requireArgument(id);
					this.issueManager.assignIssue(id, 'nobody');
					break;
				case 'assign':
				case '@':
					var id = parseInt(getArgument(rest, 1), 10);
					var assignee = getArgument(rest, 2);
					requireArgument(id);
					this.issueManager.assignIssue(id, assignee);
					break;
				case 'critical':
				case 'urgent':
				case '!':
				case '*':
				case 'star':
					var id = parseInt(getArgument(rest, 1), 10);
					requireArgument(id);
					this.issueManager.prioritizeIssue(id);
					break;
				case 'edit':
				case 'update':
					// only allow editing the description
					var id = parseInt(getArgument(rest, 1), 10);
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
			this.notifyOfBadCommand();
		}
	};

	Tracker.prototype.send = function (message) {
		this.socket.emit('user message', message);
	};

	Tracker.prototype.reset = function () {
		if (window.confirm('Warning: this will completely delete all issues from the server.')) {
			if (window.confirm('I have a bad feeling about this. Are you absolutely sure?')) {
				this.socket.emit('reset issues');
			}
		}
	};

	// doesn't highlight if filtering issues, but not a big deal
	Tracker.prototype.checkHashForBookmark = function () {
		var bookmarked = parseInt(window.location.hash.substring(1), 10);
		var found = this.issueManager.findIssue(bookmarked);
		if (!found) {
			return;
		}

		this.issueManager.highlightIssue(found);

		var $target = $(window.location.hash);
		if ($target.length) {
			var pos = $target.offset();
			window.scrollTo(pos.left, pos.top);
		}
	};

	Tracker.prototype.applyTimeago = function (elements) {
		_.each(elements, function (element) {
			var $time = $(element).find("time");
			if ($time && $time.length) {
				$time.timeago();
			}
		});
	};
	
	return Tracker;
	
});
