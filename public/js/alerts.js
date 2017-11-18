define(['jquery'], function ($) {

	var exports = {};

	exports.init = function () {
		$('.alert-closable').click(hideFlashMessages);
		// TODO: alert-fading needs to work after dom load too
		$('.alert-fading').delay(500).fadeIn().delay(6000).fadeOut();
	};

	function hideFlashMessages() {
		$(this).stop(true, true).fadeOut();
	}

	return exports;

});
