define(['underscore'], function (_) {
	var URL_REGEX = /(\(?\bhttps?:\/\/[-A-Z0-9+&@#\/%?=~_()|!:,.;]*[-A-Z0-9+&@#\/%=~_()|])/ig;
	var ID_REGEX = /\$id\$(\d+)/g;

	var exports = {};

	function unwrap(value) {
		return _.isFunction(value) ? value() : value;
	}

	var addHtmlLinks = exports.addHtmlLinks = function (text) {
		text = _.escape(unwrap(text));
		return insertLinks(text);
	};

	function insertLinks(text) {
		return text.replace(URL_REGEX, function (url) {
			var parens = false;
			if (url.charAt(0) === '(' && url.charAt(url.length - 1) === ')') {
				url = url.substring(1, url.length - 1);
				parens = true;
			}
			var htmlLink = ['<a href="', url, '">', url, '</a>'];
			if (parens) {
				htmlLink.unshift('(');
				htmlLink.push(')');
			}
			return htmlLink.join('');
		});
	}

	exports.addHtml = function (text) {
		text = addHtmlLinks(text);
		return text.replace(ID_REGEX, '<a class="id" data-id="$1" href="#$1">$1</a>');
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