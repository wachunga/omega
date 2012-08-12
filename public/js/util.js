define(['underscore'], function (_) {
	var ID_REGEX = /\$id\$(\d+)/g;

	var exports = {};

	function unwrap(value) {
		return _.isFunction(value) ? value() : value;
	}

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