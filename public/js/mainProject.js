require.config({
	paths: {
		'jquery': 'lib/jquery-1.7.1.min',
		'ko': 'lib/knockout-2.0.0.min',
		'underscore': 'lib/underscore-1.2.2.min',
		'timeago': 'lib/jquery.timeago',
		'tooltips': 'lib/tooltips'
	}
});


require(['jquery', 'ko', 'ProjectView'], function ($, ko, ProjectView) {

	var project = location.pathname.match(/project\/([^\/]+)/)[1];
	var socket = io.connect('/' + project); // would love to push this into module, but causes odd race condition in some browsers

	$(function () {
		$(window).on('scroll', processScroll);
		processScroll();

		$('.alert-closable').click(hideFlashMessages);
		// TODO: alert-fading needs to work after dom load too
		$('.alert-fading').delay(500).fadeIn().delay(6000).fadeOut();

		var projectView = new ProjectView($("#nameInput"), $("#messageInput"), $("#messages"), socket);
	});

	function hideFlashMessages() {
		$(this).fadeOut();
	}

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

