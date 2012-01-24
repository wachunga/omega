/* global window */

define([
	'jquery', 'underscore', 'ko', 'timeago',
	'util', 'Issue', 'Notifier', 'SocketManager', 'UserManager', 'MessageList'
],
function ($, _, ko, timeago, util, Issue, Notifier, socket, UserManager, MessageList) {

	var FLAVOUR = [
		'You, sir, are a genius.', 'Die issues, die!', '*golf clap*',
		'Ω &hearts; you.', 'You deserve a break.',
		'Not bad, not bad at all.', 'FTW!'
	];
	var BAD_COMMAND_RESPONSES = [
		'Oops.', 'This is not a Turing test.',
		'The least you could do is be grammatical.',
		'That does not compute.',
		'I can haz parser.',
		'These are not the droids you\'re looking for.'
	];

	var Tracker = function ($nameInput, $messageInput, $form, $messageList) {
		var that = this;

		this.messageList = new MessageList($messageList);
		this.userManager = new UserManager($nameInput);
		this.notifier = new Notifier();
		this.$messageInput = $messageInput;

		this.disconnected = ko.observable();

		this.version = ko.observable();
		this.shortVersion = ko.dependentObservable(function () {
			return this.version() && this.version().substr(0,7);			
		}, this);

		this.issues = ko.observableArray();
		this.sortedIssues = ko.dependentObservable(function () {
			return this.issues().sort(Issue.sort);
		}, this);
		this.openIssuesCount = ko.dependentObservable(function () {
			return _.select(this.issues(), function (issue) {
				return !issue.closed();
			}).length;
		}, this);
		this.highlightedIssue = ko.observable();

		this.hideClosed = ko.observable(true);
		this.hideAssigned = ko.observable(false);
		this.helpOpen = ko.observable(false);
		this.addHtmlLinks = util.addHtmlLinks;

		ko.applyBindings(this);

		$(window).bind('hashchange', _.bind(this.showBookmarkedIssue, this));
		
		socket.on('connect', function () {
			that.disconnected(false);
			that.userManager.loginExistingUserIfAny();
		});

		socket.on('disconnect', function () {
			that.disconnected(true);
		});
		
		socket.on('issues', function (issues) {
			that.issues(_.map(issues, function (issue) {
				return new Issue(issue.id, issue);
			}));
			that.showBookmarkedIssue();
		});
		
		socket.on('user message', function (event) {
			that.messageList.append(event);
			that.notifier.notify(event.speaker, event);
		});
		
		socket.on('issue created', function (event) {
			that.messageList.append(event);
			that.notifier.notify(event.issue.creator, event);
			
			that.issues.push(new Issue(event.issue.id, event.issue));
		});	

		// FIXME - unused
		function addFlavour(text) {
			return text + ' ' + util.getRandomItem(FLAVOUR);
		}
		
		socket.on('issue closed', function (closer, event) {
			that.messageList.append(event);
			that.notifier.notify(closer, event);
			
			var issue = that.findIssue(event.issue.id);
			issue.closed(true);
		});	
		
		socket.on('issue assigned', function (event) {
			that.messageList.append(event);
			var issue = that.findIssue(event.issue.id);
			issue.assignee(event.issue.assignee);
		});
		
		socket.on('issue updated', function (props, event) {
			that.messageList.append(event);
			that.refreshIssue(event.issue.id, props);
		});

		socket.on('issue prioritized', function (props, event) {
			that.messageList.append(event);
			that.refreshIssue(event.issue.id, props);
		});
		
		socket.on('version', function (version) {
			that.version(version);
		});
	};

	// doesn't highlight if filtering issues, but not a big deal
	Tracker.prototype.showBookmarkedIssue = function () {
		var bookmarked = parseInt(window.location.hash.substring(1), 10);
		var found = _.detect(this.issues(), function (issue) { 
			return issue.id === bookmarked;
		});
		if (!found) {
			return;
		}
		
		this.highlightedIssue(found.id);
		
		var $target = $(window.location.hash);
		if ($target.length) {
			var pos = $target.offset();
			window.scrollTo(pos.left, pos.top);
		}
	};
	
	Tracker.prototype.findIssue = function (id) {
		return _.find(this.issues(), function (issue) {
			return issue.id === id;
		});
	};
	
	function isCommand(input) {
		return _.include([':', '/'], input.trim().charAt(0));
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
					this.createIssue(rest);
					break;
				case 'close':
				case 'resolve':
					var id = parseInt(rest, 10);
					requireArgument(id);
					this.closeIssue(id);
					break;
				case 'reopen':
					var id = parseInt(rest, 10);
					requireArgument(id);
					this.updateIssue(id, { closed: false });
					break;
				case 'unassign':
					var id = parseInt(rest, 10);
					requireArgument(id);
					this.assignIssue(id, 'nobody');
					break;
				case 'assign':
				case '@':
					var id = parseInt(getArgument(rest, 1), 10);
					var assignee = getArgument(rest, 2);
					requireArgument(id);
					this.assignIssue(id, assignee);
					break;
				case 'critical':
				case 'urgent':
				case '!':
				case '*':
				case 'star':
					var id = parseInt(getArgument(rest, 1), 10);
					requireArgument(id);
					this.prioritizeIssue(id);
					break;
				case 'edit':
				case 'update':
					// only allow editing the description
					var id = parseInt(getArgument(rest, 1), 10);
					var desc = getArgument(rest, 2);
					requireArgument(id, desc);
					this.updateIssue(id, { description: desc });
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

	Tracker.prototype.createIssue = function (desc) {
		socket.emit('new issue', desc);
	};
	
	Tracker.prototype.assignIssue = function (id, assignee) {
		socket.emit('assign issue', id, assignee);
	};
	
	Tracker.prototype.closeIssue = function (id) {
		if (this.findIssue(id).closed()) {
			return;
		}
		socket.emit('close issue', id);
	};
	
	Tracker.prototype.updateIssue = function (id, props) {
		socket.emit('update issue', id, props);
	};

	Tracker.prototype.prioritizeIssue = function (id) {
		socket.emit('prioritize issue', id);
	};

	Tracker.prototype.reset = function () {
		if (window.confirm('Warning: this will completely delete all issues from the server.')) {
			if (window.confirm('I have a bad feeling about this. Are you absolutely sure?')) {
				socket.emit('reset issues');
			}
		}
	};

	Tracker.prototype.send = function (message) {
		socket.emit('user message', message);
	};

	Tracker.prototype.refreshIssue = function (id, props) {
		var issue = this.findIssue(id);
		_.each(props, function (value, key) {
			if (ko.isObservable(issue[key])) {
				issue[key](value);
			} else {
				issue[key] = value;
			}
		});
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
