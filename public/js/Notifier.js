define(['ko', 'underscore'], function (ko, _) {

	var NOTIFICATION_ALLOWED = 0; // unintuitive, but correct
	var NOTIFICATION_DURATION = 4000;

	function Notifier(users) {
		this.webNotifyEnabled = ko.observable(checkWebNotificationEnabled());
		this.currentUser = users.current;

		this.statusMessage = ko.computed(function () {
			return this.webNotifyEnabled() ? 'Web notifications are enabled' : 'Web notifications are disabled';
		}, this);

		this.requestNotificationPermission = _.bind(requestNotificationPermission, this);
	}

	Notifier.prototype.notify = function (user, event) {
		if (!window.webkitNotifications || !this.webNotifyEnabled() || user === this.currentUser() || !event.notification) {
			return;
		}

		var popup = window.webkitNotifications.createNotification("favicon.ico", event.notification.title, event.notification.body);
		popup.show();
		setInterval(function () { popup.cancel(); }, NOTIFICATION_DURATION);
	};

	function requestNotificationPermission() {
		if (!window.webkitNotifications) {
			alert('Your browser doesn\'t support web notifications. Try Chrome or something.');
			return;
		}
		if (this.webNotifyEnabled()) {
			this.webNotifyEnabled(false); // TODO: save this setting
			return;
		}

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
		return window.webkitNotifications && window.webkitNotifications.checkPermission() === NOTIFICATION_ALLOWED;
	}

	return Notifier;

});