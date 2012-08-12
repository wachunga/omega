define(['underscore'], function (_) {
	var ID_REGEX = /\$id\$(\d+)/g;

	var exports = {};

	function unwrap(value) {
		return _.isFunction(value) ? value() : value;
	}

	exports.addHtml = function (text) {
		return text.replace(ID_REGEX, '<a class="id" data-id="$1" href="#$1">Ω$1</a>'); // TODO: just specify in template
	};

	exports.getRandomItem = function (array) {
		return array[Math.floor(Math.random() * array.length)];
	};

	exports.isLocalStorageSupported = function () {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	};

	return exports;
});