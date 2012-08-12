define(['underscore', 'flavour', 'omegaEvent'], function (_, flavour, OmegaEvent) {

	function Message(message, speaker, date) {
		this.message = message;
		this.speaker = speaker;
		this.date = date;
	}

	Message.fromEvent = function (event) {
		var messageTemplate = OmegaEvent.Type[event.type].message
		var text = flavour(_.template(messageTemplate, event.details), event);
		return new Message(text, event.details.speaker, event.timestamp);
	};

	return Message;

});