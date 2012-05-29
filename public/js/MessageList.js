define(['ko', 'underscore', 'util', 'flavour'], function (ko, _, util, flavour) {

	function Message(message, speaker, date) {
		this.message = message;
		this.speaker = speaker;
		this.date = date;
	}

	function MessageList($element, socket) {
		this.$element = $element;
		this.messages = ko.observableArray();

		socket.on('history', _.bind(this.processHistory, this));
		socket.on('issue created', _.bind(this.append, this));
		socket.on('issue assigned', _.bind(this.append, this));
		socket.on('issue tagged', _.bind(this.append, this));
		socket.on('issue updated', _.bind(function (props, event) {
			this.append(event);
		}, this));
		socket.on('issue prioritized', _.bind(function (props, event) {
			this.append(event);
		}, this));
		socket.on('issue closed', _.bind(this.append, this));
		socket.on('user message', _.bind(this.append, this));
	}

	MessageList.prototype.processHistory = function (events) {
		this.reset(); // TODO: should properly find where left off

		if (!events.length) {
			this.showWelcome();
			return;
		}

		_.each(events, function (event) {
			this.append(event);
		}, this);
	};

	MessageList.prototype.showWelcome = function () {
		this.messages.push(
			new Message('Welcome to Ω, a real-time issue tracker optimized for small teams.'),
			new Message('This area shows recent activity and user messages so everyone on the team stays up-to-date.')
		);
	};

	MessageList.prototype.reset = function (event) {
		if (this.messages().length) {
			this.messages([]);
		}
	};

	MessageList.prototype.append = function (event) {
		var text = flavour(event.type.name, util.addHtmlLinks(event.message));
		this.messages.push(new Message(text, event.speaker, event.timestamp));
		scrollToBottom(this.$element.get(0));
	};

	function scrollToBottom(el) {
		el.scrollTop = el.scrollHeight;
	}

	return MessageList;

});