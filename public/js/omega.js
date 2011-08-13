/* global $, ko, socket */
var OmegaIssueTracker = {};
(function (OIT) {
	function mapRange (num, istart, istop, ostart, ostop) {
		return ostart + Math.round((ostop - ostart) * ((num - istart) / (istop - istart)));
	}
	
	function colorForName(name) {
		var hexes = _.map(name.split(''), function (c) {
			var mapped = Math.abs(mapRange(c.charCodeAt(0), 33, 128, 0, 255));
			return mapped.toString(16).substr(0,2);
		});
		while (hexes.length < 3) {
			hexes.push("00");
		}
		return '#' + hexes.slice(0,3).join('');
	}
	
	OIT.Issue = function (id, props) {
		this.id = id; // id should never change
		_.each(props, function (value, key) {
			if (key !== 'id') {
				this[key] = ko.observable(value);
			};
		}, this);
	};
	
	OIT.Tracker = function ($inputBox, $form, socket) {
		var that = this;

		this.$inputBox = $inputBox;
		$inputBox.focus();
		
		this.socket = socket;
		this.connected = ko.observable(false);
		
		this.user = ko.observable(window.location.hash.substring(1) || "anonymous");
		this.hideClosed = ko.observable(false);
		this.messages = ko.observableArray();
		this.issues = ko.observableArray();
		
		ko.applyBindings(this);
		
		$form.submit(function(e) {
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
			//console.log("um", user, msg);
			that.handleMessage(user, msg);
		});
		
		this.socket.on('announcement', function (msg) {
			//console.log("ann", msg);
			that.handleMessage("Ω", msg);
		});	
		
		this.socket.on('issue created', function (issue) {
			that.handleMessage("Ω", issue.creator + " created " + issue.id + ".");
			that.issues.push(new OIT.Issue(issue.id, issue));
		});	
		
		this.socket.on('issue closed', function (closer, id) {
			that.handleMessage("Ω", closer + " closed " + id + ".");
			var issue = _.find(that.issues(), function (issue) {
				return issue.id === id;
			});
			issue.closed(true);
		});	
		
		this.socket.on('issue assigned', function (assigner, id, assignee) {
			that.handleMessage("Ω", assigner + " assigned " + id + " to " + assignee + ".");
			var issue = _.find(that.issues(), function (issue) {
				return issue.id === id;
			});
			issue.assignee(assignee);
		});
		
		this.socket.on('issue updated', function (updater, id, props) {
			that.handleMessage("Ω", updater + " updated " + id + ".");
			var issue = _.find(that.issues(), function (issue) {
				return issue.id === id;
			});
			_.each(props, function (value, key) {
				if (ko.isObservable(issue[key])) {
					issue[key](value);
				} else {
					issue[key] = value;
				}
			});
		});
		
	};
	
	var badNotifications = [
		"Try again, Sherlock.",
		"You fail the Turing test.",
		"The least you could do is be grammatical.",
		"Ω does not like your tone."
	];
	function notifyOfBadCommand() {
		var rand = Math.floor(Math.random() * (badNotifications.length));
		alert(badNotifications[rand]); // TODO: style
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
	
	OIT.Tracker.prototype.handleInput = function () {
		if (!this.connected()) {
			return;
		}
		var input = this.$inputBox.val();
		this.$inputBox.val("");
		// check for invalid commands etc
		if (!input || input.length < 1) {
			return;
		}
			
		// check for command
		if (input.charAt(0) === ":") {
			var cmd = input.substring(1).split(" ")[0];
			var rest = input.substring(2 + cmd.length);
			switch (cmd) {
				case "create":
				case "nouveau":
				case "new":
				case "open":
					this.createIssue(rest);
					break;
				case "close":
				case "resolve":
				case "resolved":
					this.closeIssue(parseInt(rest));
					break;
				case "unassign":
					this.assignIssue(parseInt(rest), "nobody");
					break;
				case "assign":
				case "@":
					var id = rest.split(" ")[0];
					var assignee = rest.substring(1 + id.length);
					this.assignIssue(parseInt(id), assignee);
					break;
				case "edit":
					// only allow editing the description
					var id = rest.split(" ")[0];
					var desc = rest.substring(1 + id.length);
					this.updateIssue(parseInt(id), { description: desc });
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
		socket.emit("close issue", id);
	};
	
	OIT.Tracker.prototype.updateIssue = function (id, props) {
		socket.emit("update issue", id, props);
	};
	
	OIT.Tracker.prototype.send = function (message) {
		var msg = { command: message };
		console.log("sending", msg);
		socket.emit("user message", message);
	};
	
	function scrollToBottom(el) {
		el.scrollTop = el.scrollHeight;
	}
	
	OIT.Tracker.prototype.handleMessage = function (user, msg) {
		//console.log("socket message received", user, msg);
		this.messages.push({user: user, msg: msg});
		// FIXME: constant element id
		scrollToBottom(document.getElementById('messages'));
	};
	
}(OmegaIssueTracker));