/* global window */

define([
	'jquery', 'underscore', 'ko', 'timeago', 'tooltips',
	'util', 'Issue', 'Notifier', 'UserManager', 'MessageList', 'IssueManager', 'error/NoSuchIssueError', 'flavour'
],
function ($, _, ko, timeago, tooltips, util, Issue, Notifier, UserManager, MessageList, IssueManager, NoSuchIssueError, flavour) {

	var ProjectView = function ($nameInput, $messageInput, $messageList, socket) {
		var that = this;

		this.socket = socket;
		this.messageList = new MessageList($messageList, socket);
		this.userManager = new UserManager($nameInput, socket);
		this.issueManager = new IssueManager(socket);
		this.notifier = new Notifier(this.userManager, socket);
		this.$messageInput = $messageInput;

		this.alert = ko.observable();
		this.disconnected = ko.observable();
		this.loading = ko.observable(true);

		this.initTooltips();
		this.warnIfBrowserSucks();

		$(window).bind('hashchange', _.bind(this.checkHashForBookmark, this));

		this.helpOpen = ko.observable(false);
		this.filtersOpen = ko.observable(false);

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

	ProjectView.prototype.warnIfBrowserSucks = function () {
		if (!util.isLocalStorageSupported()) {
			this.alert('Your browser has been found to be lacking. For the best experience, update your browser already.');
			return;
		}
	};

	ProjectView.prototype.initTooltips = function () {
		var that = this;
		$('body').tooltip({
			selector: '.tooltipped'
		});
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
		return $.trim(input).charAt(0) === "/";
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

	function eachID(id, this_, funcToCall, args) {
		if (typeof args == 'undefined'){ 
		       args = [];
		}
		var ids = id.split(',');
		args.unshift(parseInt(id[0], 10));

		_.each(ids, function(i){
            args[0] = parseInt(i, 10);
            requireArgument(args[0]);
			funcToCall.apply(this_, args);
		});
	}
	
	ProjectView.prototype.notifyOfBadCommand = function () {
		this.alert(flavour.badCommand() + ' Try /help.');
	};
	ProjectView.prototype.notifyNoSuchIssue = function (error) {
		this.alert(error.toString());
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

	ProjectView.prototype.toggleFilters = function (issue) {
		this.filtersOpen(!this.filtersOpen());
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

		this.$messageInput.focus();
		if (!isCommand(input)) {
			this.send(input); // assume chat message
			return;
		}

		try {
			var matches = input.match(/[:\/]([\S]+)(?:\s+(.*))?/);
			var cmd = matches[1] && $.trim(matches[1]);
			var rest = matches[2] && $.trim(matches[2]);

			var id;
			switch (cmd.toLowerCase()) {
				case 'help':
				case '?':
					this.helpOpen(!this.helpOpen());
					if (this.helpOpen()) {
						$("html, body").animate({ scrollTop: 0 }, "slow");
					}
					break;
				case 'export':
					window.location.href += '/export';
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
                    requireArgument(rest);
					id = rest.split(' ')[0];
					eachID(id, this.issueManager, this.issueManager.closeIssue);

					break;
				case 'reopen':
                    requireArgument(rest);
					id = rest.split(' ')[0];
					eachID(id, this.issueManager, this.issueManager.updateIssue, [{ closed: false }]);

					break;
				case 'unassign':
                    requireArgument(rest);
					id = rest.split(' ')[0];
					eachID(id, this.issueManager, this.issueManager.assignIssue, ['nobody']);

					break;
				case 'assign':
				case '@':
                    requireArgument(rest);
					//The first argument are the ids
					id = rest.split(' ')[0];
					//The rest are asignee
					var assignee = rest.split(' ');
					assignee.shift();
					assignee = assignee.join(' ');

                    if (assignee === ''){
                        assignee = undefined;
                    }

					eachID(id, this.issueManager, this.issueManager.assignIssue, [assignee]);

					break;
				case 'tag':
                    requireArgument(rest); //check if no args
					//The first argument are the ids
					id = rest.split(' ')[0];
					//The rest are tag
					var tag = rest.split(' ');
					tag.shift();
					tag = tag.join(' ');

					requireArgument(id, tag);
					eachID(id, this.issueManager, this.issueManager.tagIssue, [tag]);

					break;
				case 'untag':
                    requireArgument(rest);
					id = rest.split(' ')[0];
					eachID(id, this.issueManager, this.issueManager.untagIssue);

					break;
				case 'critical':
				case 'urgent':
				case '!':
				case '*':
				case 'star':
                    requireArgument(rest);
					id = rest.split(' ')[0];
					eachID(id, this.issueManager, this.issueManager.prioritizeIssue);

					break;
				case 'edit':
				case 'update':
					// only allow editing the description
					id = parseInt(getArgument(rest, 1), 10);
					var desc = getArgument(rest, 2);
					requireArgument(id, desc);
					this.issueManager.updateIssue(id, { description: desc });
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

	ProjectView.prototype.reconnect = function () {
		this.socket.socket.connect();
	};

	var headerOffset = 110;

	// doesn't highlight if filtering issues, but not a big deal
	ProjectView.prototype.checkHashForBookmark = function () {
		var bookmarked = parseInt(window.location.hash.substring(1), 10);

		try {
			this.issueManager.highlightIssue(bookmarked);

			var $target = $(window.location.hash);
			if ($target.length) {
				var pos = $target.offset();
				window.scrollTo(pos.left, pos.top - headerOffset);
			}
		} catch (e) {
			if (!(e instanceof NoSuchIssueError)) {
				throw e;
			}
		}
	};
	
	return ProjectView;
	
});
