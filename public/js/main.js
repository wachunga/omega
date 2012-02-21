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
			error: ko.observable(),
			submitForm: function (form) {
				var name = $('#projectNameInput').val().trim();
				if (!name || name.length < 3) {
					this.error('You can do better.');
					return false;
				}

				var that = this;
				$.post('/project', $(form).serialize(), function (result) {
					window.location = result.url;
				}).error(function (result) {
					result = JSON.parse(result.responseText);
					if (result.error === 'exists') {
						that.error('A <a href="' + result.url + '">project with that name</a> already exists.');
					} else {
						that.error('Invalid project name.');
					}
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

