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
		],
		BadCommand: [
			'Oops.', 'This is not a Turing test.',
			'The least you could do is be grammatical.',
			'That does not compute.',
			'I can haz parser.',
			'These are not the droids you\'re looking for.'
		]
	};

	var exports = {};

	exports.message = function (message, event) {
		var flavourOptions = flavour[event.type];
		if (flavourOptions) {
			var pseudoRandom = new Date(event.timestamp).valueOf() % 100; // last 2 digits of epoch
			var index = Math.floor(pseudoRandom / 100 * flavourOptions.length);
			return message + ' ' + flavourOptions[index];
		}
		return message;
	};

	exports.badCommand = function () {
		return util.getRandomItem(flavour.BadCommand);
	};

	return exports;

});
