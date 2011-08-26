/* global $, ko, socket, _, window */
var OmegaIssueTracker = {};
(function (OIT) {
	
	OIT.Issue = function (id, props) {
		this.id = id; // id should never change
		_.each(props, function (value, key) {
			if (key !== 'id') {
				this[key] = ko.observable(value);
			}
		}, this);
	};
	
	function getRandomItem(array) {
		return array[Math.floor(Math.random() * array.length)];
	}
	
	var USERNAME_KEY = 'OmegaIssueTracker.username';
	var NAMES = [
		'Captain Hammer', 'Release Llama', 'Chuck Norris',
		'Snozzcumber', 'Hurley', 'Inigo Montoya', 'Leeroy Jenkins'
	];
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
		'These are not the droids you\'re looking for'
	];
	
	OIT.Tracker = function ($messagesList, $nameInput, $messageInput, $form, socket) {
		var that = this;

		this.$messagesList = $messagesList;
		this.$nameInput = $nameInput;
		this.namePlaceholder = getRandomItem(NAMES);
		this.$messageInput = $messageInput;
		this.socket = socket;
		
		this.loggedIn = ko.observable(false);
		this.user = ko.observable(window.localStorage[USERNAME_KEY]);
		this.messages = ko.observableArray();
		this.onlineUsers = ko.observableArray();
		this.issues = ko.observableArray();
		this.openIssuesCount = ko.dependentObservable(function () {
			return _.select(this.issues(), function (issue) {
				return !issue.closed();
			}).length;
		}, this);
		
		this.hideClosed = ko.observable(false);
		this.helpOpen = ko.observable(false);

		ko.applyBindings(this);
		
		$form.submit(function (e) {
			e.preventDefault();
			that.handleInput();
		});
		
		this.socket.on('connect', function () {
			if (that.user()) {
				that.login();
			}
		});
		
		this.socket.on('disconnect', function () {
			// NOTE-DH: reconnect bug with socket.io: https://github.com/LearnBoost/socket.io/issues/388
			// manually reconnect as workaround
			that.socket.socket.reconnect();
		});
		
		this.socket.on('issues', function (issues) {
			that.issues(_.map(issues, function (issue) {
				return new OIT.Issue(issue.id, issue);
			}));
		});
		
		this.socket.on('usernames', function (users) {
			that.onlineUsers(_.values(users));
		});
		
		this.socket.on('user message', function (user, msg) {
			that.handleMessage(msg, user);
		});
		
		this.socket.on('announcement', function (msg) {
			that.handleMessage(msg);
		});
		
		this.socket.on('issue created', function (issue) {
			that.handleMessage(issue.creator + ' created ' + issue.id + '.');
			that.issues.push(new OIT.Issue(issue.id, issue));
		});	
		
		function addFlavour(text) {
			return text + ' ' + getRandomItem(FLAVOUR);
		}
		
		this.socket.on('issue closed', function (closer, id) {
			that.handleMessage(addFlavour(closer + ' closed ' + id + '.'));
			var issue = that.findIssue(id);
			issue.closed(true);
		});	
		
		this.socket.on('issue assigned', function (assigner, id, assignee) {
			that.handleMessage(assigner + ' assigned ' + id + ' to ' + assignee + '.');
			var issue = that.findIssue(id);
			issue.assignee(assignee);
		});
		
		this.socket.on('issue updated', function (updater, id, props) {
			that.handleMessage(updater + ' updated ' + id + '.');
			var issue = that.findIssue(id);
			_.each(props, function (value, key) {
				if (ko.isObservable(issue[key])) {
					issue[key](value);
				} else {
					issue[key] = value;
				}
			});
		});
	};
	
	OIT.Tracker.prototype.findIssue = function (id) {
		return _.find(this.issues(), function (issue) {
			return issue.id === id;
		});
	};

	OIT.Tracker.prototype.logout = function () {
		delete window.localStorage[USERNAME_KEY];
		this.user(undefined);
		this.$nameInput.focus();
		this.socket.emit('logout');
	};
	
	OIT.Tracker.prototype.login = function () {
		var that = this;
		this.loggedIn(false);
		this.socket.emit('login user', this.user(), function (alreadyTaken) {
			if (alreadyTaken) {
				that.user(that.user() + Math.round(Math.random() * -1e9));
				that.login();
			} else {
				window.localStorage[USERNAME_KEY] = that.user();
			}
			that.loggedIn(!alreadyTaken);
		});
	};
	
	function isCommand(input) {
		return _.include([':', '/'], input.charAt(0));
	}
	
	function getArgument(string, argToReturn) {
		var match = string.match(/([\d+])(?:\s+(.+))?/);
		return match ? match[argToReturn] : null;
	}
	
	function notifyOfBadCommand() {
		window.alert(getRandomItem(BAD_COMMAND_RESPONSES) + ' Try /help.'); // TODO: style
	}

	OIT.Tracker.prototype.handleInput = function () {
		if (!this.user()) {
			this.handleNameInput();
			return;
		}

		if (!this.loggedIn()) {
			return;
		}
		var input = this.$messageInput.val();
		this.$messageInput.val('');
		
		if (!input || input.length < 1) {
			return;
		}
		
		if (isCommand(input)) {
			var matches = input.match(/[:\/]([\S]+)(?:\s+(.*))?/); 
			var cmd = matches[1];
			var rest = matches[2];
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
					this.createIssue(rest);
					break;
				case 'close':
				case 'resolve':
					this.closeIssue(parseInt(rest, 10));
					break;
				case 'reopen':
					this.updateIssue(parseInt(rest, 10), { closed: false });
					break;
				case 'unassign':
					this.assignIssue(parseInt(rest, 10), 'nobody');
					break;
				case 'assign':
				case '@':
					var id = parseInt(getArgument(rest, 1), 10);
					var assignee = getArgument(rest, 2);
					this.assignIssue(id, assignee);
					break;
				case 'edit':
				case 'update':
					// only allow editing the description
					var id = parseInt(getArgument(rest, 1), 10);
					var desc = getArgument(rest, 2);
					this.updateIssue(id, { description: desc });
					break;
				case 'reset':
					this.reset();
					break;
				default:
					notifyOfBadCommand();
					break;
			}
		} else {
			this.send(input);
		}
	};

	OIT.Tracker.prototype.handleNameInput = function () {
		var name = this.$nameInput.val();
		if (!name || name.length < 1) { // TODO: disallow other chars?
			return;
		}

		this.user(name);
		this.$nameInput.val('');
		this.login();
	};
	
	OIT.Tracker.prototype.createIssue = function (desc) {
		socket.emit('new issue', desc);
	};
	
	OIT.Tracker.prototype.assignIssue = function (id, assignee) {
		socket.emit('assign issue', id, assignee);
	};
	
	OIT.Tracker.prototype.closeIssue = function (id) {
		if (this.findIssue(id).closed()) {
			return;
		}
		socket.emit('close issue', id);
	};
	
	OIT.Tracker.prototype.updateIssue = function (id, props) {
		socket.emit('update issue', id, props);
	};
	
	OIT.Tracker.prototype.reset = function () {
		if (window.confirm('Warning: this will completely delete all issues from the server.')) {
			if (window.confirm('I have a bad feeling about this. Are you absolutely sure?')) {
				socket.emit('reset issues');
			}
		}
	};
	
	OIT.Tracker.prototype.send = function (message) {
		socket.emit('user message', message);
	};
	
	function scrollToBottom(el) {
		el.scrollTop = el.scrollHeight;
	}

	OIT.Tracker.prototype.handleMessage = function (msg, user) {
		this.messages.push({user: user, msg: msg});
		scrollToBottom(this.$messagesList.get(0));
	};
	
}(OmegaIssueTracker));