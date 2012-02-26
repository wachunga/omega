require.config({
	paths: {
		'jquery': 'lib/jquery-1.7.1.min',
		'ko': 'lib/knockout-2.0.0.min',
		'underscore': 'lib/underscore-1.2.2.min',
		'timeago': 'lib/jquery.timeago'
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

