require.config({
	paths: {
		'jquery': 'lib/jquery-1.7.1.min',
		'ko': 'lib/knockout-2.1.0.min',
		'underscore': 'lib/underscore-min',
		'timeago': 'lib/jquery.timeago',
		'tooltips': 'lib/tooltips'
	},
	shim: {
		'underscore': {
			exports: '_'
		}
	}
});


require(['jquery', 'knockoutBindings', 'ProjectView', 'alerts'], function ($, knockoutBindings, ProjectView, alerts) {

	var project = location.pathname.match(/project\/([^\/]+)/)[1];
	var socket = io.connect('/' + project); // would love to push this into module, but causes odd race condition in some browsers

	$(function () {
		alerts.init();

		$(window).on('scroll', processScroll);
		processScroll();

		var projectView = new ProjectView($("#nameInput"), $("#messageInput"), $("#messages"), socket);
	});

	var $fixable = $('#form');
	var topOffset = $fixable.offset().top;
	var isFixed = false;
	function processScroll() {
		var scrollTop = $(window).scrollTop();
		if (!isFixed && scrollTop >= topOffset) {
			isFixed = true;
			$fixable.addClass('fixed');
		} else if (isFixed && scrollTop <= topOffset) {
			isFixed = false;
			$fixable.removeClass('fixed');
		}
	}

});

