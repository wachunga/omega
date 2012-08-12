/* global ko, _ */

define(['underscore', 'ko'], function (_, ko) {
	
	function Issue(id, props) {
		this.id = id; // id should never change

		_.each(props, function (value, key) {
			if (key !== 'id') {
				this[key] = ko.observable(value);
			}
		}, this);

		this.filtered = ko.observable(false);
		this.assigneeLabel = ko.computed(function () {
			return this.assignee().toLowerCase() !== 'nobody' ? '(@' + this.assignee() + ')' : '';
		}, this);
	}

	Issue.prototype.updateFiltered = function (showClosed, requiredTags, forbiddenTags, filterValue) {
		if (!showClosed && this.closed()) {
			this.filtered(true);
			return;
		}

		var issueTags = this.tags();
		// if issue does not have tag that is required, filter
		var hasAllRequired = _.all(requiredTags, function (requiredTag) {
			return _.include(issueTags, requiredTag);
		});
		if (! hasAllRequired) {
			this.filtered(true);
			return;
		}

		// if issue has tag that has been excluded, filter
		var hasForbiddenTag = _.any(forbiddenTags, function (forbiddenTag) {
			return _.include(issueTags, forbiddenTag);
		});
		this.filtered(hasForbiddenTag);
		if (this.filtered()) {
			return;
		}

		var regex = new RegExp(filterValue, 'mi');
		if (!filterValue || regex.test(this.description() + issueTags.join(' '))) {
			this.filtered(false);
		} else {
			this.filtered(true); // no match, so hide
		}
	};

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
