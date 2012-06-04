define(function () {

	function NoSuchIssueError(id) {
		this.name = 'NoSuchIssueError';
		this.id = id;;
	}

	NoSuchIssueError.prototype.toString = function () {
		return 'Issue ' + this.id + '? Never heard of it.';
	};

	return NoSuchIssueError;

});