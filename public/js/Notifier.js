define(['ko', 'underscore', 'omegaEvent', 'util'], function (ko, _, OmegaEvent, util) {

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
		var type = OmegaEvent.Type[event.type];
		if (!window.Notification || !this.webNotifyEnabled() || getUserFromEvent(event) === this.currentUser() || !type.notifies()) {
			return;
		}

		var title = _.template(type.notificationTitle, event.details);
		var body = util.stripHtml(_.template(type.notificationBody, event.details));
		var popup = new Notification(title, {
			icon: "/favicon.ico",
			body: body,
		});
		setInterval(function () { popup.close(); }, NOTIFICATION_DURATION);
	};

	function getUserFromEvent(event) {
		switch (event.type) {
			case 'NewIssue':
				return event.details.issue.creator;
			case 'CloseIssue':
				return event.details.issue.closer;
			case 'UserMessage':
				return event.details.speaker;
			default:
				throw new Error('Could not determine user for event: ' + event);
		}
	}

	function requestNotificationPermission() {
		if (!window.Notification) {
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
		if (window.Notification.permission === "granted") {
			this.webNotifyEnabled(checkWebNotificationEnabled());
		} else {
			var that = this;
			window.Notification.requestPermission().then(function (permission) {
				that.webNotifyEnabled(permission === "granted");
			});
		}
	}

	function checkWebNotificationEnabled() {
		return window.Notification && window.Notification.permission === "granted" && !window.localStorage[NOTIFICATION_PREF_OFF];
	}

	return Notifier;

});