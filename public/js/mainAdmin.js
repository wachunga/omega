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
		var viewModel = {
			projects: data
		};

		ko.applyBindings(viewModel);
	});

});

