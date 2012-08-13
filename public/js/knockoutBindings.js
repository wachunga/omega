define(['ko'], function (ko) {

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

});