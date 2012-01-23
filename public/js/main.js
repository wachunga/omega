var tracker; // for debugging only

require.config({
	paths: {
		'jquery': 'http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min',
		'ko': 'lib/knockout-2.0.0.min',
		'underscore': 'lib/underscore-1.2.2.min',
		'timeago': 'lib/jquery.timeago'
	},
	priority: ['SocketManager']
});

require(['jquery', 'Tracker', 'MessageList', 'Notifier'], function ($, Tracker, MessageList, Notifier) {

	$(function () {
		if (!isLocalStorageSupported) {
			alert("Your browser is very out of date. To use Ω, please use a newer browser."); // TODO: graceful degradation
			return;
		}

		//var userManager = new UserManager(socket);
		var messageList = new MessageList($("#messages"));
		tracker = new Tracker($("#nameInput"), $("#messageInput"), $("#form"), messageList);
	});
	
	function isLocalStorageSupported() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	}

});

