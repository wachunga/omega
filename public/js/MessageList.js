define(['ko', 'underscore', 'SocketManager'], function (ko, _, socket) {

	function MessageList($element) {
		this.$element = $element;
		this.messages = ko.observableArray();

		socket.on('history', _.bind(this.processHistory, this));
	}

	MessageList.prototype.processHistory = function (events) {
		this.reset(); // TODO: should properly find where left off

		_.each(events, function (event) {
			this.append(event);
		}, this);
	};

	MessageList.prototype.reset = function (event) {
		if (this.messages().length) {
			this.messages([]);
		}
	};

	MessageList.prototype.append = function (event) {
		this.messages.push({ msg: event.message, speaker: event.speaker });
		scrollToBottom(this.$element.get(0));
	};

	function scrollToBottom(el) {
		el.scrollTop = el.scrollHeight;
	}

	return MessageList;

});