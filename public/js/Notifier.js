define(['ko', 'underscore'], function (ko, _) {

	var NOTIFICATION_ALLOWED = 0; // unintuitive, but correct
	var NOTIFICATION_DURATION = 4000;
	var NOTIFICATION_PREF_OFF = "OmegaIssueTracker.notificationsOff";

	function Notifier(users, socket) {
		this.webNotifyEnabled = ko.observable(checkWebNotificationEnabled());
		this.currentUser = users.current;

		this.statusMessage = ko.computed(function () {
			return this.webNotifyEnabled() ? 'Web notifications are enabled' : 'Web notifications are disabled';
		}, this);

		this.statusMessage.subscribe(function () {
			$('.tooltipped').tooltip('hide');
		});

		this.requestNotificationPermission = _.bind(requestNotificationPermission, this);

		socket.on('issue created', _.bind(this.notify, this));
		socket.on('issue closed', _.bind(this.notify, this));
		socket.on('user message', _.bind(this.notify, this));
	}

	Notifier.prototype.notify = function (event) {
		if (!window.webkitNotifications || !this.webNotifyEnabled() || getUserFromEvent(event) === this.currentUser() || !event.notification) {
			return;
		}

		var popup = window.webkitNotifications.createNotification("/favicon.ico", event.notification.title, event.notification.body);
		popup.show();
		setInterval(function () { popup.cancel(); }, NOTIFICATION_DURATION);
	};

	function getUserFromEvent(event) {
		switch (event.type.name) {
			case 'newIssue':
				return event.issue.creator;
			case 'closeIssue':
				return event.issue.closer;
			case 'userMessage':
				return event.speaker;
			default:
				throw new Error('Could not determine user for event: ' + event);
		}
	}

	function requestNotificationPermission() {
		if (!window.webkitNotifications) {
			alert('Your browser doesn\'t support web notifications. Try Chrome or something.');
			return;
		}

		if (this.webNotifyEnabled()) {
			window.localStorage[NOTIFICATION_PREF_OFF] = true;
			this.webNotifyEnabled(false);
			return;
		}

		window.localStorage.removeItem(NOTIFICATION_PREF_OFF);

		// otherwise, ask user to grant permission
		if (window.webkitNotifications.checkPermission() === NOTIFICATION_ALLOWED) {
			this.webNotifyEnabled(checkWebNotificationEnabled());
		} else {
			var that = this;
			window.webkitNotifications.requestPermission(function () {
				that.webNotifyEnabled(checkWebNotificationEnabled());
			});
		}
	}

	function checkWebNotificationEnabled() {
		return !window.localStorage[NOTIFICATION_PREF_OFF] && window.webkitNotifications && window.webkitNotifications.checkPermission() === NOTIFICATION_ALLOWED;
	}

	return Notifier;

});