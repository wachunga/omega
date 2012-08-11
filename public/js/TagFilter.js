define(['underscore', 'ko'], function (_, ko) {

	var TagState = {
		off: -1,
		default: 0,
		on: 1
	};

	function TagFilter(label) {
		this.label = label;
		this.state = ko.observable(TagState.default);
	}

	TagFilter.prototype.isActive = function () {
		return this.state() !== TagState.default;
	};

	TagFilter.prototype.toggle = function () {
		var next = this.state() === TagState.on ? TagState.off : this.state()+1;
		this.state(next);
	}

	TagFilter.getOff = function (tagFilters) {
		return withState(tagFilters, TagState.off);
	};

	TagFilter.getOn = function (tagFilters) {
		return withState(tagFilters, TagState.on);
	};

	TagFilter.resetAll = function (tagFilters) {
		_.each(tagFilters, function (tagFilter) {
			tagFilter.state(TagState.default);
		});
	};

	function withState(tagFilters, state) {
		return _.compact(_.map(tagFilters, function (tagFilter) {
			if (tagFilter.state() === state) {
				return tagFilter.label;
			}
		}));
	}

	return TagFilter;

});