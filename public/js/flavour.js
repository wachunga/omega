define(['util'], function (util) {

	var flavour = {
		CloseIssue: [
			'You, sir, are a genius.', 'Die issues, die!', '*golf clap*',
			'Ω ♥ you.', 'You deserve a break.',
			'Not bad, not bad at all.', 'FTW!',
			'You win a bike!<br>' +
				'<pre>' +
				'     __o   \n' +
				'   _ \\<,_ \n' +
				'  (_)/ (_)' +
				'</pre>',
		]
	};

	function apply(message, event) {
		var flavourOptions = flavour[event.type];
		if (flavourOptions) {
			var pseudoRandom = new Date(event.timestamp).valueOf() % 100; // last 2 digits of epoch
			var index = Math.floor(pseudoRandom / 100 * flavourOptions.length);
			return message + ' ' + flavourOptions[index];
		}
		return message;
	}

	return apply;

});
