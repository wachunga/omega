/* global ko, _ */

define(['underscore'], function (_) {
	
	var Issue = function (id, props) {
		this.id = id; // id should never change
		_.each(props, function (value, key) {
			if (key !== 'id') {
				this[key] = ko.observable(value);
			}
		}, this);
	};
	
	return Issue;
	
});
