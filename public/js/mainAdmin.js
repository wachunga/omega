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
			projects: data
		};

		ko.applyBindings(viewModel);
	});

});

