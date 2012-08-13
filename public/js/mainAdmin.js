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


require(['jquery', 'ko', 'alerts'], function ($, ko, alerts) {

	$(function () {
		var viewModel = {
			projects: data,
			confirmReset: function () {
				if (window.confirm('Warning: this will permanently delete all issues for this project.')) {
					if (window.confirm('I have a bad feeling about this. Are you absolutely sure?')) {
						return true;
					}
				}
			}
		};
		alerts.init();

		ko.applyBindings(viewModel);
	});

});

