define(['ko'], function (ko) {
	var URL_REGEX = /(\(?\bhttps?:\/\/[-A-Z0-9+&@#\/%?=~_()|!:,.;]*[-A-Z0-9+&@#\/%=~_()|])/ig;
	
	function escapeHtml(text) {
		return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
	}
	
	window.addHtmlLinks = function (text) {
		text = escapeHtml(ko.utils.unwrapObservable(text));
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
	};
	
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
});