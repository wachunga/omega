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
		it("but must be preceeded by http", function () {
			var text = "at foo.com, really?";
			expect(addHtmlLinks(text)).toEqual('at foo.com, really?');
		});
	});

	describe("parses arguments", function () {

		it("can assign multi-digit issues", function () {
			var sock = {
					on: function () {},
					emit: function () {}
				},
				messages = {},
				name = {},
				message = {
					val: function () { return ":assign 50"; }
				},
				form = {
					submit: function () {}
				};

			var tracker = new OmegaIssueTracker.Tracker(messages, name, message, form, sock);
			tracker.user("elbow");
			tracker.loggedIn(true);
			
			spyOn(tracker, 'assignIssue');
			tracker.handleInput();
			expect(tracker.assignIssue).toHaveBeenCalledWith(50, undefined);
		});
	});
});
