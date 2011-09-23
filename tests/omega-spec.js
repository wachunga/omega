var sock = {
	on: function () {},
	emit: function () {}
};
var messages = {};
var name = {};
var message = {};
var form = {
	submit: function () {}
};

var tracker = new OmegaIssueTracker.Tracker(messages, name, message, form, sock);
tracker.user("elbow");
tracker.loggedIn(true);

describe("omega", function () {

	describe("displays html links", function () {
		it("for basic urls", function () {
			var text = "http://www.foo.com";
			expect(addHtmlLinks(text)).toEqual('<a href="http://www.foo.com">http://www.foo.com</a>');
		});
		it("for urls in parens", function () {
			var text = "at foo (http://www.foo.com) I'm telling you";
			expect(addHtmlLinks(text)).toEqual('at foo (<a href="http://www.foo.com">http://www.foo.com</a>) I\'m telling you');
		});
		it("for urls with a query string etc.", function () {
			var text = "at http://foo.com?id=bar#asdf";
			expect(addHtmlLinks(text)).toEqual('at <a href="http://foo.com?id=bar#asdf">http://foo.com?id=bar#asdf</a>');
		});
		it("for https", function () {
			var text = "at https://foo.com/?id=bar#asdf";
			expect(addHtmlLinks(text)).toEqual('at <a href="https://foo.com/?id=bar#asdf">https://foo.com/?id=bar#asdf</a>');
		});
		it("for urls followed by a question mark", function () {
			var text = "did you find it with http://www.foo.ca?";
			expect(addHtmlLinks(text)).toEqual('did you find it with <a href="http://www.foo.ca">http://www.foo.ca</a>?');
		});
		it("for urls followed by a comma", function () {
			var text = "at http://foo.com?id=bar#asdf, really?";
			expect(addHtmlLinks(text)).toEqual('at <a href="http://foo.com?id=bar#asdf">http://foo.com?id=bar#asdf</a>, really?');
		});
		it("but must be preceded by http", function () {
			var text = "at foo.com, really?";
			expect(addHtmlLinks(text)).toEqual('at foo.com, really?');
		});
	});

	describe("prioritizes issues", function () {
		it ("can prioritize", function () {
			message.val = function () { return ":star 5"; };

			spyOn(tracker, 'prioritizeIssue');
			tracker.handleInput();
			expect(tracker.prioritizeIssue).toHaveBeenCalledWith(5);
		});
	});

	describe("parses arguments", function () {
		it("can assign multi-digit issues", function () {
			message.val = function () { return ":assign 50"; };
		
			spyOn(tracker, 'assignIssue');
			tracker.handleInput();
			expect(tracker.assignIssue).toHaveBeenCalledWith(50, undefined);
		});
	});
});
