require.config({
	paths: {
		'jquery': 'lib/jquery-1.7.1.min',
		'ko': 'lib/knockout-2.0.0.min',
		'underscore': 'lib/underscore-min',
		'timeago': 'lib/jquery.timeago'
	},
	shim: {
		'underscore': {
			exports: '_'
		}
	}
});

require(['jquery', 'ko'], function ($, ko) {

	$(function () {

		var viewModel = {
			error: ko.observable(),
			submitForm: function (form) {
				var name = $('#projectNameInput').val().trim();
				if (!name || name.length < 3) {
					this.error('Why so terse? You can do better.');
					return false;
				}

				var that = this;
				$.post('/project', $(form).serialize(), function (result) {
					window.location = result.url;
				}).error(function (result) {
					result = JSON.parse(result.responseText);
					if (result.error === 'exists') {
						that.error('A project with that name already exists: <a href="' + result.url + '">' + name + '</a>');
					} else {
						that.error('Invalid project name.');
					}
				});
			}
		};

		ko.applyBindings(viewModel);
	});
	
});

