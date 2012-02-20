require.config({
	paths: {
		'jquery': 'http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min',
		'ko': 'lib/knockout-2.0.0.min',
		'underscore': 'lib/underscore-1.2.2.min',
		'timeago': 'lib/jquery.timeago'
	}
});

require(['jquery', 'ko'], function ($, ko) {

	$(function () {
		if (!isLocalStorageSupported) {
			alert("Your browser is very out of date. To use Ω, please use a newer browser."); // TODO: graceful degradation
			return;
		}

		var viewModel = {
			projectName: ko.observable(),
			unlisted: ko.observable(false),
			error: ko.observable(''),
//			preview: ko.computed(function () {
//				return 'http://' + this.projectName()
//			}, this),
			submitForm: function (form) {
				$.post('/project', $(form).serialize(), function (result) {
					window.location = result.url;
				}).error(function (result) {
					viewModel.error(result.responseText);
				});
			}
		}
		ko.applyBindings(viewModel);
	});
	
	function isLocalStorageSupported() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	}

});

