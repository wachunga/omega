var _ = require('underscore');
var oe = require('../public/js/omegaEvent');

var historyDao = (function () {

	var HISTORY_ITEMS_TO_SHOW = 10;
	var MAX_HISTORY_ITEMS = 100;

	var history = {};

	return {

		record: function (type, details, project) {
			history[project.slug] = history[project.slug] || [];
			var event = new oe.OmegaEvent(type, details);
			history[project.slug].push(event);

			if (history[project.slug].length > MAX_HISTORY_ITEMS) {
				history[project.slug] = _.last(history[project.slug], HISTORY_ITEMS_TO_SHOW);
			}
			return event;
		},

		load: function (project) {
			return _.last(history[project.slug] || [], HISTORY_ITEMS_TO_SHOW);
		},

		reset: function (project) {
			history[project.slug] = [];
		}

	}

})();

module.exports = historyDao;