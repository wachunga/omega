define(['ko', 'underscore'], function (ko, _) {
	var URL_REGEX = /(\(?\bhttps?:\/\/[-A-Z0-9+&@#\/%?=~_()|!:,.;]*[-A-Z0-9+&@#\/%=~_()|])/ig;
	var ID_REGEX = /\$id\$(\d+)/g;

	function addHtmlLinks(text) {
		text = _.escape(ko.utils.unwrapObservable(text));
		return insertLinks(text);
	}

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

	function addHtml(text) {
		text = addHtmlLinks(text);
		return text.replace(ID_REGEX, '<a class="id" data-id="$1" href="#$1">$1</a>');
	}

	ko.bindingHandlers.fadeVisible = {
		init: function(element, valueAccessor) {
			var value = valueAccessor();
			$(element).toggle(ko.utils.unwrapObservable(value));
		},
		update: function(element, valueAccessor) {
			var value = valueAccessor();
			if (ko.utils.unwrapObservable(value)) {
				$(element).fadeIn('fast');
			} else {
				$(element).fadeOut('fast');
			}
		}
	};

	function getRandomItem(array) {
		return array[Math.floor(Math.random() * array.length)];
	}

	return {
		addHtml: addHtml,
		addHtmlLinks: addHtmlLinks,
		getRandomItem: getRandomItem
	};
});