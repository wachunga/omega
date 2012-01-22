/* global ko, _ */

define(['underscore'], function (_) {
	
	function Issue(id, props) {
		this.id = id; // id should never change
		_.each(props, function (value, key) {
			if (key !== 'id') {
				this[key] = ko.observable(value);
			}
		}, this);
	}

	Issue.sort = function (a, b) {
		if (a.critical()) {
			if (b.critical()) {
				return a.id - b.id;
			}
			return -1;
		}
		if (b.critical()) {
			return 1;
		}
		return a.id - b.id;
	};
	
	return Issue;
	
});
