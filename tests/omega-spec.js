describe("omega", function () {

	var socket = {
		on: function () {},
		emit: function () {}
	};
	var messages = {};
	var name = {};
	var message = {};
	var form = {
		submit: function () {}
	};
	
	var tracker;
	
	beforeEach(function () {
		tracker = new OmegaIssueTracker.Tracker(messages, name, message, form, socket);
		tracker.user("norris");
		tracker.loggedIn(true);
	});

	describe("handles login", function () {
		it("accepts valid names", function () {
			name.val = function () { return "norris"; };
			tracker.user(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalled();
			expect(socket.emit.mostRecentCall.args[0]).toBe('login user');
			expect(socket.emit.mostRecentCall.args[1]).toBe('norris');
		});
		it("rejects empty name", function () {
			name.val = function () { return ""; };
			tracker.user(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).wasNotCalled();
			expect(tracker.invalidName()).toBe(true);
		});
		it("rejects short names", function () {
			name.val = function () { return "yo"; };
			tracker.user(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).wasNotCalled();
			expect(tracker.invalidName()).toBe(true);
		});
		it("rejects reserved names", function () {
			name.val = function () { return "nobody"; };
			tracker.user(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalled();
			var callback = socket.emit.mostRecentCall.args[2];
			expect(tracker.invalidName()).toBe(false);
			callback(true); // server says invalid
			expect(tracker.invalidName()).toBe(true);
		});
	});
	
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

	describe("parses commands", function () {

		it("can view help", function () {
			message.val = function () { return "/help"; };

			tracker.handleInput();
			expect(tracker.helpOpen()).toEqual(true);
		});

		it("can chat", function () {
			message.val = function () { return "hello peeps"; };

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalledWith('user message', 'hello peeps');
		});

		it("can reset", function () {
			message.val = function () { return "/reset"; };

			spyOn(tracker, 'reset');
			tracker.handleInput();
			expect(tracker.reset).toHaveBeenCalled();
		});

		it("can create issues", function () {
			message.val = function () { return "/create new issue"; };

			spyOn(tracker, 'createIssue');
			tracker.handleInput();
			expect(tracker.createIssue).toHaveBeenCalledWith("new issue");
		});

		it("mixed case and unicode works", function () {
			message.val = function () { return "/CREATE Ω=aw3som#"; };

			spyOn(tracker, 'createIssue');
			tracker.handleInput();
			expect(tracker.createIssue).toHaveBeenCalledWith("Ω=aw3som#");
		});

		it ("can prioritize issues", function () {
			message.val = function () { return ":star 5"; };

			spyOn(tracker, 'prioritizeIssue');
			tracker.handleInput();
			expect(tracker.prioritizeIssue).toHaveBeenCalledWith(5);
		});
		
		it("can assign multi-digit issues", function () {
			message.val = function () { return ":assign 50"; };
		
			spyOn(tracker, 'assignIssue');
			tracker.handleInput();
			expect(tracker.assignIssue).toHaveBeenCalledWith(50, undefined);
		});
		
		describe("handles invalid input", function () {

			it("bad command", function () {
				message.val = function () { return "/fluffernutter"; };

				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});

			it("create no args", function () {
				message.val = function () { return ":create"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("create whitespace only", function () {
				message.val = function () { return ":create  "; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("assign no args", function () {
				message.val = function () { return ":assign"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("assign bad id", function () {
				message.val = function () { return ":assign this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("critical no args", function () {
				message.val = function () { return ":critical"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("critical bad id", function () {
				message.val = function () { return ":critical this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("edit no args", function () {
				message.val = function () { return ":edit"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("edit bad id", function () {
				message.val = function () { return ":edit not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("close no args", function () {
				message.val = function () { return ":close"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("close bad id", function () {
				message.val = function () { return ":close this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("reopen no args", function () {
				message.val = function () { return ":reopen"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("reopen bad id", function () {
				message.val = function () { return ":reopen this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
		});
	});
	
});
