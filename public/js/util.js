function isLocalStorageSupported() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}

ko.bindingHandlers.fadeVisible = {
	init: function(element, valueAccessor) {
		var value = valueAccessor();
		$(element).toggle(ko.utils.unwrapObservable(value));
	},
	update: function(element, valueAccessor) {
		var value = valueAccessor();
		ko.utils.unwrapObservable(value) ? $(element).fadeIn('fast') : $(element).fadeOut('fast');
	}
};

var URL_REGEX = /(\(?\bhttps?:\/\/[-A-Z0-9+&@#\/%?=~_()|!:,.;]*[-A-Z0-9+&@#\/%=~_()|])/ig;
function addHtmlLinks(text) {
	text = ko.utils.unwrapObservable(text);
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

function escapeHtml(text) {
	text = ko.utils.unwrapObservable(text);
	return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
