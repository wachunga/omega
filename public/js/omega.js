/* global $, ko, socket, _, window, alert */
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
	
	var flavour = [
		"You, sir, are a genius.", "Die issues, die!", "*golf clap*",
		"Ω &hearts; you.", "You deserve a break.",
		"Not bad, not bad at all.", "FTW!"
	];
	function addFlavour(text) {
		var rand = Math.floor(Math.random() * flavour.length);
		return text + " " + flavour[rand];
	}
	
	OIT.Tracker = function ($messagesList, $inputBox, $form, socket) {
		var that = this;

		this.$messagesList = $messagesList;
		this.$inputBox = $inputBox;
		this.socket = socket;
		this.connected = ko.observable(false);
		
		this.user = ko.observable(window.location.hash.substring(1) || "anonymous");
		this.hideClosed = ko.observable(false);
		this.helpOpen = ko.observable(false);
		this.messages = ko.observableArray();
		this.issues = ko.observableArray();
		
		ko.applyBindings(this);
		
		$form.submit(function (e) {
			e.preventDefault();
			that.handleInput();
		});
		
		this.socket.on('connect', function () {
			that.login();
		});
		
		this.socket.on('issues', function (issues) {
			that.issues(_.map(issues, function (issue) {
				return new OIT.Issue(issue.id, issue);
			}));
		});
		
		this.socket.on('user message', function (user, msg) {
			that.handleMessage(msg, user);
		});
		
		this.socket.on('announcement', function (msg) {
			that.handleMessage(msg);
		});	
		
		this.socket.on('issue created', function (issue) {
			that.handleMessage(issue.creator + " created " + issue.id + ".");
			that.issues.push(new OIT.Issue(issue.id, issue));
		});	
		
		this.socket.on('issue closed', function (closer, id) {
			that.handleMessage(addFlavour(closer + " closed " + id + "."));
			var issue = that.findIssue(id);
			issue.closed(true);
		});	
		
		this.socket.on('issue assigned', function (assigner, id, assignee) {
			that.handleMessage(assigner + " assigned " + id + " to " + assignee + ".");
			var issue = that.findIssue(id);
			issue.assignee(assignee);
		});
		
		this.socket.on('issue updated', function (updater, id, props) {
			that.handleMessage(updater + " updated " + id + ".");
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
	
	var badNotifications = [
		"Oops.", "You fail the Turing test.",
		"The least you could do is be grammatical.",
		"Ω does not like your tone."
	];
	function notifyOfBadCommand() {
		var rand = Math.floor(Math.random() * badNotifications.length);
		alert(badNotifications[rand] + " Try /help."); // TODO: style
	}

	OIT.Tracker.prototype.login = function () {
		var that = this;
		this.connected(false);
		this.socket.emit('nickname', this.user(), function (alreadyTaken) {
			if (alreadyTaken) {
				that.user(that.user() + Math.round(Math.random() * -1e9));
				that.login();
			}
			that.connected(!alreadyTaken);
		});
	};
	
	function isCommand(input) {
		return _.include([":", "/"], input.charAt(0));
	}
	
	function getArgument(string, argToReturn) {
		var match = string.match(/([\d+])(?:\s+(.+))?/);
		return match ? match[argToReturn] : null;
	}
	
	OIT.Tracker.prototype.handleInput = function () {
		if (!this.connected()) {
			return;
		}
		var input = this.$inputBox.val();
		this.$inputBox.val("");
		
		if (!input || input.length < 1) {
			return;
		}
		
		if (isCommand(input)) {
			var matches = input.match(/[:\/]([\S]+)(?:\s+(.*))?/); 
			var cmd = matches[1];
			var rest = matches[2];
			switch (cmd.toLowerCase()) {
				case "help":
				case "?":
					this.helpOpen(!this.helpOpen());
					break;
				case "add":
				case "create":
				case "nouveau":
				case "new":
				case "open":
					this.createIssue(rest);
					break;
				case "close":
				case "resolve":
				case "resolved":
					this.closeIssue(parseInt(rest, 10));
					break;
				case "unassign":
					this.assignIssue(parseInt(rest, 10), "nobody");
					break;
				case "assign":
				case "@":
					var id = parseInt(getArgument(rest, 1), 10);
					var assignee = getArgument(rest, 2);
					this.assignIssue(id, assignee);
					break;
				case "edit":
					// only allow editing the description
					var id = parseInt(getArgument(rest, 1), 10);
					var desc = getArgument(rest, 2);
					this.updateIssue(id, { description: desc });
					break;
				default:
					notifyOfBadCommand();
					break;
			}
		} else {
			this.send(input);
		}
	};
	
	OIT.Tracker.prototype.createIssue = function (desc) {
		socket.emit("new issue", desc);
	};
	
	OIT.Tracker.prototype.assignIssue = function (id, assignee) {
		socket.emit("assign issue", id, assignee);
	};
	
	OIT.Tracker.prototype.closeIssue = function (id) {
		if (this.findIssue(id).closed()) {
			return;
		}
		socket.emit("close issue", id);
	};
	
	OIT.Tracker.prototype.updateIssue = function (id, props) {
		socket.emit("update issue", id, props);
	};
	
	OIT.Tracker.prototype.send = function (message) {
		socket.emit("user message", message);
	};
	
	function scrollToBottom(el) {
		el.scrollTop = el.scrollHeight;
	}
	
	OIT.Tracker.prototype.handleMessage = function (msg, user) {
		this.messages.push({user: user, msg: msg});
		scrollToBottom(this.$messagesList.get(0));
	};
	
}(OmegaIssueTracker));